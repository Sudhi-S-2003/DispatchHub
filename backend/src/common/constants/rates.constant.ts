import { BrandingMode, EmailCategory } from '@prisma/client';

export const RATE_MATRIX: Record<BrandingMode, Record<EmailCategory, number>> = {
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
} as const;

export function calculateEmailCost(category: EmailCategory, mode: BrandingMode): number {
  return RATE_MATRIX[mode][category];
}
