# DispatchHub: Comprehensive System Architecture & AI Context Prompt

> **Purpose**: This document is an exhaustive, production-grade architectural specification and context prompt designed to allow any AI agent or software engineer to instantly understand, maintain, debug, and extend DispatchHub without prior familiarity.

---

## 1. Executive Summary & System Mission

**DispatchHub** is an enterprise-grade, self-hosted, multi-tenant email dispatching platform built to operate on top of **Postal MTA** (open-source mail transfer agent). It bridges high-throughput message ingestion with guaranteed deliverability, Telinfy-grade queue sharding, atomic pre-flight wallet economics, universal custom domain DNS verification, and authentic Gmail UI preview capabilities.

### Core Architectural Mandates:
1. **Zero Postal Portal Access for End Customers**:
   - Customers and tenants never access the underlying Postal MTA web dashboard.
   - All tenant domain registrations, 2048-bit RSA DKIM key generations, public DNS verifications, and email dispatches are 100% managed by DispatchHub's own API and Next.js frontend.
2. **Universal Custom Sending Domains**:
   - Accepts arbitrary domain hierarchies (e.g., `mail1.postal.test.sudhi.online`, `mailsend.xyz.com`, `mail2send.xyz.online`, or apex domains `company.com`).
   - Automatically reassembles multi-chunk RFC 1035 2048-bit RSA public keys.
3. **Atomic "Deduct First, Auto-Refund on Failure" Wallet Economics**:
   - Zero arbitrary daily sending quotas. Dispatches are gated strictly by real-time atomic balance deductions with instant automated refunds upon MTA bounce or rejection.
4. **Telinfy-Grade CRC32 Queue Sharding & Memory-Safe Lookahead Slicing**:
   - Messages are partitioned across 4 Redis domain-hashed shards (`queue:shard:0..3`) with a dedicated high-priority queue (`queue:priority`) for 1-to-1 transactional OTPs.
   - Sliding lookahead batching claims bounded batches of ~50 messages from PostgreSQL into Redis, preventing Redis OOM crashes.
5. **Single Git Commit Constraint**:
   - The primary GitHub repository (`main` branch) is strictly maintained as **ONE squashed root commit**.

---

## 2. Technology Stack & Infrastructure Topology

| Tier | Technology | Version | Port | Container Name | Purpose |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Frontend** | Next.js (App Router) | 14.2.15 | 3000 | `dispatchhub-frontend` | Dark-mode Web Console & Gmail UI Preview |
| **Styling** | Tailwind CSS + Lucide | Latest | - | - | Glassmorphism, Responsive Mobile/Desktop |
| **Backend API** | NestJS (Node.js) | 10.x (Node 22 LTS) | 4000 | `dispatchhub-backend` | REST API Gateway, Sharding, Auth, DNS |
| **ORM / Migrations** | Prisma ORM | 5.x | - | - | Schema migrations, ACID Transactions |
| **Primary Database** | PostgreSQL | 16-Alpine | 5433:5432 | `dispatchhub-postgres` | Persistent Ledger, Encrypted DKIM Keys, State |
| **Queue & Cache** | Redis | 7-Alpine | 6379 | `dispatchhub-redis` | Telinfy CRC32 Queue Shards & Priority Queue |
| **Mail Transfer Agent**| Postal MTA | 3.3.7 | 25, 5000 | `postal` stack | SMTP Engine, DKIM Signer, Delivery Worker |
| **Reverse Proxy** | Nginx | 1.20+ | 80, 443 | Host system | Virtual host routing (`app.`, `api.`, `postal.`) |

### Production Host Virtual Host Routing:
* **`http://app.postal.sudhi.online`** ➔ Routes to Frontend Port 3000.
* **`http://api.postal.sudhi.online`** ➔ Routes to Backend Port 4000.
* **`http://postal.sudhi.online`** ➔ Routes to Postal MTA Web Interface (Internal port 5000).

---

## 3. Annotated Directory & Codebase Tree

