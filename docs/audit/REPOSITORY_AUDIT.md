# DispatchHub: Comprehensive Repository Audit

**Audit Date**: November 1, 2026  
**Status**: COMPLETE  
**Auditor**: Principal Software Architect & Elite Engineering Team  
**Scope**: Full Stack (Frontend, Backend, Database, Infrastructure, Deliverability, Security)

---

## 1. Executive Summary

DispatchHub has established strong conceptual foundations (universal custom domain parsing, atomic deduct-first principles, and Gmail UI live preview), but the actual code implementation suffers from severe architectural weaknesses, security gaps, client-side data leaks, and in-memory queue simulation.

### Critical Summary Findings:
1. **Critical Security Vulnerability (Tenant Spoofing)**: `messages.controller.ts` trusts `body.accountId || authResult.account.id`. Any authenticated user can pass another tenant's `accountId` and dispatch emails using their wallet and domains.
2. **Missing True Queue Workers**: Despite having BullMQ and Redis installed, campaign execution runs in a Node.js in-memory `setImmediate()` loop. A server reboot or container redeploy terminates campaigns permanently in flight.
3. **Missing Postal Webhook Ingestion**: There is no webhook endpoint for Postal MTA delivery receipts. As a result, message statuses remain stuck in `SENT` and never reach `DELIVERED` or `BOUNCED` based on real delivery events.
4. **Broken Dashboard Aggregations**: The dashboard fetches only the first 10 messages from `messagesApi.list({ page: 1, limit: 10 })` and calculates global delivery rates client-side on that tiny slice.
5. **No Database Pessimistic Row Locking in Wallet**: Concurrent message dispatches can read identical wallet balances simultaneously, creating race conditions and balance overdrafts.
6. **Zero Automated Test Coverage**: Only one dummy test (`app.controller.spec.ts`) exists across the entire codebase.

---

## 2. Layer-by-Layer Repository Analysis

### 2.1 Backend Architecture (`backend/`)
* **Framework**: NestJS 10 on Node 22 LTS.
* **Global Configuration**:
  - Missing global `ValidationPipe` in `main.ts`. Incoming request DTOs are not automatically stripped of unwhitelisted properties or validated with class-validator.
  - Missing centralized `HttpExceptionFilter`. API error formats vary across services.
  - Route prefixing is duplicated across every controller (`@Controller('api/v1/...')`) rather than centralized via `setGlobalPrefix('api/v1')`.
* **Authentication & Authorization**:
  - `auth.service.ts`: Implements magic auto-provisioning without credential verification. Anyone can supply an email and receive an authenticated session.
  - Controllers lack declarative NestJS Guards (`@UseGuards(JwtAuthGuard, RolesGuard)`). They manually call `this.authService.validateTokenOrApiKey(authHeader, apiKeyHeader)` inside route methods.
* **Wallet System**:
  - `wallet.service.ts`: Uses `tx.wallet.findUnique()` followed by `tx.wallet.update()` without `SELECT FOR UPDATE` pessimistic locks.
  - Missing unique constraint on transaction `referenceId` or an idempotency key table.
* **Queue & Sharding**:
  - `sharding.service.ts`: Calculates an arithmetic hash (`Math.abs(hash) % 4`) and sets `assignedShard` in PostgreSQL, but never pushes jobs to Redis or BullMQ.
  - Bounded batch lookahead is executed synchronously via `setImmediate()` in `messages.service.ts`.
* **Postal Integration**:
  - Direct HTTP client calls via Axios inside `sharding.service.ts`.
  - No webhook receiver for Postal delivery webhooks (`MessageDelivered`, `MessageBounced`).

---

### 2.2 Frontend Architecture (`frontend/`)
* **Framework**: Next.js 14 (App Router).
* **State Management**:
  - No server-state library (TanStack Query). Raw `useState` + `useEffect` are used everywhere.
  - Repeated network calls, missing request deduplication, and race conditions during tab navigation.
* **Component Organization**:
  - Giant page components (>500 lines each in `compose/page.tsx`, `messages/page.tsx`, `templates/page.tsx`).
  - Feature logic, API transport, form state, and presentation are coupled in single files.
* **User Experience & Styling**:
  - Heavy glassmorphism and card-inside-card layouts that feel AI-generated rather than purpose-built like Linear or Stripe.
  - Inconsistent loading skeletons and error states; destructive actions use native browser `alert()` and `confirm()`.

---

### 2.3 Database Layer (`backend/prisma/`)
* **Schema Health**:
  - Good foundational tables (`accounts`, `wallets`, `domains`, `templates`, `campaigns`, `messages`).
  - Missing critical operational models:
    - `IdempotencyRecord` (prevents double billing).
    - `MessageEvent` (event history for webhooks: DELIVERED, BOUNCED, OPENED, CLICKED).
    - `DomainVerificationRecord` (audit trail of DNS verification checks).
  - Missing composite database indexes for high-volume message queries (`accountId, createdAt DESC`, `recipient`).

---

### 2.4 Test Suite & Quality Assurance
* **Backend Tests**: 1 test total (`src/app.controller.spec.ts`).
* **Frontend Tests**: 0 tests.
* **E2E Tests**: 0 tests.
