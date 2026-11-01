import { TransactionType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export interface AdminTopupDto {
  adminAccountId: string;
  targetAccountId: string;
  amount: number;
  description: string;
}

export interface PreflightDebitResult {
  isSuccess: boolean;
  balanceBefore: Decimal;
  balanceAfter: Decimal;
  deductedAmount: Decimal;
  transactionId: string;
}
