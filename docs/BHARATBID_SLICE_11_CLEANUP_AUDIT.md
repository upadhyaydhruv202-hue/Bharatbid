# BharatBid — Slice 11 Cleanup Audit

Forensic classification of Hackathon Starter Kit modules before any SIH cleanup. Runtime domain remains `backend/src/problem/`. **No database schema changes. No parallel architecture.**

Audit date: 2026-08-31.

Classification legend:

* **KEEP — BharatBid feature** — required for Slices 1–10 product behaviour
* **KEEP — Shared infrastructure** — auth, RBAC, storage, jobs, etc. used by BharatBid
* **KEEP — Build/runtime dependency** — compile, Docker, CI, Prisma
* **KEEP — Development/testing dependency** — tests, galleries, factories
* **REMOVE — Proven unused** — no imports, routes, scripts, or tests require it for SIH
* **REVIEW — Dependency uncertain** — retain; do not delete

## Classification table

| Path | Classification | Reason | References Found | Action |
| ---- | -------------- | ------ | ---------------- | ------ |
| `backend/src/problem/` | KEEP — BharatBid feature | Domain services (tender, bid, verification, review, attention, evaluation, operations) | `bharatbid.routes.ts`, `app.ts`, tests | Keep |
| `frontend/src/pages/bharatbid/` | KEEP — BharatBid feature | Command Center and procurement UI | `App.tsx` | Keep |
| `frontend/src/components/bharatbid/` | KEEP — BharatBid feature | Bid evidence/verification/review/intelligence panels | Bid detail + tests | Keep |
| `frontend/src/services/bharatbid.ts` | KEEP — BharatBid feature | API client | BharatBid pages | Keep |
| `backend/src/auth/` | KEEP — Shared infrastructure | JWT session auth | All protected routes | Keep |
| `backend/src/rbac/` | KEEP — Shared infrastructure | Permissions including `tenders.*`, `bids.*` | Controllers, seed | Keep |
| `backend/src/audit/` | KEEP — Shared infrastructure | Officer/system activity | Operations, evaluation reports | Keep |
| `backend/src/notifications/` | KEEP — Shared infrastructure | In-app inbox reused by Slice 10 | `notify.ts`, header bell | Keep |
| `backend/src/integrations/storage/` | KEEP — Shared infrastructure | Document bytes, report PDFs | Bid documents, reports | Keep |
| `backend/src/integrations/documents/` | KEEP — Shared infrastructure | Upload, extract, preview | Slice 4 | Keep |
| `backend/src/integrations/pdf/` | KEEP — Shared infrastructure | PDF renderer | Slice 10 reports | Keep |
| `backend/src/integrations/reports/` | KEEP — Shared infrastructure | Async report jobs (kit) | Wired in `app.ts`; BharatBid uses renderer directly | Keep |
| `backend/src/integrations/ai/` | KEEP — Shared infrastructure | Extraction / document intelligence | Document pipeline | Keep |
| `backend/src/jobs/` | KEEP — Shared infrastructure | Extraction and background work | Workers, document service | Keep |
| `backend/src/security/` | KEEP — Shared infrastructure | CORS, rate limits, SSRF, secret scan | `app.ts` | Keep |
| `database/prisma/` | KEEP — Build/runtime dependency | Schema + migrations + seed | All persistence | Keep; **no squash/delete** |
| `workers/` | KEEP — Shared infrastructure | Job consumer | Compose, `dev:all` | Keep |
| `frontend/src/ui/` | KEEP — Shared infrastructure | Design system used by BharatBid | All pages | Keep |
| `frontend/src/auth/` | KEEP — Shared infrastructure | AuthProvider, SessionGate | BharatBid pages | Keep |
| `frontend/src/pages/LoginPage.tsx` | KEEP — BharatBid feature | Sign-in | `/login` | Keep; rebrand |
| `frontend/src/pages/HomePage.tsx` | KEEP — BharatBid feature | Product landing | `/` | Keep; rewrite copy |
| `frontend/src/pages/DashboardPage.tsx` | KEEP — Development/testing dependency | Placeholder fake KPIs; `gallery.test.tsx` imports it | `/dashboard` was a second dashboard | **Hide from SIH nav; redirect `/dashboard` → `/bharatbid`**. Do not delete file (tests). |
| `frontend/src/pages/UiKitPage.tsx` | KEEP — Development/testing dependency | Component gallery | `/ui`, `gallery.test.tsx` | Hide from SIH nav; keep route |
| `frontend/src/pages/CopilotPage.tsx` | REVIEW — Dependency uncertain | Optional kit Copilot UI; feature-flagged; has tests | `/copilot`, `FEATURE_COPILOT` | Keep module; hide from SIH nav |
| `frontend/src/pages/IntentsPage.tsx` | REVIEW | Optional NL actions UI | `/intents` | Keep; hide from SIH nav |
| `frontend/src/pages/RagPage.tsx` | REVIEW | Optional RAG UI | `/rag` | Keep; hide from SIH nav |
| `frontend/src/pages/AnomalyPage.tsx` | REVIEW | Optional anomaly UI | `/anomalies` | Keep; hide from SIH nav |
| `frontend/src/pages/AutomationsPage.tsx` | REVIEW | Optional automation UI | `/automations` | Keep; hide from SIH nav |
| `frontend/src/pages/NotificationsPage.tsx` | KEEP — Shared infrastructure | Inbox + channel preferences | `/notifications`; BharatBid notifications links here | Keep route; SIH nav uses `/bharatbid/notifications` |
| `frontend/src/services/copilot.ts` etc. | KEEP — Shared infrastructure | Clients for optional kit pages | Matching pages + `hackathon-clients.test.ts` | Keep |
| `backend/src/integrations/odoo/` | REVIEW | Not used by BharatBid domain; wired, tested, feature-flagged | `v1.routes.ts`, HTTP tests | Keep infrastructure; do not delete |
| `backend/src/copilot/` | REVIEW | Optional assistant | Feature flag + tests | Keep; hide UI |
| `backend/src/intents/` | REVIEW | Optional NL actions | Feature flag + tests | Keep; hide UI |
| `backend/src/integrations/rag/` | REVIEW | Optional semantic search | Feature flag + tests | Keep; hide UI |
| `backend/src/anomaly/` | REVIEW | Optional statistical insights | Feature flag + tests | Keep; hide UI |
| `backend/src/automation/` | REVIEW | Optional rules engine | Feature flag + tests | Keep; hide UI |
| `backend/src/otp/` | KEEP — Shared infrastructure | Auth OTP | Auth routes | Keep |
| `backend/src/integrations/email/` | KEEP — Shared infrastructure | Notification channel | Notification service | Keep |
| `backend/src/integrations/sms/` | KEEP — Shared infrastructure | Notification channel | Feature flag | Keep |
| `modules/problem/` | KEEP — BharatBid feature | Boundary README pointing at `backend/src/problem/` | AGENTS.md | Keep |
| `docs/` kit operator docs | KEEP — Development/testing dependency | Module runbooks | README links | Keep; do not delete |
| `infra/`, `docker-compose.yml`, `.github/` | KEEP — Build/runtime dependency | Demo + CI | package scripts | Keep |
| Fake `DashboardMetric` / synthetic activity tables | N/A | Never created | — | Do not add |

