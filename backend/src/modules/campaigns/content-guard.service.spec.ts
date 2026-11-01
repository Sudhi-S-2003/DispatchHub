import { describe, it, expect } from 'vitest';
import { ContentGuardService } from './content-guard.service.js';
import { EmailCategory, ApprovalStatus } from '@prisma/client';

describe('ContentGuardService', () => {
  const service = new ContentGuardService();

  it('should auto-approve compliant 1-to-1 transactional messages', () => {
    const result = service.analyzeCampaign(
      EmailCategory.TRANSACTIONAL,
      1,
      'Your One-Time Password',
      'Your OTP is 849201. Please do not share it.',
      false,
    );

    expect(result.canAutoApprove).toBe(true);
    expect(result.approvalStatus).toBe(ApprovalStatus.AUTO_APPROVED);
    expect(result.flags).toHaveLength(0);
  });

  it('should flag transactional messages that contain promotional keywords', () => {
    const result = service.analyzeCampaign(
      EmailCategory.TRANSACTIONAL,
      1,
      'Account Receipt',
      'Thank you for your purchase! Check out our special 50% discount sale now!',
      false,
    );

    expect(result.canAutoApprove).toBe(false);
    expect(result.approvalStatus).toBe(ApprovalStatus.PENDING_ADMIN_APPROVAL);
    expect(result.flags).toContain('PROMO_CONTENT_IN_TRANSACTIONAL');
  });

  it('should flag marketing emails missing an unsubscribe link', () => {
    const result = service.analyzeCampaign(
      EmailCategory.MARKETING,
      50,
      'Product Updates',
      'Here are all the new features we shipped this month.',
      false,
    );

    expect(result.canAutoApprove).toBe(false);
    expect(result.approvalStatus).toBe(ApprovalStatus.PENDING_ADMIN_APPROVAL);
    expect(result.flags).toContain('MISSING_UNSUBSCRIBE_LINK');
  });

  it('should auto-approve marketing emails with a valid unsubscribe link for trusted accounts', () => {
    const result = service.analyzeCampaign(
      EmailCategory.MARKETING,
      100,
      'Monthly Newsletter',
      'Here are our latest updates. To opt out, click unsubscribe here.',
      true, // trusted account
    );

    expect(result.canAutoApprove).toBe(true);
    expect(result.approvalStatus).toBe(ApprovalStatus.AUTO_APPROVED);
    expect(result.flags).toHaveLength(0);
  });

  it('should require admin review for high-volume campaigns on untrusted accounts', () => {
    const result = service.analyzeCampaign(
      EmailCategory.MARKETING,
      5000,
      'Mass Announcement',
      'Special announcement. Click unsubscribe to opt out.',
      false, // untrusted account
    );

    expect(result.canAutoApprove).toBe(false);
    expect(result.approvalStatus).toBe(ApprovalStatus.PENDING_ADMIN_APPROVAL);
    expect(result.flags).toContain('HIGH_VOLUME_NEW_ACCOUNT');
  });
});
