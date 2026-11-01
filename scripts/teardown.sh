#!/bin/bash
# ==============================================================================
# DispatchHub - Clean 1-Command Teardown Script (For Staging / 2-Day Demos)
# Usage: bash scripts/teardown.sh
# ==============================================================================
set -e

echo "⚠️  Initiating complete teardown of DispatchHub & Postal MTA..."

# 1. Stop postal
postal stop 2>/dev/null || true

# 2. Stop and remove all containers and volumes
docker compose down -v 2>/dev/null || true
docker rm -f $(docker ps -aq) 2>/dev/null || true
docker volume prune -af 2>/dev/null || true

# 3. Clean files and configurations
rm -rf /opt/postal /opt/dispatchhub /usr/bin/postal
rm -f /etc/nginx/conf.d/postal.conf
nginx -t 2>/dev/null && nginx -s reload 2>/dev/null || true

echo "✅ All DispatchHub & Postal containers and configurations have been wiped."
echo "Your server has been restored to its original state."
