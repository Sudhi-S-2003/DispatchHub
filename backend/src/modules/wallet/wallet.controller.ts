import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Headers,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { WalletService } from './wallet.service.js';
import { AuthService } from '../auth/auth.service.js';

@Controller('api/v1/wallet')
export class WalletController {
  constructor(
    private walletService: WalletService,
    private authService: AuthService,
  ) {}

  @Get('balance')
  async getMyBalance(
    @Headers('authorization') authHeader?: string,
    @Headers('x-api-key') apiKeyHeader?: string,
  ) {
    const authResult = await this.authService.validateTokenOrApiKey(authHeader, apiKeyHeader);
    if (!authResult) {
      throw new UnauthorizedException('Authentication required');
    }
    const wallet = await this.walletService.getWallet(authResult.account.id);
    return { data: wallet };
  }

  @Get('ledger')
  async getMyLedger(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('type') type?: string,
    @Headers('authorization') authHeader?: string,
    @Headers('x-api-key') apiKeyHeader?: string,
  ) {
    const authResult = await this.authService.validateTokenOrApiKey(authHeader, apiKeyHeader);
    if (!authResult) {
      throw new UnauthorizedException('Authentication required');
    }
    return this.walletService.getTransactions(authResult.account.id, page, limit, type);
  }

  @Post('topup')
  async topup(
    @Body()
    body: {
      accountId?: string;
      targetAccountId?: string;
      amount: number;
      description?: string;
    },
    @Headers('authorization') authHeader?: string,
    @Headers('x-api-key') apiKeyHeader?: string,
  ) {
    const authResult = await this.authService.validateTokenOrApiKey(authHeader, apiKeyHeader);
    if (!authResult) {
      throw new UnauthorizedException('Authentication required');
    }

    const targetId = body.targetAccountId || body.accountId || authResult.account.id;
    return this.walletService.adminTopup(
      authResult.account.id,
      targetId,
      Number(body.amount),
      body.description || 'Admin wallet credit injection',
    );
  }

  @Get(':accountId')
  async getWallet(@Param('accountId') accountId: string) {
    return this.walletService.getWallet(accountId);
  }

  @Get(':accountId/transactions')
  async getTransactions(
    @Param('accountId') accountId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('type') type?: string,
  ) {
    return this.walletService.getTransactions(accountId, page, limit, type);
  }
}