```
DispatchHub/
├── docker-compose.yml              # Production compose manifest for Postgres, Redis, Backend, Frontend
├── README.md                       # Master platform documentation, API reference & deliverability guide
├── scripts/
│   ├── deploy.sh                   # Turnkey deployment (git pull, docker build, nginx reload, Postal SQL update)
│   ├── clean-test-data.sh          # Cleans test messages, resets balances, flushes Redis shards
│   └── teardown.sh                 # Complete system purge (containers, volumes, code, configs)
├── docs/
│   ├── API_REFERENCE.md            # Comprehensive REST API endpoint & payload specification
│   ├── PRODUCTION_DEPLOYMENT_GUIDE.md # Step-by-step VPS deployment and Nginx virtual host guide
│   └── nginx/
│       └── postal.conf             # Production Nginx reverse-proxy virtual hosts
├── backend/
│   ├── Dockerfile                  # Multi-stage Node 22 Alpine rootless container build
│   ├── package.json                # Dependencies (@nestjs, @prisma/client, axios, etc.)
│   ├── prisma/
│   │   ├── schema.prisma           # Relational schema (Account, Wallet, Domain, Template, Campaign, Message)
│   │   └── seed.ts                 # Database seeder (SuperAdmin & Client accounts with initial balances)
│   └── src/
│       ├── main.ts                 # Application entry point, CORS configuration, global pipes
│       ├── app.module.ts           # Root module assembling feature modules
│       ├── common/
│       │   ├── constants/          # Sharding, Rates, Branding, Security constants
│       │   ├── crypto/             # AES-256-GCM DKIM key encryption utilities
│       │   ├── utils/
│       │   │   ├── dns.util.ts     # Multi-level subdomain parser (apex zone vs subdomain prefixes)
│       │   │   ├── dkim.util.ts    # Node crypto 2048-bit RSA keypair generator
│       │   │   └── attachment-downloader.util.ts # SSRF-protected remote attachment streamer
│       └── modules/
│           ├── auth/               # Dual authentication (JWT Bearer + Machine X-API-Key)
│           ├── accounts/           # Multi-tenant account & user management
│           ├── wallet/             # ACID financial transactions, pre-flight debits, auto-refunds
│           ├── domains/            # Custom domain manager & live DNS verification resolver
│           ├── templates/          # Dot-notation variable interpolation template engine
│           ├── campaigns/          # Content Guard regex scanner & bulk campaign distributor
│           ├── messages/           # Single message dispatcher (`/send-single`) & RFC header routing
│           └── sharding/           # Telinfy CRC32 queue sharding & Postal MTA HTTP dispatcher
└── frontend/
    ├── Dockerfile                  # Standalone Next.js 14 production Alpine runner
    ├── package.json                # Dependencies (Next.js, React, Tailwind, Lucide, etc.)
    ├── tailwind.config.ts          # Brand colors, dark palette, glassmorphism utilities
    └── src/
        ├── components/
        │   ├── AppShell.tsx        # Responsive dashboard layout with sidebar & topbar
        │   ├── Navigation.tsx      # Sidebar navigation links
        │   ├── Topbar.tsx          # Real-time wallet balance indicator & user profile
        │   └── GmailPreview.tsx    # High-fidelity Gmail UI live preview simulator
        ├── lib/
        │   ├── api.ts              # Typed isomorphic API client with auto-auth injection
        │   ├── auth-context.tsx    # React Context managing session, active role, wallet state
        │   └── clipboard.ts        # Universal clipboard engine supporting HTTP fallback
        └── app/
            ├── layout.tsx          # Root HTML layout & font definitions
            ├── page.tsx            # Dashboard overview with live analytics & metrics
            ├── login/page.tsx      # Dual-mode authentication screen (JWT/API-Key)
            ├── compose/page.tsx    # Send Studio: 1-to-1 & Campaign composer with Gmail Preview
            ├── domains/page.tsx    # Domain Manager: DNS records, copy buttons, live diagnostic checker
            ├── messages/page.tsx   # Message Audit Logs: Real-time ledger with Gmail Inspector drawer
            ├── templates/page.tsx  # Template Studio: Dot-notation editor with Gmail Live Tester
            ├── wallet/page.tsx     # Billing & Ledger: Real-time balance, top-up, transaction ledger
            └── admin/approvals/    # Admin Content Review Queue: 1-click Approval / 100% Refund
```

---

## 4. Internal Subsystems & Architectural Mechanics

