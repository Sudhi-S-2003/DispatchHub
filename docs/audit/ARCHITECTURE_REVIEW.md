# DispatchHub: Architecture Review

**Document**: System Architecture Review & Refactoring Roadmap  
**Author**: Principal Software Architect  
**Target State**: Enterprise SaaS Multi-Tenant Platform

---

## 1. Architectural Principles to Enforce

1. **Strict Hexagonal / Clean Boundaries**:
   - **Controllers**: Thin HTTP adapters. Input validation, status codes, delegation to services. Zero business logic.
   - **Services**: Pure business domain rules, transaction orchestration, idempotency checks.
   - **Infrastructure**: Dedicated adapters for Redis, Postal MTA, DNS Resolvers, and File Storage.
2. **Authoritative Tenant Context**:
   - The authenticated identity (`Principal: { accountId, role }`) is resolved once by NestJS Guards.
   - Controllers pass `user.accountId` to services. The service layer strictly filters every database query by `accountId` unless the caller is an authenticated `ADMIN`.
3. **Durable Handoff via Redis BullMQ**:
   - Campaigns must not run in Node.js event-loop timers (`setImmediate`).
   - Every campaign slice must be published to a BullMQ worker queue with retry policies, backoff, and dead-letter queue (DLQ) tracking.
4. **Authoritative PostgreSQL State & Webhook Reconciliation**:
   - Postal MTA delivery events must be ingested via authenticated webhooks (`POST /api/v1/webhooks/postal`) to update message state to `DELIVERED`, `BOUNCED`, or `FAILED`.
5. **Human-Centric Enterprise UI Design System**:
   - Clean, high-density layouts inspired by Stripe Dashboard, Linear, and Resend.
   - Restrained color palette, subtle borders (`border-slate-800`), consistent typography, and zero decorative glassmorphism.
   - Unified server-state caching with TanStack Query.

---

## 2. Target Component Diagram

```
[ Browser / API Consumer ]
            │ (HTTP / JSON / TLS)
            ▼
[ Nginx Reverse Proxy (Virtual Host Routing) ]
   ├── app.postal.sudhi.online ➔ [ Next.js 14 Frontend (Port 3000) ]
   └── api.postal.sudhi.online ➔ [ NestJS Backend API (Port 4000) ]
                                          │
    ┌─────────────────────────────────────┴─────────────────────────────────────┐
    ▼                                                                           ▼
[ REST API Controllers ]                                           [ Postal Webhook Controller ]
    │ (DTO Validation)                                                 │ (HMAC Verification)
    ▼                                                                           ▼
[ Domain Services (Wallet, Messages, Campaigns, Domains) ] ──────────────► [ Webhook Ingestion Service ]
    │                                                                           │
    ├── ACID Transactions (PostgreSQL 16)                                        │
    │   ├── accounts, wallets, wallet_transactions                              │
    │   ├── domains, domain_verifications                                       │
    │   ├── templates, campaigns, messages, message_events ◄────────────────────┘
    │   └── idempotency_keys
    │
    └── Durable Queue Producers
        │ (BullMQ Jobs)
        ▼
    [ Redis 7 Cluster / Shards ]
        ├── queue:priority (1-to-1 Instant OTPs)
        └── queue:shard:0..3 (Domain-Hashed Campaign Workers)
                 │
                 ▼
        [ BullMQ Queue Consumers & Workers ]
                 │ (Axios HTTP / STARTTLS Port 25)
                 ▼
        [ Postal MTA (Host Gateway) ] ──► [ Global Internet MX (Gmail, Outlook) ]
```
