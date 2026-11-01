export const SECURITY_CONSTANTS = {
  ATTACHMENTS: {
    MAX_FILE_SIZE_BYTES: 10 * 1024 * 1024, // 10 MB strict streaming ceiling
    DOWNLOAD_TIMEOUT_MS: 10000, // 10 seconds timeout for remote URL fetches
    CAMPAIGN_CACHE_TTL_MS: 2 * 60 * 60 * 1000, // 2 hours in-memory cache for campaign attachments
    ALLOWED_PROTOCOLS: ['http:', 'https:'],
    BLOCKED_HOSTNAMES: [
      'localhost',
      '127.0.0.1',
      '::1',
      '0.0.0.0',
      '169.254.169.254', // AWS/GCP/Azure link-local metadata service
      'metadata.google.internal',
    ],
  },
  MTA: {
    HTTP_TIMEOUT_MS: 15000, // 15 seconds Postal API timeout
  },
  STUCK_MESSAGE: {
    THRESHOLD_MINUTES: 5, // Messages IN_FLIGHT > 5 mins are considered orphaned
  },
} as const;