### 4.1. Universal Custom Domain Engine & DNS Verification Resolver
* **File Locations**:
  * Parser: `backend/src/common/utils/dns.util.ts`
  * Resolver: `backend/src/modules/domains/dns-verification.service.ts`
  * Service: `backend/src/modules/domains/domains.service.ts`
  * UI: `frontend/src/app/domains/page.tsx`
* **Subdomain & Apex Resolution**:
  - Handles unlimited subdomain depths:
    - `mail1.postal.test.sudhi.online` ➔ Root Zone: `sudhi.online` | Subdomain Prefix: `mail1.postal.test`
    - `mailer.client.com` ➔ Root Zone: `client.com` | Subdomain Prefix: `mailer`
    - `acme.org` ➔ Apex: `acme.org` | Subdomain Prefix: `@`
* **DNS Verification Engine**:
  - Uses dedicated Node.js `Resolver()` instances configured with Google (`8.8.8.8`) and Cloudflare (`1.1.1.1`) to completely bypass Docker's internal caching resolver (`127.0.0.11`).
  - Correctly reassembles RFC 1035 multi-chunk TXT records for 2048-bit RSA keys.
  - UI offers format toggles:
    - **GoDaddy / Namecheap format**: Subdomain prefix only (e.g. `postal._domainkey.mail1.postal.test`).
    - **Cloudflare / Route 53 format**: Full FQDN (e.g. `postal._domainkey.mail1.postal.test.sudhi.online`).
  - Priority Separation: Extracts MX Priority (`10`) and hostname (`mail.postal.sudhi.online`) so users avoid copy-paste errors into registrar forms.

### 4.2. Postal MTA Integration & Zero-Postal UI Mechanics
* **File Locations**:
  * `backend/src/modules/sharding/sharding.service.ts`
  * `scripts/deploy.sh`
* **Postal Communication**:
  - DispatchHub communicates with Postal via Postal's HTTP API: `POST http://postal.sudhi.online/api/v1/send/message`.
  - Authenticated via `X-Server-API-Key` header.
  - Routed through Docker host gateway (`host.docker.internal` / `postal.sudhi.online:host-gateway`) to Nginx port 80 ➔ Postal loopback `127.0.0.1:5000`.
* **Allow Arbitrary Senders (`allow_sender = 1`)**:
  - By default, Postal blocks emails with `UnauthenticatedFromAddress` if the `From:` address is not pre-registered in Postal's database.
  - In `scripts/deploy.sh`, DispatchHub automatically executes:
    ```sql
    USE postal; UPDATE servers SET allow_sender = 1;
    ```
    inside Postal's MariaDB container during deployment.
* **RFC 5322 Envelope Sender Pattern**:
  - When dispatching from a tenant's custom domain (e.g. `dispatch@mail1.postal.test.sudhi.online`):
    - `from`: Tenant's custom domain (`dispatch@mail1.postal.test.sudhi.online`).
    - `sender`: Postal's master verified server domain (`dispatch@mail.postal.sudhi.online`).
  - This immediately authorizes Postal MTA to accept and deliver the message without requiring tenants to log into the Postal web console.

### 4.3. Atomic Pre-Flight Wallet Economics ("Deduct First")
* **File Locations**:
  * `backend/src/modules/wallet/wallet.service.ts`
  * `backend/src/common/constants/rates.constant.ts`
* **Rate Card**:
  - **White-Label Mode**:
    - `TRANSACTIONAL`: $0.050 / email
    - `MARKETING`: $0.035 / email
    - `NOTIFICATION`: $0.025 / email
    - `TEST`: $0.010 / email
  - **Co-Branded Mode (50% Discount)**:
    - `TRANSACTIONAL`: $0.025 / email
    - `MARKETING`: $0.015 / email
    - `NOTIFICATION`: $0.010 / email
    - `TEST`: $0.010 / email
* **Transaction Life-Cycle**:
  1. **Pre-flight Check**: Verifies `wallet.balance >= totalCost`. If insufficient, throws `400 Bad Request`.
  2. **Atomic Debit**: Deducts exact cost and writes a `DEBIT_SEND` ledger row in PostgreSQL within an ACID transaction.
  3. **MTA Dispatch**: Message is submitted to Postal.
  4. **Auto-Refund on Rejection**: If Postal MTA returns an error (e.g. invalid recipient, network failure, unverified DNS), DispatchHub automatically credits the exact amount back with a `REFUND` ledger row.

