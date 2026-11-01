import { Injectable, BadRequestException, HttpException, HttpStatus, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { TransactionType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class WalletService {
  constructor(private prisma: PrismaService) {}

  async getWallet(accountId: string) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { accountId },
    });

    if (!wallet) {
      // Auto-create wallet if missing
      return this.prisma.wallet.create({
        data: {
          accountId,
          balance: 0.0,
          currency: 'USD',
        },
      });
    }

    return wallet;
  }

  // Admin Top-up / Credit Addition
  async adminTopup(
    adminAccountId: string,
    targetAccountId: string,
    amount: number,
    description: string,
  ) {
    if (amount <= 0) {
      throw new BadRequestException('Top-up amount must be greater than 0');
    }

    const admin = await this.prisma.account.findUnique({
      where: { id: adminAccountId },
    });

    if (!admin || admin.role !== 'ADMIN') {
      throw new BadRequestException('Only administrators can credit wallet balances');
    }

    const wallet = await this.getWallet(targetAccountId);

    return this.prisma.$transaction(async (tx) => {
      const balanceBefore = wallet.balance;
      const balanceAfter = new Decimal(balanceBefore).add(amount);

      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: balanceAfter },
      });

      const transaction = await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          accountId: targetAccountId,
          amount: new Decimal(amount),
          balanceBefore,
          balanceAfter,
          type: 'ADMIN_TOPUP',
          description: description || `Credit added by Admin (${admin.email})`,
          performedBy: `ADMIN: ${admin.email}`,
        },
      });

      return {
        wallet: updatedWallet,
        transaction,
      };
    });
  }

  // Pre-Flight Debit ("Deduct First") with atomic conditional decrement
  async debitPreflight(
    accountId: string,
    cost: number,
    type: TransactionType,
    referenceId: string,
    description: string,
  ) {
    if (cost <= 0) return;

    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({
        where: { accountId },
      });

      if (!wallet) {
        throw new NotFoundException('Account wallet not found');
      }

      if (wallet.isLocked) {
        throw new HttpException('Wallet is locked by administrator', HttpStatus.FORBIDDEN);
      }

      const currentBalance = new Decimal(wallet.balance);
      const debitAmount = new Decimal(cost);

      if (currentBalance.lessThan(debitAmount)) {
        throw new HttpException(
          {
            statusCode: HttpStatus.PAYMENT_REQUIRED,
            message: `Insufficient wallet balance. Required: $${debitAmount.toFixed(2)}, Available: $${currentBalance.toFixed(2)}`,
            required: debitAmount.toNumber(),
            available: currentBalance.toNumber(),
          },
          HttpStatus.PAYMENT_REQUIRED,
        );
      }

      // Atomic conditional decrement to eliminate race conditions
      const updateResult = await tx.wallet.updateMany({
        where: {
          id: wallet.id,
          isLocked: false,
          balance: { gte: debitAmount },
        },
        data: {
          balance: { decrement: debitAmount },
        },
      });

      if (updateResult.count === 0) {
        throw new HttpException(
          'Wallet balance was modified concurrently. Please retry.',
          HttpStatus.CONFLICT,
        );
      }

      const balanceAfter = currentBalance.sub(debitAmount);

      const transaction = await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          accountId,
          amount: debitAmount.negated(),
          balanceBefore: currentBalance,
          balanceAfter,
          type,
          referenceId,
          description,
          performedBy: 'SYSTEM',
        },
      });

      return {
        wallet: { ...wallet, balance: balanceAfter },
        transaction,
      };
    });
  }

  // Refund credit if pre-send fails
  async refund(
    accountId: string,
    amount: number,
    referenceId: string,
    description: string,
  ) {
    if (amount <= 0) return;

    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({
        where: { accountId },
      });

      if (!wallet) return;

      const balanceBefore = new Decimal(wallet.balance);
      const balanceAfter = balanceBefore.add(amount);

      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: balanceAfter },
      });

      const transaction = await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          accountId,
          amount: new Decimal(amount),
          balanceBefore,
          balanceAfter,
          type: 'REFUND',
          referenceId,
          description: description || 'Refund for failed or cancelled dispatch',
          performedBy: 'SYSTEM',
        },
      });

      return {
        wallet: updatedWallet,
        transaction,
      };
    });
  }

  async getTransactions(
    accountId: string,
    page: number = 1,
    limit: number = 20,
    type?: string,
  ) {
    const pageNum = Math.max(1, Number(page) || 1);
    const take = Math.min(100, Math.max(1, Number(limit) || 20));
    const skip = (pageNum - 1) * take;

    const where: any = { accountId };
    if (type) where.type = type;

    const [total, data] = await Promise.all([
      this.prisma.walletTransaction.count({ where }),
      this.prisma.walletTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
    ]);

    const totalPages = Math.ceil(total / take) || 1;

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

  async getAllTransactions(
    page: number = 1,
    limit: number = 25,
    type?: string,
  ) {
    const pageNum = Math.max(1, Number(page) || 1);
    const take = Math.min(100, Math.max(1, Number(limit) || 25));
    const skip = (pageNum - 1) * take;

    const where: any = {};
    if (type) where.type = type;

    const [total, data] = await Promise.all([
      this.prisma.walletTransaction.count({ where }),
      this.prisma.walletTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          account: {
            select: { name: true, email: true },
          },
        },
        skip,
        take,
      }),
    ]);

    const totalPages = Math.ceil(total / take) || 1;

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
