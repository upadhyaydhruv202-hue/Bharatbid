# BharatBid — Final runtime verification

Verified on 31 August 2026 against a local Docker PostgreSQL + Redis stack and `npm run dev`. This is the SIH demonstration baseline. No Slice 12 features were added.

## Application startup

Docker Desktop must be running. On Windows, use `127.0.0.1` (not `localhost`) in `DATABASE_URL` so Prisma does not attempt IPv6 and fail with P1001.

```bash
npm install
cp .env.example .env
npm run deps:up
npm run db:migrate
npm run db:seed
npm run dev
```

HTTP/API tests against Postgres (optional, uses a separate `hackathon_test` database):

```bash
cp .env.test.example .env.test
npm run db:test:prepare
npm run test:integration -w backend
```

Do **not** point `DATABASE_URL` for tests at the demo `hackathon` database. Integration tests truncate tables via `resetDatabase()`.

## URLs

| Surface | URL |
| --- | --- |
| Frontend (Vite) | http://127.0.0.1:5173 |
| Command Center | http://127.0.0.1:5173/bharatbid (`/` redirects here) |
| Sign in | http://127.0.0.1:5173/login |
| Backend API | http://127.0.0.1:5000 |
| Health | `GET http://127.0.0.1:5000/health` |
| Ready | `GET http://127.0.0.1:5000/ready` |
| API prefix | `/api/v1` |

Observed on this machine:

* Health service name: **BharatBid**
* Ready: database `configured=true`, `healthy=true`
* Frontend SPA HTML at `/`, `/bharatbid`, and `/login` returns 200 and includes BharatBid branding

## Database setup

* Engine: PostgreSQL 16 via existing Docker Compose (`npm run deps:up`)
* Demo database: `hackathon` on `127.0.0.1:5433`
* Test database: `hackathon_test` on the same instance
* Redis: `127.0.0.1:6379` (healthy; not required for the SIH walkthrough)
* Migrations: all **19** existing Prisma migrations applied with `npm run db:migrate`. History was not rewritten.
* Seed: `npm run db:seed` (`DEMO_MODE` synthetic BharatBid data)

`.env` and `.env.test` are gitignored. Only `.env.example` and `.env.test.example` are committed.

## Demo credentials

Password for all seeded accounts: `demo-password`

| Role | Email |
| --- | --- |
| Procurement officer | `demo.officer@example.com` |
| Reviewer (read-only officer workflows) | `demo.reviewer@example.com` |
| Admin | `demo.admin@example.com` |

These are **DEMO / SYNTHETIC** accounts, not production credentials.

Canonical tender: `GEM/2026/B/CPCL/001` (synthetic). Scenarios A/B/C remain:

* **A** Bayfront — stronger evidence, matched DEMO SOURCE checks
* **B** Delta — mismatch / evidence gap / higher Officer Review Priority
* **C** source limitation / insufficient evidence

## Worker requirements

`npm run dev` starts backend + frontend only. With `JOBS_PROCESS` unset, the API process can consume jobs in-process.

A dedicated worker (`npm run dev:workers` or `npm run dev:all`) is **optional** for SIH. Seeded extraction is already `completed`. PDF evaluation reports are generated synchronously for the officer download path.

## Canonical demo flow (executed)

Live HTTP against the running API + SPA, using seeded officer/reviewer accounts. No browser automation tools were available in this session; UI routes returned 200 HTML and APIs returned live database data.

| Step | Result |
| --- | --- |
| Open login | PASS (`/login` 200) |
| Login as demo officer | PASS |
| Command Center KPIs | PASS (`activeTenders=2`, `submittedBids=12`, `demoLabel=DEMO / SYNTHETIC`, `recentActivity=10`) |
| Open tenders / `GEM/2026/B/CPCL/001` | PASS |
| Requirements | PASS |
| Bid participation / Bayfront bid | PASS |
| Documents + download | PASS (authenticated `text/plain` DEMO file) |
| Verification | PASS (DEMO SOURCE) |
| Cross-checks | PASS |
| Requirement intelligence | PASS |
| Review | PASS |
| Intelligence / Officer Review Priority | PASS |
| Evaluation comparison | PASS |
| Evaluation PDF report | PASS (`application/pdf`) |
| Activity | PASS |
| Notifications | PASS |
| Reviewer cannot create tenders | PASS (403) |
| Reviewer cannot generate reports | PASS (403) |

## Test results

| Suite | Result |
| --- | --- |
| Backend unit (`npm run test:unit -w backend`) | **90 files, 573 passed** |
| Frontend unit (`npm test -w frontend`) | **40 files, 109 passed** |
| Backend HTTP/API against Postgres (`npx vitest run tests` in `backend/`) | **41 files passed, 1 skipped; 228 passed, 8 skipped** |
| Backend lint | PASS |
| Frontend lint | PASS |
| Backend typecheck | PASS |
| Frontend typecheck | PASS |
| Backend production build | PASS |
| Frontend production build | PASS |
| Migrations | 19 applied to `hackathon` and `hackathon_test` |
| Seed | PASS |

Skipped HTTP/integration cases (environmental, not BharatBid regressions):

* `tests/infra/gitignore.test.ts` — 3 tests skip when `git` reports dubious ownership of `E:/` (this Windows workspace). `.gitignore` pattern assertions still run.
* Redis/BullMQ tests — skip unless `REDIS_URL` is set in `.env.test` (left commented so tests do not mutate the demo Redis).

## Removed Starter Kit **product** modules

Removed from the SIH frontend surface (pages, tests, and client services). Old URLs redirect to Command Center:

* Copilot, RAG, Anomalies, Intents, Automations
* Starter Kit Home, Dashboard, UI gallery

Backend Copilot / RAG / Anomaly / Intents / Automation / Odoo **modules were retained**. They are still registered by `createApp`, covered by tests, feature-flagged, and backed by Prisma models. Deleting them would require rewriting bootstrap and/or destructive migrations, which this phase forbids.

## Retained shared infrastructure

Authentication, JWT, RBAC, audit, storage, document processing, PDF, notifications, jobs/queues, AI extraction used by bid documents, Prisma, config, logging, validation, error handling, security middleware, Docker, and the testing factory stack.

## Known limitations

* Government adapters are **DEMO / MOCK / SYNTHETIC / SIMULATED**. They are not live GSTN, MCA, Udyam, or GeM APIs.
* BharatBid does not automatically award, reject, rank, or disqualify bidders. Officer Review Priority is a review-triage indicator, not a winner score.
* npm workspace package name remains `hackathon-starter-kit` (historical). User-facing `APP_NAME` is **BharatBid**.
* Interactive browser click-through was not available in this agent session; verification used live HTTP + SPA HTML. A presenter should still walk the UI once on the demo laptop.
* `.env` / `.env.test` must be created locally and must never be committed.

## DEMO / MOCK government adapter disclaimer

Verification and cross-checks in this repository use **DEMO SOURCE** adapters with synthetic records. Results are decision-support for officers. They are **not** official Government of India responses, **not** live government verification, and **not** fraud findings.
