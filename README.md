# BharatBid

**Procurement Intelligence & Evidence-Based Bid Evaluation**

Smart India Hackathon — Problem Statement **26100** (Ministry of Petroleum & Natural Gas / CPCL context).

BharatBid is a decision-support workspace for government procurement officers. It centralizes tenders, bidder evidence, DEMO SOURCE verification adapters, cross-checks, officer review, explainable Officer Review Priority, comparative evaluation, and PDF reports.

> BharatBid does **not** automatically award, reject, rank, or disqualify bidders. It is **not** an official Government of India product. Government-source adapters in this repository are **DEMO / SYNTHETIC / MOCK / SIMULATED**.

## Purpose

Help a procurement officer inspect a tender, gather bid documents, run labeled verification adapters, compare evidence, record review and evaluation decisions, and export a decision-support PDF — without claiming live government connectivity or automatic award.

## Architecture

React / Vite frontend → Express REST API (`/api/v1`) → controllers → BharatBid services (`backend/src/problem/`) → Prisma repositories → PostgreSQL.

Shared infrastructure used by that product path: authentication, RBAC, audit, storage, document extraction, PDF/reports, notifications, and optional Redis/BullMQ jobs.

Details: [docs/BHARATBID_ARCHITECTURE.md](docs/BHARATBID_ARCHITECTURE.md).

## Features

* Command Center (aggregated KPIs — not a new score)
* Tender and requirement management
* Bidder profiles and bid submissions
* Document evidence mapped to requirements
* GST / MCA / Udyam / PAN / IT / EPFO / ESIC / NSIC / DPIIT / GeM / BIS / debarment **DEMO** adapter checks
* GST return filing status as a DEMO GST attribute (not GSTN)
* Cross-verification and requirement intelligence
* Evidence & Compliance Coverage and Procurement Review Risk (decision-support, not official scores)
* Officer advisory (never auto award / reject)
* Make in India class, OEM authorization comparison, DEMO DigiLocker-style authenticity
* Officer review, clarifications, assessments
* Officer Review Priority (explainable attention — not a winner ranking)
* Comparative evaluation and officer decision-support records
* Activity timeline, notifications, PDF reports

## Roles

| Role | Demo account | Password |
| --- | --- | --- |
| Procurement officer | `demo.officer@example.com` | `demo-password` |
| Reviewer (read-only officer workflows) | `demo.reviewer@example.com` | `demo-password` |
| Admin | `demo.admin@example.com` | `demo-password` |

## Demo flow

Login → Command Center → Tender **GEM/2026/B/CPCL/001** → Bid → Documents → Verification (DEMO sources) → Cross-checks → Requirements → Compliance coverage / Review risk / Officer advisory → Officer review → Officer Review Priority → Comparative evaluation → Officer decision → Report → Activity → Notifications.

Walkthrough: [docs/BHARATBID_DEMO_GUIDE.md](docs/BHARATBID_DEMO_GUIDE.md).

## Setup and running locally

Requires **Node.js 20+** and **Docker Desktop** (PostgreSQL + Redis).

On Windows, keep `127.0.0.1` in `DATABASE_URL` (see `.env.example`). `localhost` can resolve to IPv6 and Prisma will fail with P1001.

```bash
npm install
cp .env.example .env
npm run deps:up
npm run db:migrate
npm run db:seed
npm run dev
```

| Surface | URL |
| --- | --- |
| Command Center | http://127.0.0.1:5173/ (`/` redirects here) |
| Sign in | http://127.0.0.1:5173/login |
| Tenders | http://127.0.0.1:5173/bharatbid/tenders |
| API | http://127.0.0.1:5000 |
| Health | http://127.0.0.1:5000/health |

Full-stack Docker: `docker compose up --build`. See [docs/getting-started.md](docs/getting-started.md) and [docs/docker.md](docs/docker.md).

A dedicated worker is optional for the SIH demo (`npm run dev:all`). Seeded document extraction is already complete.

## Environment

Copy `.env.example` to `.env` (gitignored). Do not commit secrets.

Required locally: `DATABASE_URL`, JWT secrets (placeholders in `.env.example` for development only), `APP_NAME=BharatBid`, `DEMO_MODE=true` for the SIH accounts.

The Compose **project name** remains `hackathon-starter-kit` so existing Docker volumes and container names stay attached to this demo database. Runtime identity is `APP_NAME=BharatBid`.

## Database

PostgreSQL via Prisma. Demo database name is `hackathon` on host port **5433**. Test database is `hackathon_test`. Do not change these names unless you intend to point at a new database.

```bash
npm run db:migrate
npm run db:seed
```

Do not run `npm run db:reset` against a working demo environment.

## Testing

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

HTTP/API tests against local Postgres:

```bash
cp .env.test.example .env.test
npm run db:test:prepare
npm run test:integration -w backend
```

## DEMO / MOCK / SYNTHETIC limitations

* No live GSTN / MCA / Udyam / GeM production APIs
* No automatic award, rejection, or bidder ranking
* No fraud detection or “trust score”
* No government certification
* Demo passwords are for local SIH use only

## Documentation

| Document | Purpose |
| --- | --- |
| [docs/BHARATBID_ARCHITECTURE.md](docs/BHARATBID_ARCHITECTURE.md) | Product architecture |
| [docs/BHARATBID_DEMO_GUIDE.md](docs/BHARATBID_DEMO_GUIDE.md) | Live demonstration script |
| [docs/BHARATBID_SECURITY.md](docs/BHARATBID_SECURITY.md) | Security posture |
| [docs/BHARATBID_SIH_READINESS_CHECKLIST.md](docs/BHARATBID_SIH_READINESS_CHECKLIST.md) | Submission checklist |
| [docs/BHARATBID_FINAL_INTELLIGENCE_FEATURES.md](docs/BHARATBID_FINAL_INTELLIGENCE_FEATURES.md) | DEMO adapters, coverage, risk, advisory |
| [docs/README.md](docs/README.md) | Full documentation index |

## License

See the repository license/notice files. Third-party dependencies remain under their own licenses.
