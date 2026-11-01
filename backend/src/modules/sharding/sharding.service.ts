import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { PostalAttachmentPayload } from '../../common/utils/attachment-downloader.util.js';
import { SHARD_CONSTANTS, SECURITY_CONSTANTS } from '../../common/constants/index.js';
import axios from 'axios';

export function getShardForDomain(domainId: string, totalShards: number = SHARD_CONSTANTS.TOTAL_SHARDS): number {
  let hash = 0;
  for (let i = 0; i < domainId.length; i++) {
    hash = (hash << 5) - hash + domainId.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % totalShards;
}

@Injectable()
export class ShardingService {
  private readonly logger = new Logger(ShardingService.name);
  private readonly totalShards = Number(process.env.TOTAL_SHARDS) || SHARD_CONSTANTS.TOTAL_SHARDS;

  constructor(private prisma: PrismaService) {}

  assignShard(domainId: string): number {
    return getShardForDomain(domainId, this.totalShards);
  }

  // Lookahead Slicer: Claims bounded batch from PostgreSQL
  async claimLookaheadBatch(
    campaignId: string,
    batchSize: number = SHARD_CONSTANTS.LOOKAHEAD_BATCH_SIZE,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const pendingMessages = await tx.message.findMany({
        where: {
          campaignId,
          status: 'PENDING',
        },
        take: batchSize,
        orderBy: { id: 'asc' },
      });

      if (pendingMessages.length === 0) {
        return [];
      }

      const ids = pendingMessages.map((m) => m.id);

      await tx.message.updateMany({
        where: { id: { in: ids } },
        data: {
          status: 'IN_FLIGHT',
          claimedAt: new Date(),
        },
      });

      return pendingMessages;
    });
  }

  // Postal MTA HTTP Dispatcher (Supports Attachments, CC, BCC, Reply-To)
  async dispatchToPostal(
    senderEmail: string,
    recipientEmail: string,
    subject: string,
    htmlBody: string,
    plainBody?: string,
    attachments?: PostalAttachmentPayload[],
    options?: {
      replyTo?: string;
      cc?: string[];
      bcc?: string[];
    },
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const postalHost = process.env.POSTAL_HOST;
    const apiKey = process.env.POSTAL_API_KEY;

    const isMock = !postalHost || postalHost.includes('yourdomain.com') || !apiKey || apiKey.includes('your-postal');

    if (isMock) {
      const attCount = attachments?.length || 0;
      this.logger.log(`[MOCK POSTAL] Dispatching to: ${recipientEmail} | Subj: "${subject}" | Attachments: ${attCount}`);
      const mockMessageId = `mock_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      return { success: true, messageId: mockMessageId };
    }

    try {
      const serverDomain = process.env.POSTAL_SERVER_DOMAIN || 'mail.postal.sudhi.online';
      const isCustomDomain = !senderEmail.toLowerCase().endsWith(`@${serverDomain}`);

      const payload: any = {
        to: [recipientEmail],
        from: senderEmail,
        subject,
        html_body: htmlBody,
        plain_body: plainBody || htmlBody.replace(/<[^>]*>?/gm, ''),
      };

      // RFC 5322 Sender Header pattern:
      // When dispatching from a tenant's custom domain (e.g. mail1.postal.test.sudhi.online),
      // set the envelope sender to Postal's master verified server domain so Postal immediately authorizes delivery.
      if (isCustomDomain) {
        payload.sender = `dispatch@${serverDomain}`;
      }

      // Optional Reply-To address
      if (options?.replyTo) {
        payload.reply_to = options.replyTo;
      }

      // Optional CC recipients (Array of emails)
      if (options?.cc && options.cc.length > 0) {
        payload.cc = options.cc;
      }

      // Optional BCC recipients (Array of emails)
      if (options?.bcc && options.bcc.length > 0) {
        payload.bcc = options.bcc;
      }

      if (attachments && attachments.length > 0) {
        payload.attachments = attachments;
      }

      const response = await axios.post(
        `${postalHost}/api/v1/send/message`,
        payload,
        {
          headers: {
            'X-Server-API-Key': apiKey,
            'Content-Type': 'application/json',
          },
          timeout: SECURITY_CONSTANTS.MTA.HTTP_TIMEOUT_MS,
        },
      );

      // Validate Postal API response status
      if (response.data?.status !== 'success') {
        const errorMsg =
          response.data?.data?.message ||
          response.data?.data?.code ||
          'Postal MTA rejected dispatch';
        this.logger.error(`Postal dispatch rejected for ${recipientEmail}: ${errorMsg}`);
        return { success: false, error: errorMsg };
      }

      const data = response.data?.data;
      const messageId =
        data?.message_id ||
        (data?.messages && Object.values(data.messages)[0] as any)?.id?.toString() ||
        `postal_${Date.now()}`;

      return {
        success: true,
        messageId,
      };
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message;
      this.logger.error(`Postal dispatch failed for ${recipientEmail}: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  // Stuck Message Reaper: Crashed worker recovery
  async reapStuckMessages(): Promise<number> {
    const thresholdMinutes = SECURITY_CONSTANTS.STUCK_MESSAGE.THRESHOLD_MINUTES;
    const cutoff = new Date(Date.now() - thresholdMinutes * 60 * 1000);

    const result = await this.prisma.message.updateMany({
      where: {
        status: 'IN_FLIGHT',
        claimedAt: { lt: cutoff },
        postalMessageId: null,
      },
      data: {
        status: 'PENDING',
        claimedAt: null,
      },
    });

    if (result.count > 0) {
      this.logger.warn(`🧹 Reaper restored ${result.count} orphaned in-flight messages back to PENDING.`);
    }

    return result.count;
  }

  // Bounce Circuit Breaker
  async checkBounceCircuitBreaker(campaignId: string): Promise<boolean> {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { sentCount: true, bouncedCount: true, name: true, accountId: true },
    });

    if (!campaign || campaign.sentCount < 25) {
      return false;
    }

    const bounceRate = campaign.bouncedCount / campaign.sentCount;
    const threshold = Number(process.env.CIRCUIT_BREAKER_BOUNCE_THRESHOLD) || SHARD_CONSTANTS.CIRCUIT_BREAKER_BOUNCE_THRESHOLD;

    if (bounceRate >= threshold) {
      this.logger.warn(`🚨 CIRCUIT BREAKER TRIPPED! Campaign "${campaign.name}" bounce rate ${(bounceRate * 100).toFixed(1)}% exceeds limit.`);

      await this.prisma.campaign.update({
        where: { id: campaignId },
        data: { status: 'PAUSED' },
      });

      await this.prisma.auditLog.create({
        data: {
          accountId: campaign.accountId,
          action: 'CIRCUIT_BREAKER_AUTO_PAUSE',
          severity: 'WARN',
          description: `Auto-paused due to bounce rate (${(bounceRate * 100).toFixed(1)}%).`,
        },
      });

      return true;
    }

    return false;
  }
}
