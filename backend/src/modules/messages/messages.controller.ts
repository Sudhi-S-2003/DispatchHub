import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { MessagesService } from './messages.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuthService } from '../auth/auth.service.js';

@Controller('api/v1/messages')
export class MessagesController {
  constructor(
    private messagesService: MessagesService,
    private prisma: PrismaService,
    private authService: AuthService,
  ) {}

  // 1. Get Live Dual-Tier Rate Matrix
  @Get('rates')
  getRates() {
    return {
      WHITE_LABEL: {
        TRANSACTIONAL: 0.05,
        MARKETING: 0.035,
        NOTIFICATION: 0.025,
        TEST: 0.01,
      },
      CO_BRANDED: {
        TRANSACTIONAL: 0.025,
        MARKETING: 0.015,
        NOTIFICATION: 0.01,
        TEST: 0.01,
      },
    };
  }

  // 2. Send 1-to-1 Instant Message (OTP / Receipt / Test)
  @Post('send-single')
  async sendSingle(
    @Body() body: any,
    @Headers('authorization') authHeader?: string,
    @Headers('x-api-key') apiKeyHeader?: string,
  ) {
    const authResult = await this.authService.validateTokenOrApiKey(authHeader, apiKeyHeader);
    const accountId = body.accountId || authResult?.account?.id;
    if (!accountId) {
      throw new UnauthorizedException('Authentication credentials (JWT or X-API-Key) required');
    }

    const result = await this.messagesService.sendSingleMessage({
      ...body,
      accountId,
    });
    return { success: true, data: result };
  }

  // 3. Dispatch Bulk Campaign (Immediate or Scheduled)
  @Post('campaign')
  async dispatchCampaign(
    @Body() body: any,
    @Headers('authorization') authHeader?: string,
    @Headers('x-api-key') apiKeyHeader?: string,
  ) {
    const authResult = await this.authService.validateTokenOrApiKey(authHeader, apiKeyHeader);
    const accountId = body.accountId || authResult?.account?.id;
    if (!accountId) {
      throw new UnauthorizedException('Authentication credentials (JWT or X-API-Key) required');
    }

    const result = await this.messagesService.dispatchCampaign({
      ...body,
      accountId,
    });
    return { success: true, data: result };
  }

  // 4. Admin Campaign Approval
  @Post('campaign/:id/approve')
  async approveCampaign(
    @Param('id') id: string,
    @Body('adminAccountId') adminAccountId?: string,
    @Headers('authorization') authHeader?: string,
    @Headers('x-api-key') apiKeyHeader?: string,
  ) {
    const authResult = await this.authService.validateTokenOrApiKey(authHeader, apiKeyHeader);
    const adminId = adminAccountId || authResult?.account?.id;
    if (!adminId) throw new UnauthorizedException('Admin authentication required');
    return this.messagesService.approveCampaign(adminId, id);
  }

  // 5. Admin Campaign Rejection (100% Wallet Refund)
  @Post('campaign/:id/reject')
  async rejectCampaign(
    @Param('id') id: string,
    @Body('adminAccountId') adminAccountId?: string,
    @Body('reason') reason?: string,
    @Headers('authorization') authHeader?: string,
    @Headers('x-api-key') apiKeyHeader?: string,
  ) {
    const authResult = await this.authService.validateTokenOrApiKey(authHeader, apiKeyHeader);
    const adminId = adminAccountId || authResult?.account?.id;
    if (!adminId) throw new UnauthorizedException('Admin authentication required');
    return this.messagesService.rejectCampaign(adminId, id, reason || 'Content policy rejection');
  }

  // 6. Unified Message Logs with Production Pagination & Filtering
  @Get()
  async listMessages(
    @Query('accountId') accountId?: string,
    @Query('campaignId') campaignId?: string,
    @Query('status') status?: string,
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Headers('authorization') authHeader?: string,
    @Headers('x-api-key') apiKeyHeader?: string,
  ) {
    const authResult = await this.authService.validateTokenOrApiKey(authHeader, apiKeyHeader);
    const effectiveAccountId =
      accountId || (authResult?.account?.role === 'ADMIN' ? undefined : authResult?.account?.id);

    return this.messagesService.listMessages(
      effectiveAccountId,
      campaignId,
      status,
      category,
      search,
      page,
      limit,
    );
  }

  // 7. Postal Webhook Receiver (Delivered, Bounced, Opened)
  @Post('webhook/postal')
  async handlePostalWebhook(@Body() payload: any) {
    const event = payload?.event;
    const data = payload?.data;
    const postalId = data?.message?.id || data?.id;

    if (!postalId) {
      return { status: 'ignored', message: 'No postal message ID' };
    }

    if (event === 'MessageDelivered') {
      await this.prisma.message.updateMany({
        where: { postalMessageId: String(postalId) },
        data: { status: 'DELIVERED', deliveredAt: new Date() },
      });
    } else if (event === 'MessageBounced' || event === 'MessageFailed') {
      await this.prisma.message.updateMany({
        where: { postalMessageId: String(postalId) },
        data: {
          status: 'BOUNCED',
          errorMessage: data?.details || 'Postal bounce notification',
        },
      });
    }

    return { status: 'processed' };
  }
}
