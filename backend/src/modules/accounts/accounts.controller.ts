import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  NotFoundException,
  ForbiddenException,
  UseGuards,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { Role } from '@prisma/client';
import { AuthGuard } from '../../common/guards/auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator.js';

@Controller('api/v1/accounts')
@UseGuards(AuthGuard)
export class AccountsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
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
  async getAccount(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (user.role !== Role.ADMIN && user.id !== id) {
      throw new ForbiddenException('You do not have permission to view this account');
    }

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
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
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
