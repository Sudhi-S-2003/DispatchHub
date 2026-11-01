import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { WalletService } from './wallet.service.js';
import { AuthGuard } from '../../common/guards/auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator.js';
import { Role } from '@prisma/client';

@Controller('api/v1/wallet')
@UseGuards(AuthGuard)
export class WalletController {
  constructor(private walletService: WalletService) {}

  @Get('balance')
  async getMyBalance(@CurrentUser() user: AuthenticatedUser) {
    const wallet = await this.walletService.getWallet(user.id);
    return { data: wallet };
  }

  @Get('ledger')
  async getMyLedger(
    @CurrentUser() user: AuthenticatedUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('type') type?: string,
  ) {
    return this.walletService.getTransactions(
      user.id,
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
      type,
    );
  }

  // Admin Only: Top-up / Credit Target Account
  @Post('topup')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async topup(
    @CurrentUser() user: AuthenticatedUser,
    @Body()
    body: {
      targetAccountId?: string;
      accountId?: string;
      amount: number;
      description?: string;
    },
  ) {
    const targetId = body.targetAccountId || body.accountId || user.id;
    return this.walletService.adminTopup(
      user.id,
      targetId,
      Number(body.amount),
      body.description || 'Admin wallet credit injection',
    );
  }

  // Admin Only: View global transaction ledger
  @Get('admin/all-transactions')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async getAllTransactions(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('type') type?: string,
  ) {
    return this.walletService.getAllTransactions(
      page ? Number(page) : 1,
      limit ? Number(limit) : 25,
      type,
    );
  }

  @Get(':accountId')
  async getWallet(
    @Param('accountId') accountId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (user.role !== Role.ADMIN && user.id !== accountId) {
      throw new ForbiddenException('You do not have permission to view this wallet');
    }
    return this.walletService.getWallet(accountId);
  }

  @Get(':accountId/transactions')
  async getTransactions(
    @Param('accountId') accountId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('type') type?: string,
  ) {
    if (user.role !== Role.ADMIN && user.id !== accountId) {
      throw new ForbiddenException('You do not have permission to view transactions for this account');
    }
    return this.walletService.getTransactions(
      accountId,
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
      type,
    );
  }
}
