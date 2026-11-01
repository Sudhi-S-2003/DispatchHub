# DispatchHub & Postal MTA — Production Deployment Playbook

This document details the exact, battle-tested procedure for deploying **Postal MTA** and **DispatchHub (NestJS + Next.js 14 Enterprise Engine)** on production servers (AlmaLinux 9 / Rocky Linux 9 / RHEL / Ubuntu 22.04+).

---

## 1. Prerequisites & Port Availability Verification

### 1.1 Pre-Flight Port Check
Before launching any services, verify that required ports are either available or correctly routed:

```bash
ss -tulpn | grep -E ':(25|80|443|3000|4000|5000|5432|5433|6379)'
```

| Port | Service | Expected State |
| :--- | :--- | :--- |
| **25** | Postal SMTP | Free before Postal start $\to$ Postal binds |
| **80** | Nginx Reverse Proxy | Managed by Nginx for `app.*`, `api.*`, `postal.*` |
| **443** | Nginx SSL | Existing sites / SSL |
| **3000** | Next.js 14 Frontend | Free $\to$ `dispatchhub-frontend` |
| **4000** | NestJS Backend | Free $\to$ `dispatchhub-backend` |
| **5000** | Postal Web / API | Free $\to$ `postal-web` |
| **5433** | PostgreSQL | Free $\to$ `dispatchhub-postgres` |
| **6379** | Redis Queue | Free $\to$ `dispatchhub-redis` |

### 1.2 Infrastructure Requirements
* **RAM**: $\ge$ 4 GB (Recommended 8 GB+ for high volume)
* **Disk**: $\ge$ 50 GB SSD
* **Outbound Port 25**: Must be unblocked by hosting provider (OVH, Hetzner, Vultr, etc.)
  ```bash
  timeout 5 bash -c '</dev/tcp/gmail-smtp-in.l.google.com/25' && echo "Port 25 OPEN"
  ```
* **Reverse DNS (PTR)**: Set the server's public IPv4 PTR record in your host control panel to `postal.yourdomain.com`.

### 1.2 DNS A Records (GoDaddy / Cloudflare / Route53)
Set the following 4 A records pointing to your server's Public IP:
| Type | Name / Host | Value | TTL |
| :--- | :--- | :--- | :--- |
| **A** | `postal` | `YOUR_SERVER_IP` | 600s / 10m |
| **A** | `app.postal` | `YOUR_SERVER_IP` | 600s / 10m |
| **A** | `api.postal` | `YOUR_SERVER_IP` | 600s / 10m |
| **A** | `mail.postal` | `YOUR_SERVER_IP` | 600s / 10m |

---

## 2. Docker & Postal Engine Setup

### Step 2.1: Install Docker & Tools (AlmaLinux / Rocky 9)
```bash
dnf install -y dnf-plugins-core git curl jq && \
dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo && \
dnf install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin && \
systemctl enable --now docker
```

### Step 2.2: Install Postal CLI Helper & MariaDB
```bash
git clone https://github.com/postalserver/install /opt/postal/install && \
ln -sf /opt/postal/install/bin/postal /usr/bin/postal && \
docker run -d --name postal-mariadb -p 127.0.0.1:3306:3306 --restart always \
  -e MARIADB_DATABASE=postal \
  -e MARIADB_ROOT_PASSWORD=postal \
  mariadb
```

### Step 2.3: Bootstrap Postal Configuration
```bash
postal bootstrap postal.yourdomain.com
```

### Step 2.4: Set Database Passwords & PTR Alignment in `/opt/postal/config/postal.yml`
```bash
# 1. Update MariaDB passwords
python3 -c "
with open('/opt/postal/config/postal.yml', 'r') as f:
    c = f.read()
c = c.replace('password: null', 'password: postal')
c = c.replace('username: postal', 'username: root')
with open('/opt/postal/config/postal.yml', 'w') as f:
    f.write(c)
"

# 2. Align Postal SMTP HELO with the server's Reverse DNS (PTR)
# (e.g., if your server PTR is vps-2ba3c7e1.vps.ovh.ca, match it to prevent Gmail 421 HELO mismatch deferrals)
PTR_HOSTNAME=$(dig +short -x $(curl -s ifconfig.me) | sed 's/\.$//' || echo "postal.yourdomain.com")
sed -i "s/smtp_hostname: .*/smtp_hostname: ${PTR_HOSTNAME}/" /opt/postal/config/postal.yml

# 3. Prefer IPv4 over IPv6 in Linux to ensure connections use your primary IPv4
echo "precedence ::ffff:0:0/96 100" >> /etc/gai.conf
```

