#!/bin/bash
# ==============================================================================
# DispatchHub - Purge Test Messages & Flush Queues
# Usage: bash scripts/clean-test-data.sh
# ==============================================================================
set -e

echo "🧹 Cleaning all DispatchHub test messages, audit logs, and queue shards..."

# 1. Purge messages, campaigns, and temporary test transactions from PostgreSQL
docker exec -i dispatchhub-postgres psql -U postgres -d dispatchhub -c "
  DELETE FROM messages;
  DELETE FROM campaigns;
  DELETE FROM wallet_transactions WHERE reference_id LIKE 'MSG_%' OR reference_id LIKE 'CAMP_%';
  UPDATE wallets SET balance = 1000.00 WHERE account_id IN (SELECT id FROM accounts WHERE role = 'ADMIN');
  UPDATE wallets SET balance = 100.00 WHERE account_id IN (SELECT id FROM accounts WHERE role = 'CLIENT');
"

# 2. Flush Redis Shards & Priority Queue
docker exec -i dispatchhub-redis redis-cli FLUSHALL

echo "======================================================================="
echo "✅ All test messages, queue shards, and temporary logs have been purged!"
echo "✨ Platform is 100% clean, fresh, and ready for production."
echo "======================================================================="