### 4.4. Telinfy-Grade CRC32 Queue Sharding & Lookahead Slicing
* **File Locations**:
  * `backend/src/modules/sharding/sharding.service.ts`
  * `backend/src/common/constants/queues.constant.ts`
* **Sharding Logic**:
  - Messages are partitioned across 4 Redis domain-hashed shards:
    ```typescript
    shardIndex = Math.abs(crc32(domainId)) % 4; // queue:shard:0..3
    ```
  - High-priority 1-to-1 messages (OTPs) bypass worker queues via `queue:priority`.
* **Lookahead Slicer**:
  - Large marketing campaigns (e.g. 100,000 recipients) are **not** loaded into Redis all at once.
  - The Slicer claims bounded batches of ~50 messages from PostgreSQL using ACID `findMany` + `updateMany(status: IN_FLIGHT)` transactions, preventing Redis Out-Of-Memory crashes.
  - A Stuck Message Reaper re-queues messages left in `IN_FLIGHT` for >15 minutes if a worker process crashes.

### 4.5. High-Fidelity Gmail UI Live Preview Simulator
* **File Locations**:
  * Component: `frontend/src/components/GmailPreview.tsx`
  * Used in: `compose/page.tsx`, `templates/page.tsx`, `messages/page.tsx`
* **Features**:
  - Complete Gmail action bar (Back, Archive, Report Spam, Delete, Mark Unread, Snooze, Tasks, Labels, Print).
  - Authentic email subject line with `Inbox` and `Important` pills.
  - Expandable RFC metadata popover displaying `from`, `reply-to`, `to`, `cc`, `bcc`, `date`, `subject`, and `🔒 Standard encryption (TLS)`.
  - Desktop View vs Mobile Phone View (simulates 380px device canvas) toggle.
  - Co-branded watermark preview (`⚡ Delivered via DispatchHub`).

### 4.6. Deliverability, PTR & Anti-Spam Engineering
* **Forward-Confirmed Reverse DNS (FCrDNS / PTR)**:
  - VPS IP `148.113.44.84` reverse DNS must point to `mail.postal.sudhi.online` in the OVH Cloud Console.
  - Mail server `HELO` matches PTR hostname, preventing Google's spam filters from penalizing the connection.
* **DMARC Policy Alignment**:
  - Root domain `_dmarc.sudhi.online` TXT: `v=DMARC1; p=none; sp=none; aspf=r; adkim=r;`
  - Uses `p=none` during domain ramp-up and testing so subdomains are not quarantined.
* **Return-Path CNAME**:
  - `psrp.mail.postal.sudhi.online` ➔ `CNAME rp.postal.sudhi.online` ensures bounce handling matches the sending domain.
* **Outbound IPv4 Kernel Enforcement**:
  - When outbound IPv6 lacks PTR or AAAA records, Google automatically routes incoming mail to Spam.
  - IPv6 is disabled in `/etc/sysctl.conf` (`net.ipv6.conf.all.disable_ipv6 = 1`) forcing all SMTP traffic through verified IPv4.

---

## 5. Prisma Relational Database Schema

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum Role {
  ADMIN
  CLIENT
}

enum DomainStatus {
  PENDING_VERIFICATION
  ACTIVE
  SUSPENDED
}

enum BrandingMode {
  WHITE_LABEL
  CO_BRANDED
}

enum BrandType {
  NONE
  CUSTOMER_BRAND
  PLATFORM_BRAND
}

enum EmailCategory {
  TRANSACTIONAL
  MARKETING
  NOTIFICATION
  TEST
}

enum ApprovalStatus {
  AUTO_APPROVED
  PENDING_ADMIN_APPROVAL
  REJECTED
}

enum MessageStatus {
  PENDING
  IN_FLIGHT
  SENT
  DELIVERED
  BOUNCED
  FAILED
}

enum CampaignStatus {
  DRAFT
  PENDING_APPROVAL
  SCHEDULED
  QUEUED
  PROCESSING
  COMPLETED
  PAUSED
  FAILED
  REJECTED
}

enum TransactionType {
  ADMIN_TOPUP
  DEBIT_SEND
  REFUND
}

