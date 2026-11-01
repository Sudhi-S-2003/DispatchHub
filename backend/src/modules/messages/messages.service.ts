import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { WalletService } from '../wallet/wallet.service.js';
import { ShardingService } from '../sharding/sharding.service.js';
import { ContentGuardService } from '../campaigns/content-guard.service.js';
import { calculateEmailCost } from '../../common/constants/rates.constant.js';
import { interpolateTemplate, injectFooter } from '../../common/utils/template-parser.util.js';
import {
  fetchRemoteAttachment,
  PostalAttachmentPayload,
} from '../../common/utils/attachment-downloader.util.js';
import { ApprovalStatus, BrandType, BrandingMode } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name);

  constructor(
    private prisma: PrismaService,
    private walletService: WalletService,
    private shardingService: ShardingService,
    private contentGuard: ContentGuardService,
  ) {}

  // Flexible Production Sender Domain Resolution
  private async resolveDomain(accountId: string, domainId?: string, sender?: string) {
    if (domainId) {
      const domain = await this.prisma.domain.findFirst({
        where: { id: domainId },
      });
      if (!domain) {
        throw new BadRequestException('Specified sending domain does not exist.');
      }
      if (domain.status !== 'ACTIVE') {
        throw new BadRequestException(
          `Domain '${domain.domainName}' is not verified yet. Please verify SPF, DKIM, and MX DNS records under /domains before dispatching.`,
        );
      }
      return domain;
    }

    // If sender email specified (e.g. dispatch@mail1.postal.test.sudhi.online), match active domain
    if (sender && sender.includes('@')) {
      const senderDomain = sender.split('@')[1].toLowerCase().trim();
      const domainBySender = await this.prisma.domain.findFirst({
        where: { domainName: senderDomain, status: 'ACTIVE' },
      });
      if (domainBySender) {
        return domainBySender;
      }
    }

    // Default to the account's primary active & verified sending domain
    const activeDomain = await this.prisma.domain.findFirst({
      where: { accountId, status: 'ACTIVE' },
      orderBy: { createdAt: 'asc' },
    });

    if (activeDomain) {
      return activeDomain;
    }

    // Global active domain fallback (e.g., for SuperAdmin API requests)
    const systemActiveDomain = await this.prisma.domain.findFirst({
      where: { status: 'ACTIVE' },
      orderBy: { createdAt: 'asc' },
    });

    if (systemActiveDomain) {
      return systemActiveDomain;
    }

    throw new BadRequestException(
      'No verified sending domain configured. Please verify SPF, DKIM, and MX DNS records under /domains before dispatching emails.',
    );
  }

  // 1. Single 1-to-1 Instant Message Dispatch (High Priority Bypass)
  async sendSingleMessage(dto: any) {
    const accountId = dto.accountId;
    if (!accountId) throw new BadRequestException('accountId is required');

    const domain = await this.resolveDomain(accountId, dto.domainId, dto.sender);
    const recipient = (dto.recipient || dto.to || '').trim().toLowerCase();
    if (!recipient || !recipient.includes('@')) {
      throw new BadRequestException('A valid recipient email address is required');
    }

    const sender = dto.sender || `dispatch@${domain.domainName}`;
    const category = dto.category || 'TRANSACTIONAL';
    const brandingMode: BrandingMode =
      dto.brandingMode ||
      (dto.isCoBranded ? BrandingMode.CO_BRANDED : BrandingMode.WHITE_LABEL);

    // Pre-flight Wallet Debit ("Deduct First")
    const unitCost = calculateEmailCost(category, brandingMode);
    const referenceId = `MSG_${Date.now()}`;

    await this.walletService.debitPreflight(
      accountId,
      unitCost,
      'DEBIT_SEND',
      referenceId,
      `1-to-1 ${brandingMode} ${category} message to ${recipient}`,
    );

    // Template & Content Resolution
    let rawSubject = dto.subject || '';
    let rawHtml = dto.htmlContent || dto.htmlBody || '';
    let rawPlain = dto.plainContent || dto.textBody || '';
    let effectiveFooter = dto.footerHtml || dto.customFooterHtml || null;
    const parameters = dto.parameters || dto.variables || {};

    if (dto.templateId) {
      const template = await this.prisma.template.findUnique({
        where: { id: dto.templateId },
      });
      if (template) {
        rawSubject = rawSubject || template.subject;
        rawHtml = rawHtml || template.htmlContent;
        rawPlain = rawPlain || template.plainContent || '';
        effectiveFooter = effectiveFooter || template.footerHtml;
      }
    }

    const resolvedSubject = interpolateTemplate(rawSubject, parameters);
    const resolvedHtml = interpolateTemplate(rawHtml, parameters);
    const resolvedPlain = interpolateTemplate(rawPlain, parameters);

    let brandType: BrandType = BrandType.NONE;
    if (brandingMode === BrandingMode.CO_BRANDED) {
      brandType = BrandType.PLATFORM_BRAND;
    } else if (effectiveFooter) {
      brandType = BrandType.CUSTOMER_BRAND;
    }

    const finalHtml = injectFooter(resolvedHtml, brandingMode, effectiveFooter);

    // Download attachments safely
    const attachments = dto.attachments || dto.remoteAttachments || [];
    let postalAttachments: PostalAttachmentPayload[] = [];
    if (attachments.length > 0) {
      try {
        postalAttachments = await Promise.all(
          attachments.map((att: any) => fetchRemoteAttachment(att)),
        );
      } catch (attError: any) {
        await this.walletService.refund(
          accountId,
          unitCost,
          referenceId,
          `Attachment download failed: ${attError.message}`,
        );
        throw new BadRequestException(`Attachment error: ${attError.message}`);
      }
    }

    const assignedShard = this.shardingService.assignShard(domain.id);

    const message = await this.prisma.message.create({
      data: {
        accountId,
        domainId: domain.id,
        templateId: dto.templateId,
        category,
        brandingMode,
        brandType,
        footerHtml: effectiveFooter,
        recipient,
        sender,
        subject: resolvedSubject,
        htmlBody: finalHtml,
        plainBody: resolvedPlain || undefined,
        parameters: Object.keys(parameters).length > 0 ? parameters : undefined,
        attachments: attachments.length > 0 ? (attachments as any) : undefined,
        cost: new Decimal(unitCost),
        status: 'IN_FLIGHT',
        assignedShard,
        claimedAt: new Date(),
      },
    });

    // Extract optional Reply-To, CC, and BCC
    const replyTo = dto.replyTo || dto.reply_to || undefined;
    const cc = Array.isArray(dto.cc)
      ? dto.cc
      : typeof dto.cc === 'string'
        ? dto.cc.split(',').map((e: string) => e.trim()).filter(Boolean)
        : undefined;
    const bcc = Array.isArray(dto.bcc)
      ? dto.bcc
      : typeof dto.bcc === 'string'
        ? dto.bcc.split(',').map((e: string) => e.trim()).filter(Boolean)
        : undefined;

    // Dispatch to Postal MTA
    const sendResult = await this.shardingService.dispatchToPostal(
      sender,
      recipient,
      resolvedSubject,
      finalHtml,
      resolvedPlain || undefined,
      postalAttachments,
      { replyTo, cc, bcc },
    );

    if (sendResult.success) {
      return this.prisma.message.update({
        where: { id: message.id },
        data: {
          status: 'SENT',
          postalMessageId: sendResult.messageId,
          sentAt: new Date(),
        },
      });
    } else {
      await this.walletService.refund(
        accountId,
        unitCost,
        message.id,
        `Auto-refund for failed dispatch: ${sendResult.error || 'Postal MTA rejection'}`,
      );

      return this.prisma.message.update({
        where: { id: message.id },
        data: {
          status: 'FAILED',
          errorMessage: sendResult.error,
        },
      });
    }
  }

  // 2. Bulk Campaign Dispatch (Immediate or Scheduled)
  async dispatchCampaign(dto: any) {
    const accountId = dto.accountId;
    if (!accountId) throw new BadRequestException('accountId is required');

    const domain = await this.resolveDomain(accountId, dto.domainId, dto.sender);
    const rawRecipients: any[] = dto.recipients || [];

    const uniqueRecipients = rawRecipients
      .map((r) => {
        const email = (r.email || r.to || '').trim().toLowerCase();
        const parameters = r.parameters || r.variables || {};
        return { email, parameters };
      })
      .filter((r) => r.email.includes('@'));

    if (uniqueRecipients.length === 0) {
      throw new BadRequestException('At least one valid recipient is required.');
    }

    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
    });
    if (!account) throw new NotFoundException('Account not found');

    const category = dto.category || 'MARKETING';
    const brandingMode: BrandingMode =
      dto.brandingMode ||
      (dto.isCoBranded ? BrandingMode.CO_BRANDED : BrandingMode.WHITE_LABEL);

    const sender = dto.sender || `dispatch@${domain.domainName}`;
    const subject = dto.subject || 'Platform Announcement';
    const htmlContent = dto.htmlContent || dto.htmlBody || '<p>Notice</p>';

    const guardResult = this.contentGuard.analyzeCampaign(
      category,
      uniqueRecipients.length,
      subject,
      htmlContent,
      account.isTrusted,
    );

    const unitCost = calculateEmailCost(category, brandingMode);
    const totalCost = Number((unitCost * uniqueRecipients.length).toFixed(4));
    const campaignReference = `CAMPAIGN_${Date.now()}`;

    // Pre-flight Wallet Debit ("Deduct First")
    await this.walletService.debitPreflight(
      accountId,
      totalCost,
      'DEBIT_SEND',
      campaignReference,
      `${brandingMode} ${category} campaign '${dto.name}' (${uniqueRecipients.length} emails @ $${unitCost})`,
    );

    let brandType: BrandType = BrandType.NONE;
    if (brandingMode === BrandingMode.CO_BRANDED) {
      brandType = BrandType.PLATFORM_BRAND;
    } else if (dto.footerHtml || dto.customFooterHtml) {
      brandType = BrandType.CUSTOMER_BRAND;
    }

    const assignedShard = this.shardingService.assignShard(domain.id);
    const scheduledDate = dto.scheduledAt ? new Date(dto.scheduledAt) : null;
    const isImmediate = !scheduledDate || scheduledDate.getTime() <= Date.now();

    const campaign = await this.prisma.campaign.create({
      data: {
        accountId,
        domainId: domain.id,
        templateId: dto.templateId,
        name: dto.name || `Campaign-${Date.now()}`,
        category,
        brandingMode,
        brandType,
        footerHtml: dto.footerHtml || dto.customFooterHtml,
        subject,
        htmlContent,
        plainContent: dto.plainContent || dto.textBody,
        senderEmail: sender,
        attachments: dto.attachments ? (dto.attachments as any) : undefined,
        approvalStatus: guardResult.approvalStatus,
        status:
          guardResult.approvalStatus === ApprovalStatus.PENDING_ADMIN_APPROVAL
            ? 'PENDING_APPROVAL'
            : isImmediate
            ? 'PROCESSING'
            : 'SCHEDULED',
        scheduledAt: scheduledDate,
        totalRecipients: uniqueRecipients.length,
        costPerEmail: new Decimal(unitCost),
        totalCostDeducted: new Decimal(totalCost),
        assignedShard,
      },
    });

    // Prefetch attachments
    const attachments = dto.attachments || dto.remoteAttachments || [];
    let cachedAttachments: PostalAttachmentPayload[] = [];
    if (attachments.length > 0) {
      try {
        cachedAttachments = await Promise.all(
          attachments.map((att: any) => fetchRemoteAttachment(att, campaign.id)),
        );
      } catch (attErr: any) {
        this.logger.error(`Campaign attachment error: ${attErr.message}`);
      }
    }

    // Insert into unified Message table
    const messagesData = uniqueRecipients.map((r) => {
      const renderedSubj = interpolateTemplate(subject, r.parameters);
      const renderedHtml = injectFooter(
        interpolateTemplate(htmlContent, r.parameters),
        brandingMode,
        dto.footerHtml || dto.customFooterHtml,
      );
      const renderedPlain = dto.plainContent ? interpolateTemplate(dto.plainContent, r.parameters) : undefined;

      return {
        accountId,
        domainId: domain.id,
        campaignId: campaign.id,
        templateId: dto.templateId,
        category,
        brandingMode,
        brandType,
        footerHtml: dto.footerHtml || dto.customFooterHtml,
        recipient: r.email,
        sender,
        subject: renderedSubj,
        htmlBody: renderedHtml,
        plainBody: renderedPlain,
        parameters: Object.keys(r.parameters).length > 0 ? r.parameters : undefined,
        attachments: attachments.length > 0 ? (attachments as any) : undefined,
        cost: new Decimal(unitCost),
        status: 'PENDING' as const,
        assignedShard,
      };
    });

    const chunkSize = 500;
    for (let i = 0; i < messagesData.length; i += chunkSize) {
      await this.prisma.message.createMany({
        data: messagesData.slice(i, i + chunkSize),
      });
    }

    if (campaign.approvalStatus === ApprovalStatus.AUTO_APPROVED && isImmediate) {
      this.triggerLookaheadDispatch(campaign.id, cachedAttachments);
    }

    return {
      ...campaign,
      totalRecipients: uniqueRecipients.length,
      totalCost,
      approvalStatus: guardResult.approvalStatus,
      flags: guardResult.flags,
      reasons: guardResult.reasons,
    };
  }

  // Admin Approval
  async approveCampaign(adminAccountId: string, campaignId: string) {
    const admin = await this.prisma.account.findUnique({
      where: { id: adminAccountId },
    });

    if (!admin || admin.role !== 'ADMIN') {
      throw new BadRequestException('Only administrators can approve campaigns');
    }

    const campaign = await this.prisma.campaign.update({
      where: { id: campaignId },
      data: {
        approvalStatus: 'AUTO_APPROVED',
        status: 'PROCESSING',
      },
    });

    this.triggerLookaheadDispatch(campaign.id);
    return { message: 'Campaign approved and dispatched to shard queues', campaign };
  }

  // Admin Rejection (with 100% Wallet Refund)
  async rejectCampaign(adminAccountId: string, campaignId: string, rejectionReason: string) {
    const admin = await this.prisma.account.findUnique({
      where: { id: adminAccountId },
    });

    if (!admin || admin.role !== 'ADMIN') {
      throw new BadRequestException('Only administrators can reject campaigns');
    }

    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) throw new NotFoundException('Campaign not found');

    const updated = await this.prisma.campaign.update({
      where: { id: campaignId },
      data: {
        approvalStatus: 'REJECTED',
        status: 'REJECTED',
        rejectionReason: rejectionReason || 'Content flagged by security review',
      },
    });

    const refundAmount = Number(campaign.totalCostDeducted);
    await this.walletService.refund(
      campaign.accountId,
      refundAmount,
      campaign.id,
      `Full refund for rejected campaign: ${rejectionReason || 'Policy rejection'}`,
    );

    return {
      message: `Campaign rejected. $${refundAmount.toFixed(2)} refunded to customer wallet.`,
      campaign: updated,
    };
  }

  // Memory-Safe Lookahead Dispatcher Loop
  private async triggerLookaheadDispatch(campaignId: string, attachments?: PostalAttachmentPayload[]) {
    setImmediate(async () => {
      try {
        const campaign = await this.prisma.campaign.findUnique({
          where: { id: campaignId },
        });

        if (!campaign) return;

        let hasMore = true;
        while (hasMore) {
          const isTripped = await this.shardingService.checkBounceCircuitBreaker(campaignId);
          if (isTripped) break;

          const batch = await this.shardingService.claimLookaheadBatch(campaignId, 50);

          if (batch.length === 0) {
            hasMore = false;
            break;
          }

          for (const msg of batch) {
            const result = await this.shardingService.dispatchToPostal(
              msg.sender,
              msg.recipient,
              msg.subject,
              msg.htmlBody,
              msg.plainBody || undefined,
              attachments,
            );

            await this.prisma.message.update({
              where: { id: msg.id },
              data: {
                status: result.success ? 'SENT' : 'FAILED',
                postalMessageId: result.messageId,
                errorMessage: result.error,
                sentAt: new Date(),
              },
            });

            await this.prisma.campaign.update({
              where: { id: campaignId },
              data: {
                sentCount: { increment: result.success ? 1 : 0 },
                failedCount: { increment: result.success ? 0 : 1 },
              },
            });
          }
        }

        const remaining = await this.prisma.message.count({
          where: { campaignId, status: { in: ['PENDING', 'IN_FLIGHT'] } },
        });

        if (remaining === 0) {
          await this.prisma.campaign.update({
            where: { id: campaignId },
            data: { status: 'COMPLETED' },
          });
        }
      } catch (err: any) {
        this.logger.error(`Campaign lookahead dispatch error: ${err.message}`);
      }
    });
  }

  // Unified Message Logs with Production Pagination & Filtering
  async listMessages(
    accountId?: string,
    campaignId?: string,
    status?: string,
    category?: string,
    search?: string,
    page: number = 1,
    limit: number = 25,
  ) {
    const pageNum = Math.max(1, Number(page) || 1);
    const take = Math.min(100, Math.max(1, Number(limit) || 25));
    const skip = (pageNum - 1) * take;

    const where: any = {};
    if (accountId) where.accountId = accountId;
    if (campaignId) where.campaignId = campaignId;
    if (status) where.status = status;
    if (category) where.category = category;
    if (search) {
      where.OR = [
        { recipient: { contains: search, mode: 'insensitive' } },
        { subject: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, rawData] = await Promise.all([
      this.prisma.message.count({ where }),
      this.prisma.message.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
    ]);

    const totalPages = Math.ceil(total / take) || 1;

    // Map to frontend-friendly fields
    const data = rawData.map((m) => ({
      ...m,
      to: m.recipient,
      from: m.sender,
      isCoBranded: m.brandingMode === 'CO_BRANDED',
      cost: Number(m.cost),
      shardKey: m.assignedShard,
      mtaMessageId: m.postalMessageId,
    }));

    return {
      data,
      meta: {
        total,
        page: pageNum,
        limit: take,
        totalPages,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
      },
    };
  }
}
