# DispatchHub - Enterprise Multi-Tenant Postal MTA Platform

> High-throughput, self-hosted email delivery and management platform with Telinfy-grade CRC32 queue sharding, memory-safe sliding lookahead batching, atomic pre-flight wallet economics, universal custom sending domains, and authentic Gmail UI live preview.

---

## 🌟 Key Capabilities

- **Universal Custom Sending Domains**:
  - Zero-Postal-UI philosophy: Tenants manage and verify arbitrary custom sending domains (`mail1.postal.test.sudhi.online`, `mailer.company.com`) directly from DispatchHub.
  - Dedicated 2048-bit RSA DKIM keypair generation per domain with AES-256-GCM encryption at rest.
  - Real-time global DNS diagnostic inspector querying public authoritative nameservers (`8.8.8.8`, `1.1.1.1`) to verify SPF, DKIM, and MX records.
- **Gmail UI Live Preview Canvas**:
  - Embedded desktop and mobile simulator accurately rendering emails as they appear in Gmail.
  - Realistic Gmail chrome bar (Archive, Spam, Delete, Mark Unread, Snooze, Tasks, Labels).
  - Expandable RFC metadata dropdown (`from`, `reply-to`, `to`, `cc`, `bcc`, `date`, `security: TLS`).
  - Active across `/compose` (Send Studio), `/templates` (Template Studio), and `/messages` (Audit Inspector).
- **Advanced RFC Email Headers**:
  - Native support for custom `replyTo`, `cc` (Carbon Copy), and `bcc` (Blind Carbon Copy) across API and UI.
- **Pure Wallet Economics ("Deduct First, Auto-Refund on Failure")**:
  - Zero artificial sending quotas or daily caps.
  - Dispatches are gated strictly by atomic wallet deductions.
  - Immediate 100% automated refund to tenant balance if an MTA rejects delivery.
- **Dual-Branding Rate Card**:
  - **White-Label Mode ($0.050/tx)**: 100% private brand headers and optional customer-defined footer.
  - **Co-Branded Mode ($0.025/tx - 50% Discount)**: Includes platform watermark (`⚡ Delivered via DispatchHub`).
- **Telinfy Sharded Queues**:
  - 4 CRC32 domain-hashed Redis shards (`queue:shard:0..3`).
  - High-priority bypass queue (`queue:priority`) for 1-to-1 transactional OTPs.
  - Sliding lookahead batching (~50 emails at a time from PostgreSQL into Redis, preventing Redis OOM crashes).
- **SSRF-Protected Remote URL Attachments**:
  - URL-only remote attachments streaming directly into Postal MTA payloads with strict IP filtering (blocks internal subnets & cloud metadata `169.254.169.254`).
- **Turnkey Production Automation**:
  - Single-command zero-downtime deployment (`bash scripts/deploy.sh`) with automated Postal `allow_sender` database initialization and test-data purging (`bash scripts/clean-test-data.sh`).

---

## 🏗️ Architecture

```
[ Next.js 14 Web UI (Port 3000) ]
        │ (HTTP / proxy.ts)
        ▼
[ NestJS API Gateway (Port 4000) ]
   ├── Auth & Dual Mode Auth (JWT / X-API-Key)
   ├── Dynamic DNS Resolver (Google & Cloudflare)
   ├── Atomic Wallet Engine (ACID PostgreSQL 16)
   └── Content Compliance Guard (<50ms regex scanner)
        │
        ├── [ PostgreSQL 16 (Port 5433) ] ──── State Ledger & RSA-2048 Vault
        │
        └── [ Redis 7 Shards 0..3 (Port 6379) ] ── Lookahead 50/batch
                 │
                 ▼
        [ Shard Dispatcher Worker ]
                 │ (HTTP POST / STARTTLS)
                 ▼
        [ Postal MTA Engine (Port 25 / OVH Host Gateway) ]
                 │
                 ▼
        [ Recipient MX (Gmail / Outlook / Apple Mail) ]
```

---

## 💻 REST API Reference: Send Single Message

