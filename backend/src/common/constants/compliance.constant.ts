export const COMPLIANCE_CONSTANTS = {
  // Trigger keywords that indicate promotional content (prohibited in purely transactional emails)
  MARKETING_TRIGGER_KEYWORDS: [
    'buy now',
    'discount',
    'special offer',
    'limited time offer',
    'sale',
    'promo code',
    'cashback',
    'coupon',
    'exclusive deal',
    'save 50%',
    'free shipping',
  ],
  // Mandatory tokens for marketing campaigns
  UNSUBSCRIBE_TOKENS: ['unsubscribe', 'opt-out', '{{unsubscribe_url}}'],
  LIMITS: {
    MAX_TRANSACTIONAL_RECIPIENTS: 5, // Single transactional messages are strictly 1-to-1 or small operational batches
    HIGH_VOLUME_REVIEW_THRESHOLD: 1000, // Campaigns above this threshold from new accounts trigger admin review
    TRUSTED_ACCOUNT_AUTO_APPROVE_LIMIT: 50, // Micro-batches auto-approved for low spam risk
  },
} as const;