model Account {
  id                 String              @id @default(uuid())
  name               String
  email              String              @unique
  apiKey             String              @unique @default(uuid())
  role               Role                @default(CLIENT)
  isActive           Boolean             @default(true)
  isTrusted          Boolean             @default(false)
  wallet             Wallet?
  domains            Domain[]
  templates          Template[]
  campaigns          Campaign[]
  messages           Message[]
  walletTransactions WalletTransaction[]
  createdAt          DateTime            @default(now())
  updatedAt          DateTime            @updatedAt

  @@map("accounts")
}

model Wallet {
  id           String              @id @default(uuid())
  accountId    String              @unique
  account      Account             @relation(fields: [accountId], references: [id], onDelete: Cascade)
  balance      Decimal             @default(0.00) @db.Decimal(12, 4)
  currency     String              @default("USD")
  isLocked     Boolean             @default(false)
  transactions WalletTransaction[]
  createdAt    DateTime            @default(now())
  updatedAt    DateTime            @updatedAt

  @@map("wallets")
}

model WalletTransaction {
  id          String          @id @default(uuid())
  walletId    String
  wallet      Wallet          @relation(fields: [walletId], references: [id], onDelete: Cascade)
  accountId   String
  account     Account         @relation(fields: [accountId], references: [id], onDelete: Cascade)
  amount      Decimal         @db.Decimal(12, 4)
  type        TransactionType
  referenceId String?
  description String?
  createdAt   DateTime        @default(now())

  @@index([walletId, createdAt])
  @@map("wallet_transactions")
}

model Domain {
  id             String       @id @default(uuid())
  accountId      String
  account        Account      @relation(fields: [accountId], references: [id], onDelete: Cascade)
  domainName     String       @unique
  dkimSelector   String       @default("postal")
  dkimPrivateKey String       // Encrypted AES-256-GCM
  dkimPublicKey  String
  spfRecord      String
  isSpfVerified  Boolean      @default(false)
  isDkimVerified Boolean      @default(false)
  isMxVerified   Boolean      @default(false)
  status         DomainStatus @default(PENDING_VERIFICATION)
  messages       Message[]
  campaigns      Campaign[]
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt

  @@map("domains")
}

model Template {
  id           String        @id @default(uuid())
  accountId    String
  account      Account       @relation(fields: [accountId], references: [id], onDelete: Cascade)
  name         String
  category     EmailCategory @default(TRANSACTIONAL)
  subject      String
  htmlContent  String
  plainContent String?
  footerHtml   String?
  messages     Message[]
  campaigns    Campaign[]
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt

  @@map("templates")
}

model Campaign {
  id             String         @id @default(uuid())
  accountId      String
  account        Account        @relation(fields: [accountId], references: [id], onDelete: Cascade)
  domainId       String
  domain         Domain         @relation(fields: [domainId], references: [id])
  templateId     String?
  template       Template?      @relation(fields: [templateId], references: [id])
  name           String
  category       EmailCategory  @default(MARKETING)
  brandingMode   BrandingMode   @default(WHITE_LABEL)
  brandType      BrandType      @default(NONE)
  footerHtml     String?
  sender         String
  subject        String
  htmlContent    String
  plainContent   String?
  replyTo        String?
  cc             String[]
  bcc            String[]
  totalCount     Int            @default(0)
  sentCount      Int            @default(0)
  failedCount    Int            @default(0)
  totalCost      Decimal        @default(0.00) @db.Decimal(12, 4)
  approvalStatus ApprovalStatus @default(AUTO_APPROVED)
  status         CampaignStatus @default(DRAFT)
  scheduledAt    DateTime?
  messages       Message[]
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt

  @@map("campaigns")
}