Dispatches an immediate high-priority 1-to-1 email (verification OTP, receipt, password reset, or custom domain test).

- **Method**: `POST`
- **Public API URL**: `http://api.postal.sudhi.online/api/v1/messages/send-single`
- **Local/Direct URL**: `http://127.0.0.1:4000/api/v1/messages/send-single`

### Headers
```http
Content-Type: application/json
X-API-Key: dh_live_master_admin_key_9988
```
*(Or pass `Authorization: Bearer <jwt_token>` for web client sessions).*

### Request Payload Fields

| Parameter | Type | Required | Description |
| :--- | :--- | :---: | :--- |
| `sender` | String | **Yes** | Sender address on any active verified domain (e.g. `dispatch@mail1.postal.test.sudhi.online`). |
| `recipient` (or `to`) | String | **Yes** | Destination email address. |
| `subject` | String | **Yes** | Email subject line (supports `{{param}}` interpolation). |
| `htmlContent` (or `htmlBody`) | String | **Yes** | HTML content of the message. |
| `plainContent` (or `textBody`) | String | No | Plain-text fallback. If omitted, DispatchHub automatically strips HTML tags. |
| `replyTo` (or `reply_to`) | String | No | Custom `Reply-To` address where recipient replies route. |
| `cc` | Array \| String | No | Secondary recipient addresses (array or comma-separated string). |
| `bcc` | Array \| String | No | Blind copy recipient addresses (array or comma-separated string). |
| `category` | String | No | `TRANSACTIONAL`, `MARKETING`, `NOTIFICATION`, `TEST`. Default: `TRANSACTIONAL`. |
| `brandingMode` | String | No | `WHITE_LABEL` ($0.05/email) or `CO_BRANDED` ($0.025/email). Default: `WHITE_LABEL`. |
| `attachments` | Array | No | Array of objects `[{"filename":"invoice.pdf","url":"https://example.com/invoice.pdf"}]`. |
| `parameters` | Object | No | Key-value pairs for template variable substitution (`{"name":"Sudhi"}`). |

---

### Practical cURL Examples

#### 1. Minimal Custom Domain Send
```bash
curl -s -X POST http://127.0.0.1:4000/api/v1/messages/send-single \
  -H "Content-Type: application/json" \
  -H "X-API-Key: dh_live_master_admin_key_9988" \
  -d '{
    "sender": "dispatch@mail1.postal.test.sudhi.online",
    "recipient": "sudhiselampa19@gmail.com",
    "category": "TRANSACTIONAL",
    "subject": "DispatchHub Live Custom Domain Email",
    "htmlContent": "<h1>Success!</h1><p>Sent from custom domain <b>mail1.postal.test.sudhi.online</b> through DispatchHub.</p>"
  }'
```

#### 2. Enterprise Send (with `replyTo`, `cc`, `bcc`, and White-Label Mode)
```bash
curl -s -X POST http://127.0.0.1:4000/api/v1/messages/send-single \
  -H "Content-Type: application/json" \
  -H "X-API-Key: dh_live_master_admin_key_9988" \
  -d '{
    "sender": "dispatch@mail1.postal.test.sudhi.online",
    "recipient": "sudhiselampa19@gmail.com",
    "replyTo": "support@sudhi.online",
    "cc": ["team@sudhi.online"],
    "bcc": ["audit@sudhi.online"],
    "category": "TRANSACTIONAL",
    "brandingMode": "WHITE_LABEL",
    "subject": "Your Security Passcode: 849201",
    "htmlContent": "<div style=\"font-family:sans-serif;padding:24px;\"><h2>Security Passcode</h2><p>Your code is: <b>849201</b></p></div>",
    "plainContent": "Your security passcode is: 849201"
  }'
```

#### 3. Remote Attachment Send (SSRF Protected)
```bash
curl -s -X POST http://127.0.0.1:4000/api/v1/messages/send-single \
  -H "Content-Type: application/json" \
  -H "X-API-Key: dh_live_master_admin_key_9988" \
  -d '{
    "sender": "dispatch@mail1.postal.test.sudhi.online",
    "recipient": "sudhiselampa19@gmail.com",
    "category": "TRANSACTIONAL",
    "subject": "Monthly Invoice Available",
    "htmlContent": "<p>Please find attached your invoice.</p>",
    "attachments": [
      {
        "filename": "invoice-october-2026.pdf",
        "url": "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
        "contentType": "application/pdf"
      }
    ]
  }'
```

