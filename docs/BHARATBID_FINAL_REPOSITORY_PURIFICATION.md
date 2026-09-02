# BharatBid — Final repository purification

SIH Problem Statement **26100**. This report records the SIH-only cleanup after the earlier product-module purge (see [BHARATBID_FINAL_REPOSITORY_AUDIT.md](BHARATBID_FINAL_REPOSITORY_AUDIT.md)).

No application rebuild. No framework change. No demo-database reset.

## Deleted Starter Kit Files

* `AGENTS.md` — generic starter-kit engineering instructions; not imported by runtime or build
* `HACKATHON_PLAYBOOK.md` — generic kit playbook
* `MODULE_REGISTRY.md` — kit module catalog; not imported by runtime or build
* `ARCHITECTURE.md` — generic kit architecture; replaced by [BHARATBID_ARCHITECTURE.md](BHARATBID_ARCHITECTURE.md)
* `modules/problem/README.md` — pointer-only leftover (runtime is `backend/src/problem/`)
* `frontend/src/services/hackathon-clients.test.ts` — renamed to `shared-clients.test.ts`

## Deleted Starter Kit Folders

* `modules/` — contained only the unused boundary README; BharatBid runtime is `backend/src/problem/`

`docker-data/` was **not** deleted from the local workspace. It is generated Docker/PostgreSQL volume data, listed in `.gitignore`, and must stay so the current demo database is not destroyed. Recreate only with `npm run deps:up` (empty volume) then `npm run db:migrate` and `npm run db:seed` — that would wipe the live demo and was not performed.

`node_modules/` remains gitignored generated output.

## Deleted Backend Modules

None in this pass. Copilot, RAG, Odoo, anomaly, intents, and automation were already removed in the previous purge.

E2E `backend/tests/e2e/user-workflow.e2e.test.ts` no longer calls `/api/v1/automations/*` (those routes do not exist). It now covers register → authorize → notify → audit.

## Deleted Frontend Modules

None in this pass. Kit product pages (Copilot, RAG, UI gallery, generic dashboard/home) were already removed. Active routes are login, Command Center, and BharatBid workspaces. `/notifications` remains as channel-preference UI linked from `/bharatbid/notifications`.

## Deleted Database Models

None in this pass. Starter-kit product tables were already dropped by the additive migration `20260831010000_drop_starter_kit_product_tables`. Historical create migrations were left intact.

No `db:reset`. Demo database name remains `hackathon` on port 5433.

## Deleted Dependencies

None. Remaining packages (Prisma, Express, BullMQ, pdf-lib, AWS S3 SDK, nodemailer, etc.) are used by BharatBid or shared infrastructure BharatBid calls.

Root npm package renamed `hackathon-starter-kit` → `bharatbid-ai`. Workspace packages renamed `@hackathon/*` → `@bharatbid/*`.

## Deleted Routes

No additional frontend product routes in this pass. Catch-all still redirects to `/bharatbid`.

Removed from the representative E2E workflow: `POST /api/v1/automations/rules`, `POST /api/v1/automations/events`, `GET /api/v1/automations/executions`.

## Deleted Tests

* Automation steps inside the E2E workflow (replaced with notification authorization)
* `frontend/src/services/hackathon-clients.test.ts` (replaced by `shared-clients.test.ts`)

BharatBid tests (auth, RBAC, tenders, bids, documents, verification, review, intelligence, evaluation, Command Center, notifications, reporting) were kept.

## Deleted Documentation

* `AGENTS.md`
* `HACKATHON_PLAYBOOK.md`
* `MODULE_REGISTRY.md`
* `ARCHITECTURE.md`

Infrastructure docs under `docs/` were **rebranded**, not deleted, because BharatBid still uses those systems (auth, Prisma, jobs, PDF, Docker). Slice history under `docs/BHARATBID_SLICE_*.md` and the Slice 0 audit remain as historical records (Slice 0 file is labelled historical).

## Deleted Assets

None. No kit gallery or Copilot assets remained.

## Retained Shared Infrastructure

| Component | Why BharatBid needs it |
| --- | --- |
| Authentication / JWT | Officer and reviewer login |
| RBAC | `tenders.*`, `bidders.*`, `bids.*`, notifications, reports |
| Audit | Officer/reviewer activity trail |
| Storage | Bid document files |
| Document processing / extraction | Seeded and uploaded bid evidence |
| AI adapter + guardrails | Optional extraction (untrusted structured output) |
| PDF / reports | Evaluation decision-support PDF |
| Notifications | In-app officer notifications |
| Jobs + `workers/` | Extraction, PDF, notification dispatch (in-process for `npm run dev`; Compose worker for Docker) |
| Prisma / PostgreSQL / migrations | Persistence of all BharatBid models |
| Redis | Rate limits, optional BullMQ |
| Docker Compose / `infra/` | Local Postgres, Redis, healthchecks, smoke script |
| `frontend/src/ui` | AppShell, tables, KPIs, charts used by Command Center and workspaces |
| Validation, errors, CI, eslint, prettier | Correctness of the SIH submission |
| `manager` / `staff` / `user` roles | Default register role and HTTP tests; seed demo accounts are officer/reviewer/admin |

## Remaining Questionable Files

| Item | Why it remains |
| --- | --- |
| Compose `name: hackathon-starter-kit` | Renaming creates a **new** Compose project and detaches existing local containers. Runtime identity is `APP_NAME=BharatBid`. Asserted by `backend/tests/infra/docker.test.ts`. |
| Docker image/container names `hackathon-backend`, `hackathon-postgres` | Same volume/container continuity reason |
| `POSTGRES_DB=hackathon` / `hackathon_test` | Changing the database name would point the demo at an empty database |
| `LICENSE` (AGPL-3.0) | Legal file from the original stack; not kit product chrome |
| Historical `docs/BHARATBID_SLICE_*.md` and Slice 0 audit | Slice history requested to be kept; Slice 0 is labelled historical |
| Generic `/api/v1/ai`, `/documents`, `/pdf`, `/reports`, `/files`, `/jobs` | Called by BharatBid document/report/job flows |
| `/notifications` (channel preferences) | Linked from BharatBid notifications |
| `DashboardLayout` in `frontend/src/ui` | Layout helper covered by UI tests; Command Center uses `KpiCard` / charts / `ActivityFeed` directly |
| `executeOdoo` in AI tool blocklist regex | Safety denylist, not an Odoo product feature |
| `.cursor/rules/hackathon-starter-kit.mdc` ignore assertion | Proves local Cursor rules stay untracked |

## Docker data

`docker-data/` is local runtime volume data. It is gitignored. It was not deleted so the current SIH demo database remains intact.

To recreate on a **new** machine: `npm run deps:up`, `npm run db:migrate`, `npm run db:seed`.
