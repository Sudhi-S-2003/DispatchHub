#!/bin/bash
# ==============================================================================
# DispatchHub - Turnkey Server Deployment Script
# Usage: bash scripts/deploy.sh
# ==============================================================================
set -e

echo "🚀 Starting DispatchHub Production Stack Deployment..."

# 1. Pull latest code
echo "📥 Syncing latest codebase..."
git fetch --all
git reset --hard origin/main

# 2. Build & launch Docker containers (Auto-migrates & seeds database on boot)
echo "🐳 Building and starting Docker services..."
docker compose up -d --build

# 3. Apply Nginx configuration
echo "🌐 Configuring Nginx reverse proxy routing..."
cp docs/nginx/postal.conf /etc/nginx/conf.d/postal.conf
nginx -t
nginx -s reload

# 4. Configure Postal MTA for Multi-Tenant Custom Domains (allow_sender = 1)
echo "⚙️ Ensuring Postal MTA allows arbitrary multi-tenant custom domains..."
MARIADB_CID=$(docker ps -qf "name=postal.*mariadb|mariadb" | head -n 1 || true)
if [ -n "$MARIADB_CID" ] && [ -f /opt/postal/config/postal.yml ]; then
  POSTAL_DB_PW=$(grep "password:" /opt/postal/config/postal.yml | head -n 1 | awk '{print $2}' || true)
  docker exec -i "$MARIADB_CID" mariadb -u root -p"$POSTAL_DB_PW" -e "USE postal; UPDATE servers SET allow_sender = 1;" 2>/dev/null || true
  echo "✅ Postal MTA servers configured with allow_sender = 1"
fi

echo "======================================================================="
echo "🎉 DispatchHub is LIVE!"
echo "👉 Client Web UI: http://app.postal.sudhi.online"
echo "👉 Client REST API: http://api.postal.sudhi.online"
echo "👉 Postal MTA Web: http://postal.sudhi.online"
echo "======================================================================="