---

## 🛡️ Deliverability & 10/10 Inbox Placement Guide

To guarantee outgoing emails land in the **Primary Inbox** rather than Spam, configure these four essential DNS settings:

### 1. Reverse DNS (PTR Record) in OVH VPS Panel (Crucial)
* In your OVH Cloud Console ➔ **Bare Metal Cloud / VPS** ➔ Select your VPS (`vps-2ba3c7e1`).
* Under the **IP** tab, click `...` next to `148.113.44.84` ➔ **Modify Reverse DNS (PTR)**.
* Set Reverse DNS to:
  ```text
  mail.postal.sudhi.online
  ```
* *Reason*: When connecting to Google's MX servers, Google validates that the connecting IP resolves back to your SMTP hostname (Forward-Confirmed reverse DNS - FCrDNS).

### 2. DMARC Alignment in GoDaddy DNS
* In GoDaddy DNS for your root zone `sudhi.online`, set `_dmarc` to monitoring mode (`p=none`) while adding subdomains:
  * **Type**: `TXT`
  * **Name**: `_dmarc`
  * **Value**:
    ```text
    v=DMARC1; p=none; sp=none; aspf=r; adkim=r;
    ```
* Setting `p=none` allows custom sending subdomains to land in the Inbox without being quarantined by apex domain policies.

### 3. Return-Path CNAME & MX Records in GoDaddy DNS
Add these two records under `sudhi.online` in GoDaddy:

| Type | Host / Name | Priority | Value / Points To |
| :--- | :--- | :---: | :--- |
| **CNAME** | `psrp.mail.postal` | *None* | `rp.postal.sudhi.online` |
| **MX** | `mail.postal` | `10` | `mx.postal.sudhi.online` |

### 4. Force Outbound IPv4 in Linux Kernel
Because Postal connecting to Google over unconfigured IPv6 causes automatic spam classification, force outgoing SMTP traffic through verified IPv4:
```bash
sysctl -w net.ipv6.conf.all.disable_ipv6=1 && \
sysctl -w net.ipv6.conf.default.disable_ipv6=1 && \
echo "net.ipv6.conf.all.disable_ipv6 = 1" >> /etc/sysctl.conf && \
echo "net.ipv6.conf.default.disable_ipv6 = 1" >> /etc/sysctl.conf && \
docker restart $(docker ps -qf "name=postal")
```

---

## 🧹 Purging Test Data & Resetting Platform

Once testing is complete, run the automated cleaner to purge all test messages, reset queue shards, and restore clean production balances:

```bash
bash scripts/clean-test-data.sh
```

This automatically:
1. Deletes all entries in the `messages` and `campaigns` tables in PostgreSQL.
2. Flushes all 4 Redis queue shards (`queue:shard:0..3`) and the priority queue.
3. Resets wallet balances to clean production initial balances ($1,000 for SuperAdmin, $100 for Clients).
4. Keeps all registered domains, templates, and account credentials intact.

---

## 🚀 Server Deployment & Management

### Turnkey Deployment
```bash
cd /opt/dispatchhub
git fetch --all
git reset --hard origin/main
bash scripts/deploy.sh
```

### Stack Teardown (Clean Uninstall)
```bash
bash scripts/teardown.sh
```

---

## 🔑 Default Production Credentials

| Role | Email | Starting Balance | Authentication Method |
| :--- | :--- | :---: | :--- |
| **SuperAdmin** | `admin@dispatchhub.com` | $1,000.00 | Master Key: `dh_live_master_admin_key_9988` |
| **Client** | `client@acme.com` | $100.00 | Tenant API Key: `client_acme_api_key_7711` |

---

## 📄 License
MIT License. Built for enterprise high-throughput mail delivery.