model Message {
  id              String        @id @default(uuid())
  accountId       String
  account         Account       @relation(fields: [accountId], references: [id], onDelete: Cascade)
  domainId        String
  domain          Domain        @relation(fields: [domainId], references: [id])
  campaignId      String?
  campaign        Campaign?     @relation(fields: [campaignId], references: [id], onDelete: SetNull)
  templateId      String?
  template        Template?     @relation(fields: [templateId], references: [id], onDelete: SetNull)
  category        EmailCategory
  brandingMode    BrandingMode  @default(WHITE_LABEL)
  brandType       BrandType     @default(NONE)
  footerHtml      String?
  recipient       String
  sender          String
  subject         String
  htmlBody        String
  plainBody       String?
  parameters      Json?
  attachments     Json?
  cost            Decimal       @db.Decimal(12, 4)
  status          MessageStatus @default(PENDING)
  postalMessageId String?
  errorMessage    String?
  assignedShard   Int?
  claimedAt       DateTime?
  sentAt          DateTime?
  deliveredAt     DateTime?
  createdAt       DateTime      @default(now())

  @@index([status, claimedAt])
  @@index([accountId, createdAt])
  @@map("messages")
}
```

---

## 6. Primary REST API Endpoints

### 6.1. Messages API
* `POST /api/v1/messages/send-single`:
  Immediate 1-to-1 dispatch. Supports `sender`, `recipient`, `subject`, `htmlContent`, `plainContent`, `replyTo`, `cc`, `bcc`, `brandingMode`, `category`, `attachments`, `parameters`.
* `POST /api/v1/messages/campaign`:
  Submits a bulk batch. Runs through Content Guard; auto-approves or routes to Admin Approval Queue.
* `GET /api/v1/messages`:
  Paginated audit log filtered by status, category, date, or search term.
* `GET /api/v1/messages/rates`:
  Returns live dual-tier pricing matrix.

### 6.2. Domains API
* `POST /api/v1/domains`:
  Registers a new sending domain, generates 2048-bit RSA keypair, computes SPF/MX recommendations.
* `GET /api/v1/domains`:
  Lists registered domains with real-time verification flags (`isSpfVerified`, `isDkimVerified`, `isMxVerified`).
* `POST /api/v1/domains/:id/verify`:
  Triggers live DNS inspection against Google/Cloudflare authoritative resolvers.

### 6.3. Templates API
* `GET /api/v1/templates`: List templates.
* `POST /api/v1/templates`: Create reusable template.
* `POST /api/v1/templates/preview`: Evaluate variables and render preview HTML.

### 6.4. Wallet API
* `GET /api/v1/wallet`: Returns real-time balance and transaction history.
* `POST /api/v1/wallet/topup`: Admin balance credit.

---

## 7. Operations & Administrative Playbook

### 7.1. Turnkey Production Deployment
```bash
cd /opt/dispatchhub
git fetch --all
git reset --hard origin/main
bash scripts/deploy.sh
```
* Automatically builds Docker images, runs Prisma migrations, seeds DB if empty, configures Nginx virtual hosts, and sets `allow_sender = 1` inside Postal's MariaDB.

### 7.2. Test Data Purging (Reset to Fresh Production State)
```bash
bash scripts/clean-test-data.sh
```
* Purges messages and campaigns, flushes Redis queues, restores initial clean wallet balances ($1,000 Admin / $100 Client), and preserves domain/template configurations.

### 7.3. Total System Teardown (Clean Uninstall)
```bash
bash scripts/teardown.sh
```
* Stops all containers, removes Docker volumes, deletes `/opt/dispatchhub` and `/opt/postal`, and restores the host OS to its clean baseline.

---

## 8. Hard Rules & Guidelines for Future AI Agents

1. **Single Commit Rule on GitHub**:
   - Always squash all changes into **strictly ONE commit** on `origin/main` using orphan branch replacement:
     ```bash
     git checkout --orphan single_commit_main
     git add -A
     git commit -m "feat: DispatchHub v1.0.0 enterprise multi-tenant platform..."
     git branch -D main
     git branch -m main
     git push -f origin main
     ```
2. **Never Break Zero-Postal-UI Mandate**:
   - Do not require or instruct end users to log into Postal's web portal (`postal.sudhi.online`). All domain operations must happen programmatically or through the DispatchHub dashboard.
3. **Preserve Atomic Wallet Deductions**:
   - Every message dispatch must execute pre-flight debit before submitting to Postal MTA, and must issue an immediate automatic refund if Postal rejects the message.
4. **Preserve Port Allocations**:
   - Do not bind Postgres to standard port 5432 on the host (Postgres is bound to `5433:5432` to avoid host collision). Redis is bound to `6379`. Backend runs on `4000`, Frontend on `3000`.
