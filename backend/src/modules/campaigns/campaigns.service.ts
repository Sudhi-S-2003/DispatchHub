import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { PaginatedResult, buildPaginationMeta } from '../../common/types/pagination.types.js';

@Injectable()
export class CampaignsService {
  constructor(private prisma: PrismaService) {}

  async listCampaigns(
    accountId: string,
    role: string,
    query: {
      page?: number;
      limit?: number;
      search?: string;
      status?: string;
      category?: string;
    },
  ): Promise<PaginatedResult<any>> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (role !== 'ADMIN') {
      where.accountId = accountId;
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.category) {
      where.category = query.category;
    }
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { subject: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [total, data] = await Promise.all([
      this.prisma.campaign.count({ where }),
      this.prisma.campaign.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          domain: { select: { domainName: true } },
          account: { select: { id: true, name: true, email: true } },
        },
      }),
    ]);

    return {
      data,
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async listPendingApprovals(
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedResult<any>> {
    const pageNum = Math.max(1, Number(page) || 1);
    const take = Math.min(100, Math.max(1, Number(limit) || 20));
    const skip = (pageNum - 1) * take;

    const where = {
      approvalStatus: 'PENDING_ADMIN_APPROVAL' as const,
    };

    const [total, data] = await Promise.all([
      this.prisma.campaign.count({ where }),
      this.prisma.campaign.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          domain: { select: { domainName: true } },
          account: { select: { id: true, name: true, email: true } },
        },
      }),
    ]);

    return {
      data,
      meta: buildPaginationMeta(total, pageNum, take),
    };
  }

  async getCampaign(id: string, accountId?: string, role?: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id },
      include: {
        domain: true,
        template: true,
        account: { select: { id: true, name: true, email: true } },
      },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    if (role !== 'ADMIN' && accountId && campaign.accountId !== accountId) {
      throw new NotFoundException('Campaign not found');
    }

    return campaign;
  }

  async pauseCampaign(id: string, accountId: string, role: string) {
    const campaign = await this.getCampaign(id, accountId, role);
    if (campaign.status === 'COMPLETED' || campaign.status === 'REJECTED') {
      throw new BadRequestException(`Cannot pause a campaign that is already ${campaign.status}`);
    }

    return this.prisma.campaign.update({
      where: { id },
      data: { status: 'PAUSED' },
    });
  }

  async resumeCampaign(id: string, accountId: string, role: string) {
    const campaign = await this.getCampaign(id, accountId, role);
    if (campaign.status !== 'PAUSED') {
      throw new BadRequestException('Only paused campaigns can be resumed');
    }

    return this.prisma.campaign.update({
      where: { id },
      data: { status: 'PROCESSING' },
    });
  }
}
