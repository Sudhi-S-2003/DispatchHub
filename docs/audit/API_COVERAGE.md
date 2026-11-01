# DispatchHub: API Coverage & Endpoint Audit

**Status**: Baseline Endpoint Analysis  
**Audit Target**: REST API Endpoints vs Required Feature Functionality

---

## 1. Existing vs Required API Endpoint Map

| Module | Method | Endpoint Path | Current Implementation Status | Issues / Deficiencies | Action Required |
| :--- | :--- | :--- | :---: | :--- | :--- |
| **Auth** | `POST` | `/api/v1/auth/login` | Implemented | Auto-provisions without password/secret. | Add password / API key verification. |
| **Auth** | `GET` | `/api/v1/auth/me` | Implemented | Works, but no refresh token strategy. | Standardize session response. |
| **Accounts**| `GET` | `/api/v1/accounts` | Implemented | Missing role check (clients can list all accounts). | Restrict to `ADMIN` role. |
| **Accounts**| `POST` | `/api/v1/accounts` | Implemented | Admin only. | Retain and harden validation. |
| **Domains** | `GET` | `/api/v1/domains` | Implemented | Tenant-scoped. | Add pagination and sorting. |
| **Domains** | `POST` | `/api/v1/domains` | Implemented | Works. | Persist verification history. |
| **Domains** | `POST` | `/api/v1/domains/:id/verify` | Implemented | Works. | Record actual vs expected DNS. |
| **Domains** | `DELETE`| `/api/v1/domains/:id` | **Missing** | Cannot delete unverified/stale domains. | Implement domain deletion. |
| **Templates**| `GET` | `/api/v1/templates` | Implemented | Basic pagination. | Add category filtering and search. |
| **Templates**| `POST` | `/api/v1/templates` | Implemented | Works. | Add variable schema validation. |
| **Templates**| `POST` | `/api/v1/templates/preview`| Implemented | Works. | Add HTML sanitization. |
| **Messages**| `POST` | `/api/v1/messages/send-single`| Implemented | Insecure `accountId` parameter. | Secure tenant identity resolution. |
| **Messages**| `POST` | `/api/v1/messages/campaign` | Implemented | Uses in-memory `setImmediate`. | Migrate to BullMQ queue workers. |
| **Messages**| `GET` | `/api/v1/messages` | Implemented | Basic pagination. | Add cursor pagination & date filters. |
| **Messages**| `GET` | `/api/v1/messages/:id` | **Missing** | Cannot inspect single message directly. | Implement `GET /messages/:id`. |
| **Campaigns**| `GET` | `/api/v1/campaigns` | **Missing** | Campaigns only listed indirectly via messages. | Implement `GET /campaigns`. |
| **Campaigns**| `GET` | `/api/v1/campaigns/:id` | **Missing** | Cannot inspect campaign details. | Implement `GET /campaigns/:id`. |
| **Campaigns**| `POST`| `/api/v1/campaigns/:id/pause`| **Missing**| Cannot manually pause campaign. | Implement pause/resume controls. |
| **Approvals**| `GET` | `/api/v1/campaigns/pending-approvals` | **Missing** | Approvals UI filters 50 messages in JS! | Implement dedicated query endpoint. |
| **Analytics**| `GET` | `/api/v1/analytics/dashboard` | **Missing** | UI computes fake metrics on 10 messages. | Implement PostgreSQL aggregation endpoint. |
| **Webhooks** | `POST` | `/api/v1/webhooks/postal` | **Missing** | No delivery event tracking. | Implement Postal webhook receiver. |
| **Health** | `GET` | `/api/v1/health` | **Missing** | No liveness/readiness probes. | Implement Terminus health check. |
