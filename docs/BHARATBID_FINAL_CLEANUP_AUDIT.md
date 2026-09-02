# BharatBid — Final cleanup audit

Forensic unused-Starter-Kit cleanup after Slices 0–12. No workflow changes. No Prisma history rewrite. No `db:reset`. No git commit.

## Files / folders reviewed

Entire repository: `frontend/src`, `backend/src`, `backend/tests`, `database/prisma`, `docs`, `infra`, `workers`, root configs, CI, Docker Compose, `.env.example`.

Prior purges already deleted Copilot, RAG, Odoo, anomaly, intents, automation product modules, kit pages (`HomePage`, `DashboardPage`, `UiKitPage`), and kit HTTP routers.

## Deleted files

| File | Why |
| --- | --- |
| `frontend/src/hooks/README.md` | Empty kit placeholder folder; no hooks |
| `frontend/src/context/README.md` | Empty kit placeholder; auth/theme live elsewhere |
| `frontend/src/utils/README.md` | Empty kit placeholder; no utils |
| `frontend/src/services/health.ts` | Unused frontend health client |
| `frontend/src/services/files.ts` | Unused generic `/api/v1/files` client; bid evidence uses BharatBid document APIs |
| `frontend/src/ui/primitives/Radio.tsx` | Unused UI-kit primitive |
| `frontend/src/ui/primitives/Tooltip.tsx` | Unused UI-kit primitive |
| `frontend/src/ui/dashboard/DashboardLayout.tsx` | Unused generic dashboard chrome |
| `frontend/src/ui/data/FilterPanel.tsx` | Unused UI-kit filter chrome |
| `frontend/src/features/FeatureGate.tsx` | Unused kit feature-gate wrapper |
| `backend/src/controllers/index.ts` | Unused incomplete barrel; app imports controllers by path |
| `backend/src/routes/index.ts` | Unused barrel; app imports `health.routes` / `v1.routes` directly |
| `backend/src/services/index.ts` | Unused barrel; nothing imported it |
| `backend/src/services/notification.service.ts` | Unused re-export of `notifications/` |
| `backend/src/services/notification.schemas.ts` | Unused re-export of `notifications/` |
| `docs/BHARATBID_STARTER_KIT_AUDIT.md` | Slice 0 kit forensic inventory; not required by runtime, build, or tests |

Unused exports removed from files that remain (not whole-file deletes): `ChartArea`, `SimpleLineChart`, `NotificationPanel`, `TableSection`, `CardActions`, `usePrefersReducedMotion`. Exclusive tests for those pieces were updated.

## Deleted folders

* `frontend/src/hooks/`
* `frontend/src/context/`
* `frontend/src/utils/`

## Dependencies removed

None. Remaining packages are used by BharatBid or shared infrastructure it calls. `npm install` was not required.

## Routes removed

None. Active routes unchanged. Catch-all still redirects to `/bharatbid`. `/notifications` remains as channel preferences linked from `/bharatbid/notifications`.

## Backend modules removed

None in this pass. Copilot / RAG / Odoo / anomaly / intents / automation were already gone. Remaining HTTP (`/ai`, `/documents`, `/pdf`, `/reports`, `/files`, `/jobs`, `/auth`, `/audit`) is used by BharatBid or required infrastructure tests.

## Frontend modules removed

Unused kit primitives, empty placeholder directories, unused generic health/files clients, unused `FeatureGate` and `DashboardLayout`.

## Documentation removed

No entire runtime docs deleted. Stale Copilot/Odoo/automation/RAG claims were corrected in:

* `docs/jobs.md`, `docs/security.md`, `docs/notifications.md`, `docs/testing.md`, `docs/ui.md`, `docs/database.md`, `docs/reports.md`, `docs/scheduler.md`, `docs/ai-guardrails.md`
* `frontend/src/ui/README.md`, `frontend/src/features/README.md`

Historical slice docs were **retained**. The Slice 0 starter-kit forensic audit was removed after kit product modules were gone.

## Configuration removed

None from `.env.example` (already cleaned). Local `.env` may still contain unused `ODOO_*` / `FEATURE_COPILOT` lines; they are unread by config schema and were not edited (gitignored local file).

## Intentionally retained legacy

| Item | Classification | Reason |
| --- | --- | --- |
| Compose `name: hackathon-starter-kit`, image names, `POSTGRES_DB=hackathon` | E / B | Renaming detaches Docker volumes and empties the demo DB. Asserted by `backend/tests/infra/docker.test.ts` |
| Historical Prisma create migrations for dropped kit tables | C | Additive drop migration already applied; history must not be rewritten |
| Generic `/api/v1/ai`, `/documents`, `/pdf`, `/reports`, `/files`, `/jobs` | A / B | Document extraction, evaluation PDF, storage, jobs |
| `/notifications` preferences page | A | Linked from BharatBid notification center |
| Scheduler, OTP, SMS, email adapters | B | Wired in `createApp`; flags off by default except as configured |
| AI guardrail `executeOdoo` denylist | B | Safety regex, not an Odoo product |
| Tests asserting Copilot/Automations nav is absent, readiness has no `odoo` | D | Prevents kit chrome from returning |
| `LICENSE` AGPL-3.0 | E | Legal file |
| Slice / purification markdown | E | Maintainability history of BharatBid work |
| `frontend/src/ui` primitives still used by BharatBid | A | AppShell, tables, KPIs, forms |

## Prisma

No schema or migration changes.

## Validation

Recorded in the final status report after lint, typecheck, tests, and builds.
