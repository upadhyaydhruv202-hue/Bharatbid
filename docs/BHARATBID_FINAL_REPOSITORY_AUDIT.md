# BharatBid — Final Repository Audit (Slice 12)

This report records the SIH-only purification of the current repository. Work was done **in place**. Historical Prisma migrations were not rewritten. The demo database was not dropped.

## Retained

### BharatBid product

- Tender management, requirements, bidder profiles, bid submissions, and lifecycle
- Bid documents, versions, archive, authenticated download, extraction, requirement mapping
- GST / MCA / Udyam / GeM **DEMO/MOCK adapter** verification, history, field matching
- Cross-verification (GST↔MCA, GST↔Udyam, MCA↔Udyam) with explainable statuses
- Requirement intelligence / evidence coverage (decision support, not auto-approval)
- Officer review queue, assessments, clarifications, immutable machine findings
- Officer Review Priority / attention factors (review priority, not winner ranking)
- Comparative tender evaluation workspace, officer notes, decisions, history
- Command Center KPIs, search, notifications, activity, deep links
- Evaluation / evidence / verification / review PDF reports with DEMO labelling

### Shared infrastructure BharatBid actually uses

- Auth (JWT, refresh rotation, login rate limits, password hashing)
- RBAC (`procurement_officer`, `reviewer`, plus bootstrap `admin` / `manager` / `staff` / `user`)
- Audit logging and `/api/v1/audit`
- Storage (local / postgres / optional S3), MIME/magic-byte validation, signed downloads
- Document intelligence HTTP + Prisma `Document` / `DocumentExtraction` (used by jobs and generic extraction; BidDocument uses `integrations/documents/document.files`)
- Generic AI HTTP (`FEATURE_AI`) used by document intelligence jobs
- PDF renderer and report jobs used by evaluation reports
- Notifications inbox + dispatch jobs
- Background jobs (email, SMS, PDF, report, AI, document process, cleanup, notification dispatch)
- Prisma + PostgreSQL, Docker Compose Postgres, Redis when configured
- Zod validation, centralized errors, security headers, rate limits

## Deleted

Starter Kit **product** modules with no BharatBid import graph:

| Area | Removed |
| --- | --- |
| Backend domains | `backend/src/copilot`, `anomaly`, `intents`, `automation` |
| Integrations | `backend/src/integrations/odoo`, `integrations/rag` |
| HTTP | Copilot / RAG / anomaly / intents / automation / Odoo controllers and routers |
| Repositories | Copilot, RAG, anomaly, automation repositories |
| Tests | Matching `*.http.test.ts` / `*.db.test.ts` and automation factory |
| Frontend | Copilot chat, kit redirect routes (`/ui`, `/copilot`, `/intents`, `/rag`, `/anomalies`, `/automations`, `/dashboard`) |
| Frontend clients | Unused `pdf.ts`, `reports.ts`, `jobs.ts` (BharatBid reports go through `/api/v1/bharatbid`) |
| Docs | `docs/copilot.md`, `rag.md`, `anomaly.md`, `intents.md`, `automation.md`, `odoo.md` |
| Env | `ODOO_*`, `FEATURE_ODOO/COPILOT/RAG/INTENTS/ANOMALY/AUTOMATION`, `RAG_*`, `ANOMALY_*` |
| Seed | Unrelated `demo.manager` / `demo.staff` / `demo.user` accounts |

## Database retained

- Identity: `User`, `RefreshToken`, `Role`, `Permission`, `UserRole`, `RolePermission`
- Notifications: `Notification`, `NotificationDelivery`, `NotificationPreference`
- Documents / storage: `Document`, `DocumentExtraction`, `StoredFile`, `StoredObject`
- Audit: `AuditEvent`
- BharatBid: `Tender`, `TenderRequirement`, `Bidder`, `BidSubmission`, `BidDocument`, `BidVerification`, `BidCrossVerification`, `BidReviewItem`, `ReviewAssessment`, `ReviewClarification`, `TenderEvaluation`, `EvaluationNote`, `EvaluationDecision`