## Destructive cleanup decision

**No Starter Kit backend modules are deleted.** They are imported by `app.ts`, covered by unit/HTTP tests, and/or required indirectly (AI extraction, jobs, PDF, notifications).

**Frontend product surface for SIH:** Command Center + procurement workspaces only. Kit gallery and optional AI/ops pages remain routable for developers and tests but are removed from the primary sidebar.

**Redirect (not delete):** `/dashboard` → `/bharatbid` so judges cannot confuse placeholder metrics with Command Center KPIs.

## Post-cleanup status

**Implementation (2026-08-31):**

| Path | Final action | Verification |
| --- | --- | --- |
| `frontend/src/layouts/AppLayout.tsx` | SIH procurement nav only; kit pages hidden | `AppLayout.test.tsx` |
| `/dashboard` | Redirect to `/bharatbid` | `App.tsx` |
| `frontend/src/pages/DashboardPage.tsx` | **Retained** (gallery tests) | `gallery.test.tsx` |
| `frontend/src/pages/UiKitPage.tsx` | Route kept; off sidebar | `/ui` |
| Copilot / Intents / RAG / Anomaly / Automations pages + backend | **REVIEW — retained** | Feature flags + existing tests |
| Odoo backend | **REVIEW — retained** | Not used by BharatBid domain |
| Auth, RBAC, audit, storage, PDF, notifications, jobs | Unchanged keep | Regression tests |

No Prisma migrations. No deleted backend modules.

Deleted files: **none** (forensic keep when tests or indirect runtime depend on the file).

