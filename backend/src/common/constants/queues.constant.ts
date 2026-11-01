export const SHARD_CONSTANTS = {
  TOTAL_SHARDS: 4,
  LOOKAHEAD_BATCH_SIZE: 50,
  DEFAULT_PACING_TPS: 50,
  CIRCUIT_BREAKER_BOUNCE_THRESHOLD: 0.04, // Auto-pause if bounce rate >= 4%
  QUEUES: {
    PRIORITY: 'queue:priority', // 1-to-1 Transactional & Test Bypass Queue
    SHARD_PREFIX: 'queue:shard:', // Sharded queues: queue:shard:0 .. queue:shard:3
    WEBHOOKS: 'queue:webhooks', // Postal webhook event processing
  },
} as const;