## Database removed

Additive migration `20260831010000_drop_starter_kit_product_tables`:

- Tables: `copilot_conversations`, `copilot_messages`, `rag_documents`, `rag_chunks`, `anomaly_findings`, `automation_rules`, `automation_executions`, `automation_action_runs`
- Related enums
- Obsolete permission rows (`odoo.*`, `copilot.use`, `rag.use`, `intents.use`, `anomaly.use`, `automations.*`)

Historical create migrations remain in `database/prisma/migrations/`.

## Dependencies removed

No unique npm packages existed solely for Copilot / RAG / Odoo / anomaly / automation (they used `fetch` and the existing AI SDK). Package lockfiles were not reduced by name. After install, unused **code** was removed; no extra visualization or Odoo SDK was present to uninstall.

## Routes removed

**Backend (no longer registered):**

- `/api/v1/copilot/*`
- `/api/v1/rag/*`
- `/api/v1/anomalies/*`
- `/api/v1/intents/*`
- `/api/v1/automations/*`
- `/api/v1/odoo/*`

**Frontend (deleted, not hidden):**

- `/ui`, `/copilot`, `/intents`, `/rag`, `/anomalies`, `/automations`, `/dashboard`

Unknown leftover URLs now redirect to `/bharatbid` (catch-all). Vite still returns HTTP 200 for the SPA shell.

**Remaining product routes:** `/login`, `/notifications` (channel preferences), `/bharatbid` and nested BharatBid pages listed in the slice.

## Infrastructure retained

Auth, RBAC, Prisma, Postgres, Docker, Redis (optional), jobs, storage, PDF, reports HTTP, generic AI HTTP, generic document-intelligence HTTP, notifications, OTP, SMS, scheduler (off by default), audit, security middleware.

## Infrastructure removed

Odoo client, RAG vector store, Copilot tool runtime, intent engine, automation engine, statistical anomaly engine, their feature flags, and their Prisma models.

## Remaining questionable files

These are **not** BharatBid product modules. They remain because the running app still imports them:

| Remaining | Why it stays |
| --- | --- |
| Generic `/api/v1/ai/*` | Document intelligence jobs and `FEATURE_AI` |
| Generic `/api/v1/documents/*` | Extraction/job infrastructure; BidDocument uses `document.files` helpers from the same integration |
| Prisma `Document` / `DocumentExtraction` | Used by document intelligence service and tests |
| Generic `/api/v1/pdf/*` and `/api/v1/reports/*` | Evaluation PDF generation uses the report/PDF services |
| Generic `/api/v1/files/*` and `/api/v1/jobs/*` | Storage downloads and async job status |
| `frontend/src/ui` design system | AppShell, tables, KPIs used by Command Center |
| `frontend/src/pages/NotificationsPage.tsx` at `/notifications` | Channel preferences; Command Center inbox is `/bharatbid/notifications` |
| npm workspace name `hackathon-starter-kit` and Compose project name | Changing Compose name would recreate Docker volumes; runtime identity is `APP_NAME=BharatBid` |
| Historical migrations that originally created Copilot/RAG/anomaly/automation tables | Database history; superseded by the additive drop migration |
| `AGENTS.md` / `ARCHITECTURE.md` / `MODULE_REGISTRY.md` kit wording remnants | Engineering conventions still describe the shared stack; product identity is README + BharatBid docs |
| Secret scanners still matching `ODOO_API_KEY` | Defense-in-depth pattern; no Odoo runtime remains |
| Scheduler module | Shared clock; disabled unless `SCHEDULER_ENABLED=true`; BharatBid does not require it for the SIH demo |

This repository is **not** claimed 100% free of Starter Kit ancestry. Shared infrastructure that BharatBid depends on remains on purpose.

## Seed

BharatBid demo seed (`backend/src/problem/seed.ts`) plus:

- `demo.officer@example.com` / `demo-password`
- `demo.reviewer@example.com` / `demo-password`
- `demo.admin@example.com` for RBAC bootstrap only

All demo content remains DEMO / SYNTHETIC / MOCK.
