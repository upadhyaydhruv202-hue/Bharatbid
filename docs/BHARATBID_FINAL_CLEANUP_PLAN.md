# BharatBid — Final cleanup plan

Audit date: 2026-08-31. Read-only inspection of the existing Slices 0–11 repository. No architecture rewrite.

## BharatBid-required files/folders

| Path | Why |
| --- | --- |
| `backend/src/problem/` | Domain services, seed, verification adapters, reports |
| `backend/src/controllers/bharatbid.controller.ts` | HTTP |
| `backend/src/routes/bharatbid.routes.ts` | `/api/v1` BharatBid |
| `backend/src/repositories/` (tender/bidder/bid/*) | Persistence |
| `frontend/src/pages/bharatbid/` | Product UI |
| `frontend/src/components/bharatbid/` | Evidence/verification/review/intelligence panels |
| `frontend/src/services/bharatbid.ts` | API client |
| `frontend/src/layouts/AppLayout.tsx` | SIH navigation |
| `frontend/src/pages/LoginPage.tsx` | Sign-in |
| `database/prisma/` (BharatBid models + **all** migrations) | Schema; do not squash |

## Shared infrastructure required by BharatBid

Auth, JWT, RBAC, audit, storage, documents, AI extraction, PDF renderer, notifications, jobs/queues, Prisma, config, logging, validation, errors, security middleware, workers, Docker, testing factories.

BharatBid `problem/` does **not** import Copilot, RAG, Anomaly, Intents, Automation, or Odoo.

## Clearly unused Starter Kit **product** modules (frontend)

These are not in SIH nav. They remain routable if typed. They are not used by BharatBid pages.

| Path | Routes | Tests |
| --- | --- | --- |
| `frontend/src/pages/CopilotPage.tsx` | `/copilot` | no dedicated page test (CopilotChat is UI kit) |
| `frontend/src/pages/RagPage.tsx` | `/rag` | `RagPage.test.tsx` |
| `frontend/src/pages/AnomalyPage.tsx` | `/anomalies` | `AnomalyPage.test.tsx` |
| `frontend/src/pages/IntentsPage.tsx` | `/intents` | `IntentsPage.test.tsx` |
| `frontend/src/pages/AutomationsPage.tsx` | `/automations` | `AutomationsPage.test.tsx` |
| `frontend/src/pages/UiKitPage.tsx` | `/ui` | `gallery.test.tsx` |
| `frontend/src/pages/DashboardPage.tsx` | `/dashboard` already redirects | `gallery.test.tsx` |

`HomePage.tsx` is already BharatBid landing copy, not kit home. Command Center should be the primary landing (`/` → `/bharatbid`).

## Possibly unused backend modules (require tracing)

| Module | Wired in `app.ts` / `v1.routes.ts` | Prisma models | Tests | Verdict |
| --- | --- | --- | --- | --- |
| Copilot | Yes | `CopilotConversation`, `CopilotMessage` | unit + HTTP | **Unsafe to delete** without rewriting `createApp`, routes, and leaving unused tables (migrations must stay) |
| RAG | Yes | `RagDocument`, `RagChunk` | unit + HTTP | Unsafe to delete |
| Anomaly | Yes | `AnomalyFinding` | unit + HTTP | Unsafe to delete |
| Intents | Yes | none dedicated | unit + HTTP | Unsafe to delete (app.ts + feature flags) |
| Automation | Yes | `AutomationRule` + executions | unit + HTTP | Unsafe to delete |
| Odoo | Yes | none | unit + HTTP | Unsafe to delete (health/readiness + routes) |

Deleting these would require a large `app.ts` refactor, dropping HTTP tests, and either orphan Prisma tables or new destructive migrations — **forbidden**. They stay as dormant, feature-flagged platform APIs.

## Tests that reference product frontend pages

* `gallery.test.tsx` → DashboardPage, UiKitPage
* `RagPage.test.tsx`, `AnomalyPage.test.tsx`, `IntentsPage.test.tsx`, `AutomationsPage.test.tsx`
* `hackathon-clients.test.ts` → frontend service clients for copilot/rag/anomaly/automation
* `features.test.tsx` — already asserts Copilot is **not** in the sidebar

## Routes

`App.tsx` still registers `/ui`, `/copilot`, `/intents`, `/rag`, `/anomalies`, `/automations`. `/dashboard` redirects. `/notifications` is kit preferences (BharatBid notifications links here).

Backend `/api/v1/copilot|rag|anomalies|intents|automations|odoo` remain registered.

## Configuration

Feature flags `FEATURE_COPILOT`, `FEATURE_RAG`, etc. in `.env.example`. Defaults are typically off. Do not remove flags that `createApp` still reads.

## Files **safe to remove** (after dropping routes + tests)

* Frontend kit product pages listed above
* Matching page tests
* Frontend-only service files **if** nothing else imports them (`copilot.ts`, `rag.ts`, `anomaly.ts`, `intents.ts`, `automation.ts`) after page removal — confirm with grep
* `hackathon-clients.test.ts` if those clients are deleted

## Files **unsafe to remove**

* Entire `backend/src/copilot|anomaly|intents|automation|integrations/odoo|integrations/rag`
* Prisma models and **all** migrations
* Auth, storage, documents, PDF, notifications, jobs, AI core
* BharatBid domain
* `frontend/src/ui/` design system (including AI primitives used by tests)

## Files requiring refactor before removal

* `App.tsx` route list
* `frontend/src/pages/bharatbid/NotificationsPage.tsx` link to `/notifications`
* `gallery.test.tsx`
* Any FeatureGate-only usage

## Execution order

1. Remove frontend kit product routes/pages/tests; redirect unknown kit URLs to Command Center.
2. `/` → Command Center (SessionGate → login).
3. Branding subtitle: Procurement Intelligence & Evidence-Based Bid Evaluation.
4. Start Postgres/Redis via `npm run deps:up`, migrate, seed, `npm run dev`.
5. HTTP walkthrough against live API + UI smoke.
6. Run unit + HTTP tests with `DATABASE_URL`.
7. Document runtime in `docs/BHARATBID_FINAL_RUNTIME_VERIFICATION.md`.

## Final execution status (31 August 2026)

Completed in place. No second application, no migration rewrite, no live government APIs.

**Removed (frontend product chrome only):** Copilot, RAG, Anomaly, Intents, Automations, Home, Dashboard, and UI gallery pages plus their client services. Kit URLs redirect to Command Center.

**Retained:** backend Copilot/RAG/Anomaly/Intents/Automation/Odoo (wired in `createApp`, Prisma-backed, feature-flagged). Auth, RBAC, audit, storage, documents, PDF, notifications, jobs, AI extraction.

**Runtime:** Docker Postgres + Redis healthy. `npm run dev` serves BharatBid at http://127.0.0.1:5173 with API http://127.0.0.1:5000. HTTP/API tests ran against `hackathon_test`. See `docs/BHARATBID_FINAL_RUNTIME_VERIFICATION.md`.
