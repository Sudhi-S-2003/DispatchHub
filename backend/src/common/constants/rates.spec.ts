import { describe, it, expect } from 'vitest';
import { calculateEmailCost, RATE_MATRIX } from './rates.constant.js';
import { BrandingMode, EmailCategory } from '@prisma/client';

describe('Dual-Tier Rate Matrix Economics', () => {
  it('should calculate 50% discount for Co-Branded Transactional emails', () => {
    const whiteLabelCost = calculateEmailCost(EmailCategory.TRANSACTIONAL, BrandingMode.WHITE_LABEL);
    const coBrandedCost = calculateEmailCost(EmailCategory.TRANSACTIONAL, BrandingMode.CO_BRANDED);

    expect(whiteLabelCost).toBe(0.05);
    expect(coBrandedCost).toBe(0.025);
    expect(coBrandedCost).toBe(whiteLabelCost / 2);
  });

  it('should calculate >55% discount for Co-Branded Marketing emails', () => {
    const whiteLabelCost = calculateEmailCost(EmailCategory.MARKETING, BrandingMode.WHITE_LABEL);
    const coBrandedCost = calculateEmailCost(EmailCategory.MARKETING, BrandingMode.CO_BRANDED);

    expect(whiteLabelCost).toBe(0.035);
    expect(coBrandedCost).toBe(0.015);
  });

  it('should return identical test dispatch rate for both tiers', () => {
    const whiteLabelCost = calculateEmailCost(EmailCategory.TEST, BrandingMode.WHITE_LABEL);
    const coBrandedCost = calculateEmailCost(EmailCategory.TEST, BrandingMode.CO_BRANDED);

    expect(whiteLabelCost).toBe(0.01);
    expect(coBrandedCost).toBe(0.01);
  });
});