### Step 2.5: Initialize Postal Database & Admin User
```bash
# Initialize tables and schemas
postal initialize

# Create the master admin account (enter Email, Name, and Password when prompted)
postal make-user
```

### Step 2.6: Start Postal MTA
```bash
postal start
postal status
```

---

## 3. Web Proxy Configuration (Nginx / Caddy)

Postal Web UI listens internally on `127.0.0.1:5000`.

### Option A: Dedicated Production Server (Caddy with Auto-SSL)
If ports 80/443 are free, launch Caddy for automatic Let's Encrypt SSL:
```bash
docker run -d \
  --name postal-caddy \
  --restart always \
  --network host \
  -v /opt/postal/config/Caddyfile:/etc/caddy/Caddyfile \
  -v /opt/postal/caddy-data:/data \
  caddy
```

### Option B: Shared Server with Existing Nginx
If Nginx is already running on the server, create `/etc/nginx/conf.d/postal.conf`:
```nginx
server {
    listen 80;
    server_name postal.yourdomain.com;
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
Reload Nginx:
```bash
nginx -s reload
```

---

## 4. Postal Admin Dashboard Configuration

1. Open `http://postal.yourdomain.com` (or `https://...`) in your web browser.
2. Sign in with the credentials created in `postal make-user`.
3. **Create Organization**: e.g., `DispatchHub Global`.
4. **Create Mail Server**: e.g., `Production Server 1`.
5. **Add Sending Domain**:
   - Add `mail.postal.yourdomain.com` (or your sending domain).
   - Postal provides the **SPF** record and **DKIM** public key (TXT record `postal-XXXX._domainkey`).
   - Add these TXT records into your DNS provider (GoDaddy / Cloudflare).
   - Click **Verify Domain** in Postal.
6. **Generate Server API Key**:
   - Go to Mail Server $\to$ **Credentials** / **API Keys**.
   - Create an API key with send & delivery permissions.
   - Save this key for the DispatchHub backend `.env`.

---

## 5. Postal API Testing & DispatchHub Microservices Deployment

### 5.1 Generate an API Key in Postal
1. In Postal dashboard under **Demo Server**, click **"Credentials"** $\to$ **"Add Credential"**.
2. Select **Type: API**.
3. Name: `DispatchHub API Key`.
4. Permissions: Check **Send messages** and **View message details**.
5. Click **Create Credential** and copy the generated key.

### 5.2 Test Postal API directly with `curl`
```bash
curl -X POST http://postal.yourdomain.com/api/v1/send/message \
  -H "X-Server-API-Key: YOUR_POSTAL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": ["sudhiselampa19@gmail.com"],
    "from": "test@mail.postal.yourdomain.com",
    "subject": "Postal API Verification Test",
    "plain_body": "This email was sent directly via Postal HTTP API!"
  }'
```
Expected response:
```json
{
  "status": "success",
  "time": 0.04,
  "flags": {},
  "data": {
    "message_id": "xxxx-xxxx-xxxx",
    "messages": {
      "sudhiselampa19@gmail.com": {
        "id": 1,
        "token": "xxxx"
      }
    }
  }
}
```

### 5.3 Connect DispatchHub Microservices
Clone and launch DispatchHub:
```bash
mkdir -p /opt/dispatchhub && cd /opt/dispatchhub
git clone https://github.com/Sudhi-S-2003/DispatchHub.git .

# Configure backend environment
cat << 'EOF' > backend/.env
NODE_ENV=production
PORT=4000
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/dispatchhub?schema=public
REDIS_URL=redis://127.0.0.1:6379
JWT_SECRET=production_ultra_secure_jwt_secret_9988112233
ENCRYPTION_KEY=01234567890123456789012345678901
POSTAL_HOST=http://127.0.0.1:5000
POSTAL_API_KEY=YOUR_POSTAL_API_KEY_HERE
EOF

# Start DispatchHub Stack
docker compose -f docker-compose.prod.yml up -d --build
```

---

## 6. Temporary / Staging Clean Teardown Script

If running on a temporary test server, run this 1-line script to completely remove Postal, Docker, and all files cleanly:

```bash
postal stop 2>/dev/null
docker rm -f $(docker ps -aq) 2>/dev/null
docker volume prune -af 2>/dev/null
rm -rf /opt/postal /opt/dispatchhub /usr/bin/postal
rm -f /etc/nginx/conf.d/postal.conf && nginx -s reload 2>/dev/null
dnf remove -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
rm -rf /var/lib/docker /etc/docker
```
