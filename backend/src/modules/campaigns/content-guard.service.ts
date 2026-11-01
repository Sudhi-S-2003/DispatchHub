import { Injectable } from '@nestjs/common';
import { EmailCategory, ApprovalStatus } from '@prisma/client';
import { COMPLIANCE_CONSTANTS } from '../../common/constants/index.js';

export interface GuardAnalysisResult {
  approvalStatus: ApprovalStatus;
  canAutoApprove: boolean;
  flags: string[];
  reasons: string[];
}

@Injectable()
export class ContentGuardService {
  analyzeCampaign(
    type: EmailCategory,
    recipientCount: number,
    subject: string,
    content: string,
    isAccountTrusted: boolean,
  ): GuardAnalysisResult {
    const flags: string[] = [];
    const reasons: string[] = [];
    const lowerContent = (subject + ' ' + content).toLowerCase();

    // 1. Transactional Rules ($0.05 / $0.025)
    if (type === 'TRANSACTIONAL') {
      if (recipientCount > COMPLIANCE_CONSTANTS.LIMITS.MAX_TRANSACTIONAL_RECIPIENTS) {
        flags.push('HIGH_RECIPIENT_TRANSACTIONAL');
        reasons.push(
          `Transactional emails are designated for 1-to-1 operations (max ${COMPLIANCE_CONSTANTS.LIMITS.MAX_TRANSACTIONAL_RECIPIENTS} recipients).`,
        );
      }

      const foundMarketing = COMPLIANCE_CONSTANTS.MARKETING_TRIGGER_KEYWORDS.filter((kw) =>
        lowerContent.includes(kw),
      );
      if (foundMarketing.length > 0) {
        flags.push('PROMO_CONTENT_IN_TRANSACTIONAL');
        reasons.push(`Transactional message contains promotional keywords: ${foundMarketing.join(', ')}.`);
      }
    }

    // 2. Marketing Rules ($0.035 / $0.015)
    if (type === 'MARKETING') {
      const hasUnsubscribe = COMPLIANCE_CONSTANTS.UNSUBSCRIBE_TOKENS.some((token) =>
        lowerContent.includes(token),
      );

      if (!hasUnsubscribe) {
        flags.push('MISSING_UNSUBSCRIBE_LINK');
        reasons.push('Marketing emails require a valid unsubscribe link to comply with CAN-SPAM / GDPR.');
      }
    }

    // 3. High Volume Rule
    if (
      recipientCount > COMPLIANCE_CONSTANTS.LIMITS.HIGH_VOLUME_REVIEW_THRESHOLD &&
      !isAccountTrusted
    ) {
      flags.push('HIGH_VOLUME_NEW_ACCOUNT');
      reasons.push(
        `High-volume campaign (>${COMPLIANCE_CONSTANTS.LIMITS.HIGH_VOLUME_REVIEW_THRESHOLD} recipients) requires Admin review.`,
      );
    }

    const hasCriticalFlags = flags.length > 0;
    const canAutoApprove =
      !hasCriticalFlags &&
      (isAccountTrusted || recipientCount <= COMPLIANCE_CONSTANTS.LIMITS.TRUSTED_ACCOUNT_AUTO_APPROVE_LIMIT);

    return {
      approvalStatus: canAutoApprove
        ? ApprovalStatus.AUTO_APPROVED
        : ApprovalStatus.PENDING_ADMIN_APPROVAL,
      canAutoApprove,
      flags,
      reasons,
    };
  }
}
