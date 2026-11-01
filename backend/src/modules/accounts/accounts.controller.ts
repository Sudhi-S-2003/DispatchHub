import { Controller, Get, Post, Body, Param, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { Role } from '@prisma/client';

@Controller('api/v1/accounts')
export class AccountsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async listAccounts() {
    return this.prisma.account.findMany({
      include: {
        wallet: true,
        domains: {
          select: { id: true, domainName: true, status: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Get(':id')
  async getAccount(@Param('id') id: string) {
    const account = await this.prisma.account.findUnique({
      where: { id },
      include: {
        wallet: true,
        domains: true,
      },
    });

    if (!account) throw new NotFoundException('Account not found');
    return account;
  }

  @Post()
  async createAccount(
    @Body()
    body: {
      name: string;
      email: string;
      role?: Role;
      initialBalance?: number;
    },
  ) {
    const initialBal = body.initialBalance !== undefined ? Number(body.initialBalance) : 25.0;

    return this.prisma.$transaction(async (tx) => {
      const account = await tx.account.create({
        data: {
          name: body.name,
          email: body.email.toLowerCase().trim(),
          role: body.role || Role.CLIENT,
          wallet: {
            create: {
              balance: initialBal,
              currency: 'USD',
            },
          },
        },
        include: { wallet: true },
      });

      if (account.wallet && initialBal > 0) {
        await tx.walletTransaction.create({
          data: {
            walletId: account.wallet.id,
            accountId: account.id,
            amount: initialBal,
            balanceBefore: 0,
            balanceAfter: initialBal,
            type: 'ADMIN_TOPUP',
            description: 'Account activation credit allocation',
            performedBy: 'SYSTEM_ACTIVATION',
          },
        });
      }

      return account;
    });
  }
}
