# DispatchHub — Complete Next.js Frontend Error & Stability Audit

**Document Version**: 1.0.0  
**Audit Date**: November 1, 2026  
**Status**: Comprehensive Stability & Error Resilience Audit  
**Target Environment**: Next.js 14 App Router, React 18, TypeScript, TailwindCSS

---

## 1. Executive Summary

DispatchHub's frontend provides multi-tenant email queue orchestration, universal DNS verification, live Gmail rendering, and real-time ledger accounting. While functional in happy-path scenarios, an in-depth reliability audit revealed significant vulnerabilities in error handling, component resilience, asynchronous lifecycles, and failure recovery.

Prior to this refactor:
1. **Zero Route & Global Error Boundaries**: A single rendering error in any component crashes the entire page into a blank screen or unhandled Next.js error page.
2. **Fragile Fetch Client**: `api.ts` lacked request timeouts, abort signal handling, error categorization, and safe retry policies for transient network drops.
3. **Silent Failures**: Pages such as `messages/page.tsx` swallowed API errors in `console.error` without updating component state, leaving users staring at blank tables with no explanation.
4. **Race Conditions & Lifecycle Leaks**: Async data fetching lacked `AbortController` cancellation or mounted status checks, risking state updates on unmounted components and race conditions upon fast navigation or filtering.
5. **Sensitive Log Leaks**: Errors dumped raw server payloads into browser consoles, exposing auth tokens, API keys, and email contents.

---

## 2. Identified Vulnerabilities, Root Causes & Remediation

| Issue ID | Category | Affected Files | Severity | Root Cause | Proposed Fix |
|---|---|---|---|---|---|
| **ERR-01** | Boundary | `src/app/error.tsx`, `src/app/global-error.tsx`, `src/app/not-found.tsx` | **CRITICAL** | Next.js App Router error handling files were completely absent. Unhandled exceptions crash the whole route. | Implement `error.tsx` (route segment boundary with `reset()`), `global-error.tsx` (root HTML fallback), and `not-found.tsx` (styled 404). |
| **ERR-02** | Component | `src/components/ui/feedback/ErrorBoundary.tsx` | **HIGH** | No React ErrorBoundary class existed for isolating client subtrees (e.g. GmailPreview, telemetry widgets). | Create reusable, accessible `ErrorBoundary` component with custom fallback or standard `ErrorState` + retry callback. |
| **ERR-03** | Network / API | `src/lib/api.ts` | **CRITICAL** | `fetch` calls had no timeout or `AbortSignal`. If server hangs, UI spinner hangs indefinitely. Network errors throw untyped `TypeError`. | Introduce 15s timeout with `AbortController`, structured `AppError` normalization, and categorized error codes. |
| **ERR-04** | Resilience | `src/lib/api.ts` | **MEDIUM** | Transient network glitches immediately fail idempotent reads (`GET` requests). | Add automated exponential backoff retry policy strictly for safe, idempotent `GET` requests (max 2 retries). Never retry financial or mutating requests. |
| **ERR-05** | Auth / Session | `src/lib/api.ts`, `src/lib/auth-context.tsx` | **HIGH** | 401 Unauthorized responses were not intercepted. Expired sessions caused cascading API failures without graceful re-auth triggers. | Add centralized unauthorized event dispatcher in `api.ts` that `AuthContext` listens to, invalidating expired credentials safely. |
| **ERR-06** | UX / State | `src/app/messages/page.tsx` | **HIGH** | `fetchMessages()` caught errors and only printed to `console.error`. No error state was displayed, leaving users with misleading empty tables. | Add explicit `error` state, `ErrorState` presentation with retry button, and loading skeletons. |
| **ERR-07** | Lifecycle | `src/app/page.tsx`, `src/app/wallet/page.tsx`, `src/app/domains/page.tsx` | **MEDIUM** | Async `useEffect` hooks lacked cancellation. Rapid tab switching or filter clicks triggered race conditions and unmounted state updates. | Implement `AbortController` in all data-fetching `useEffect` hooks and bind to API request abort signals. |
| **ERR-08** | Security / Logging | `src/lib/errors/error-logger.ts` | **HIGH** | Error logs in development and production dumped full response payloads containing sensitive user emails, API keys, and tokens. | Create `error-logger.ts` with automated redaction of `apiKey`, `token`, `password`, `secret`, `authorization`, and DKIM keys. |
| **ERR-09** | Validation | `src/app/compose/page.tsx` | **MEDIUM** | `JSON.parse` and campaign recipient parsing showed generic error toasts without preserving form state or mapping field-level validation errors. | Implement field-level error mapping, inline feedback, and preserve all entered data across failures. |
| **ERR-10** | Hydration | `src/components/` & `src/app/` | **LOW** | Client timezone rendering of `Date` timestamps in SSR could cause hydration mismatch. | Ensure date formatting occurs safely on client-side or with consistent UTC/ISO rendering guards. |

---

## 3. Architecture Blueprint for Stability

```
src/
├── app/
│   ├── error.tsx                 # Route-level boundary with reset()
│   ├── global-error.tsx          # Root-level catastrophic boundary
│   └── not-found.tsx             # 404 handler with navigation
├── components/
│   └── ui/
│       └── feedback/
│           ├── ErrorBoundary.tsx # Reusable React component boundary
│           ├── ErrorState.tsx    # Styled error display with retry
│           ├── LoadingState.tsx  # Accessible loading skeleton
│           └── EmptyState.tsx    # Empty state with action
├── lib/
│   ├── errors/
│   │   ├── error.types.ts        # AppError, ErrorCode, ValidationErrorMap
│   │   ├── error-messages.ts     # User-friendly human error dictionary
│   │   ├── error-handler.ts      # Error normalization & categorization
│   │   └── error-logger.ts       # Secure credential redaction logger
│   └── api.ts                    # Timeout, retry, 401 interception, AbortSignal
```

---

## 4. Verification & Testing Strategy

1. **Unit Tests**:
   - Error normalization for HTTP 400, 401, 403, 404, 409, 422, 429, 500, 502, 503, network failure, and timeouts.
   - Redaction safety in `error-logger.ts`.
   - Retry logic verification: idempotent `GET` retries vs non-idempotent non-retries.
2. **React Component Tests**:
   - `ErrorBoundary` catching child component crashes and triggering recovery.
3. **Build & Route Verification**:
   - Next.js production build (`npm run build`) ensuring all 12 routes and error boundaries compile cleanly.
