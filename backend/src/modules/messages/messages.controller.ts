import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { MessagesService } from './messages.service.js';
import { AuthGuard } from '../../common/guards/auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator.js';
import { Role } from '@prisma/client';

@Controller('api/v1/messages')
export class MessagesController {
  constructor(private messagesService: MessagesService) {}

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
  @UseGuards(AuthGuard)
  async sendSingle(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: any,
  ) {
    const targetAccountId =
      user.role === Role.ADMIN && body.accountId ? body.accountId : user.id;

    const result = await this.messagesService.sendSingleMessage({
      ...body,
      accountId: targetAccountId,
    });
    return { success: true, data: result };
  }

  // 3. Dispatch Bulk Campaign (Immediate or Scheduled)
  @Post('campaign')
  @UseGuards(AuthGuard)
  async dispatchCampaign(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: any,
  ) {
    const targetAccountId =
      user.role === Role.ADMIN && body.accountId ? body.accountId : user.id;

    const result = await this.messagesService.dispatchCampaign({
      ...body,
      accountId: targetAccountId,
    });
    return { success: true, data: result };
  }

  // 4. Admin Campaign Approval
  @Post('campaign/:id/approve')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async approveCampaign(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.messagesService.approveCampaign(user.id, id);
  }

  // 5. Admin Campaign Rejection (100% Wallet Refund)
  @Post('campaign/:id/reject')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async rejectCampaign(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body('reason') reason?: string,
  ) {
    return this.messagesService.rejectCampaign(
      user.id,
      id,
      reason || 'Content policy rejection',
    );
  }

  // 6. Unified Message Logs with Production Pagination & Filtering
  @Get()
  @UseGuards(AuthGuard)
  async listMessages(
    @CurrentUser() user: AuthenticatedUser,
    @Query('accountId') accountId?: string,
    @Query('campaignId') campaignId?: string,
    @Query('status') status?: string,
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const effectiveAccountId =
      user.role === Role.ADMIN ? (accountId || undefined) : user.id;

    return this.messagesService.listMessages(
      effectiveAccountId,
      campaignId,
      status,
      category,
      search,
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
    );
  }
}
