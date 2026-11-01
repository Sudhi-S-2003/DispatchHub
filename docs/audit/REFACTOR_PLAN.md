# DispatchHub: Enterprise Refactoring Master Plan

**Refactor Execution Sequence**: Controlled 10-Phase Transformation

---

## Phase 1: Audit & Documentation (Completed)
* Generated `REPOSITORY_AUDIT.md`, `ARCHITECTURE_REVIEW.md`, `BUG_REGISTER.md`, `API_COVERAGE.md`, `PRODUCTION_READINESS.md`, `REFACTOR_PLAN.md`.

## Phase 2: Database Schema & Migration Hardening
* Extend `backend/prisma/schema.prisma` with:
  * `IdempotencyRecord` (tracks request hash, status, response, TTL).
  * `MessageEvent` (event history: `DELIVERED`, `BOUNCED`, `OPENED`, `CLICKED`).
  * `DomainVerification` (history of SPF/DKIM/MX DNS queries).
  * Composite indexes on `messages (accountId, createdAt DESC)`, `messages (recipient)`, `wallet_transactions (referenceId)`.
* Run `npx prisma db push` or migration.

## Phase 3: Backend Foundation & Security Hardening
* Add global `ValidationPipe` with DTO whitelisting in `main.ts`.
* Add global `HttpExceptionFilter` and standardized API response interceptor.
* Implement NestJS Guards (`JwtAuthGuard`, `ApiKeyGuard`, `RolesGuard`) and custom decorator `@CurrentUser()`.
* Fix tenant context resolution: eliminate `body.accountId` spoofing across all controllers.

## Phase 4: Core Backend Modules Hardening
* **Wallet**: Add `SELECT FOR UPDATE` pessimistic locks or atomic SQL decrement to prevent race conditions. Implement idempotency validation.
* **Domains**: Eliminate cross-tenant domain leakage in fallback resolution. Add domain deletion and verification history.
* **Campaigns**: Build dedicated `CampaignsController` and `CampaignsService` with server-side pagination, pause/resume, and dedicated pending approvals endpoint.
* **Analytics**: Build `AnalyticsController` and `AnalyticsService` executing efficient PostgreSQL `COUNT`, `SUM`, and `GROUP BY` aggregations.

## Phase 5: Queue Durability & Postal Webhook Ingestion
* Setup BullMQ queues (`queue:priority`, `queue:campaigns`, `queue:shards`).
* Replace in-memory `setImmediate` with real BullMQ background worker.
* Implement `WebhooksController` with `POST /api/v1/webhooks/postal` to process delivery events.

## Phase 6: Frontend Design System & TanStack Query Foundation
* Install `@tanstack/react-query`.
* Build Linear/Stripe-inspired UI design system in `frontend/src/components/ui/` (Button, Input, Badge, Table, Dialog, Skeleton, EmptyState).
* Create centralized API client with automatic token injection and error normalization.

## Phase 7: Feature-by-Feature Frontend Rebuild
* Reorganize into feature modules:
  * `features/dashboard/`: Real operational metrics from `/analytics/dashboard`.
  * `features/messages/`: Server-side paginated tables, search, status filters, Gmail preview drawer.
  * `features/campaigns/`: Campaign management, recipient parsing, status indicators.
  * `features/domains/`: DNS setup, live diagnostic badges, registrar toggles.
  * `features/templates/`: Reusable template manager with dot-notation variable evaluation.
  * `features/wallet/`: Authoritative balance, transaction ledger, top-up modal.
  * `features/approvals/`: Dedicated admin review queue with 1-click approve/refund.

## Phase 8: Automated Test Suite Implementation
* Backend unit tests: wallet debit/refund, tenant isolation, domain DNS verification, template interpolation.
* Backend integration tests: API endpoints, pagination, security guards.
* Frontend tests: component rendering, pagination controls, Gmail preview.

## Phase 9: Infrastructure & Deployment Hardening
* Update Docker configurations, health checks, and turnkey deploy scripts.

## Phase 10: Final Verification & Delivery Report
* Run full test suites, TypeScript compilation, and produce `docs/FINAL_REFACTOR_REPORT.md`.
