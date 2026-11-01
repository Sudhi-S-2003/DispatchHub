import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getDashboardMetrics(accountId: string, role: string, timeRangeHours: number = 24) {
    const isGlobal = role === 'ADMIN';
    const whereClause: any = isGlobal ? {} : { accountId };

    const sinceDate = new Date(Date.now() - timeRangeHours * 60 * 60 * 1000);
    const timeWhereClause = {
      ...whereClause,
      createdAt: { gte: sinceDate },
    };

    // 1. Total messages & Status Breakdown
    const [
      totalCount,
      deliveredCount,
      bouncedCount,
      failedCount,
      sentCount,
      inFlightCount,
      periodTotal,
    ] = await Promise.all([
      this.prisma.message.count({ where: whereClause }),
      this.prisma.message.count({ where: { ...whereClause, status: 'DELIVERED' } }),
      this.prisma.message.count({ where: { ...whereClause, status: 'BOUNCED' } }),
      this.prisma.message.count({ where: { ...whereClause, status: 'FAILED' } }),
      this.prisma.message.count({ where: { ...whereClause, status: 'SENT' } }),
      this.prisma.message.count({ where: { ...whereClause, status: 'IN_FLIGHT' } }),
      this.prisma.message.count({ where: timeWhereClause }),
    ]);

    // 2. Total cost debited
    const costAggregate = await this.prisma.message.aggregate({
      where: whereClause,
      _sum: { cost: true },
    });
    const totalSpend = Number(costAggregate._sum.cost || 0);

    // 3. Campaign counts
    const [totalCampaigns, activeCampaigns, pendingApprovalCampaigns] = await Promise.all([
      this.prisma.campaign.count({ where: whereClause }),
      this.prisma.campaign.count({
        where: { ...whereClause, status: { in: ['PROCESSING', 'QUEUED'] } },
      }),
      this.prisma.campaign.count({
        where: { ...whereClause, approvalStatus: 'PENDING_ADMIN_APPROVAL' },
      }),
    ]);

    // 4. Domains health
    const [totalDomains, verifiedDomains] = await Promise.all([
      this.prisma.domain.count({ where: whereClause }),
      this.prisma.domain.count({ where: { ...whereClause, status: 'ACTIVE' } }),
    ]);

    // 5. Rates calculation
    const effectiveTotal = deliveredCount + bouncedCount + failedCount + sentCount;
    const deliveryRate =
      effectiveTotal > 0
        ? Number(((deliveredCount + sentCount) / effectiveTotal) * 100).toFixed(1)
        : '100.0';
    const bounceRate =
      effectiveTotal > 0 ? Number((bouncedCount / effectiveTotal) * 100).toFixed(1) : '0.0';

    // 6. Recent message activity (last 10)
    const recentMessages = await this.prisma.message.findMany({
      where: whereClause,
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        recipient: true,
        sender: true,
        subject: true,
        category: true,
        status: true,
        cost: true,
        postalMessageId: true,
        createdAt: true,
      },
    });

    return {
      overview: {
        totalMessages: totalCount,
        periodMessages: periodTotal,
        timeRangeHours,
        delivered: deliveredCount,
        bounced: bouncedCount,
        failed: failedCount,
        sent: sentCount,
        inFlight: inFlightCount,
        deliveryRate: Number(deliveryRate),
        bounceRate: Number(bounceRate),
        totalSpend,
      },
      campaigns: {
        total: totalCampaigns,
        active: activeCampaigns,
        pendingApproval: pendingApprovalCampaigns,
      },
      domains: {
        total: totalDomains,
        verified: verifiedDomains,
      },
      recentMessages,
    };
  }
}
