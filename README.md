<p align="center">
  <sub>SMART INDIA HACKATHON · PROBLEM STATEMENT 26100</sub><br>
  <sub>Ministry of Petroleum &amp; Natural Gas · CPCL / GeM procurement context</sub>
</p>

<h1 align="center">BharatBid</h1>

<p align="center">
  <b>Procurement Intelligence &amp; Evidence-Based Bid Evaluation</b>
</p>

<p align="center">
  A decision-support workspace that turns fragmented bidder files into a traceable evaluation record — without replacing the officer.
</p>

<p align="center">
  <a href="#bharatbid-in-60-seconds">Understand</a> ·
  <a href="#product-at-a-glance">Capabilities</a> ·
  <a href="#how-bharatbid-thinks">Pipeline</a> ·
  <a href="#system-architecture">Architecture</a> ·
  <a href="#five-minute-demo">Demo</a> ·
  <a href="#academic-project-documentation">Assignment</a> ·
  <a href="#run-it-locally">Setup</a>
</p>

<p align="center">
  <img alt="SIH PS 26100" src="https://img.shields.io/badge/SIH-PS%2026100-1B3A6B?style=flat-square">
  <img alt="Decision support" src="https://img.shields.io/badge/Role-Decision%20support-0F766E?style=flat-square">
  <img alt="React Express PostgreSQL" src="https://img.shields.io/badge/Stack-React%20%2B%20Express%20%2B%20PostgreSQL-334155?style=flat-square">
  <img alt="DEMO SYNTHETIC sources" src="https://img.shields.io/badge/Government%20sources-DEMO%20%2F%20SYNTHETIC-B45309?style=flat-square">
  <img alt="License AGPL-3.0" src="https://img.shields.io/badge/License-AGPL--3.0--or--later-111827?style=flat-square">
</p>

```text
  Tender  →  Evidence  →  DEMO SOURCE checks  →  Cross-checks
       →  Coverage & review risk  →  Officer review  →  Comparison  →  Record
```

> **Honesty bar.** Adapters in this repository are **DEMO / SYNTHETIC / MOCK / SIMULATED**. They are not live GSTN, MCA21, Udyam, GeM, PAN, Income Tax, EPFO, ESIC, NSIC, DPIIT, BIS, or DigiLocker APIs. BharatBid is **not** an official Government of India product. Officers remain responsible for every qualification decision.

---

## Choose your path

| You are | Start here |
| --- | --- |
| **Hackathon judge** | [60 seconds](#bharatbid-in-60-seconds) → [the difference](#why-bharatbid) → [5-minute demo](#five-minute-demo) |
| **Evaluator / faculty** | [Problem](#the-procurement-challenge) → [academic documentation](#academic-project-documentation) → [`docs/ASSIGNMENT.md`](docs/ASSIGNMENT.md) |
| **Developer** | [Architecture](#system-architecture) → [setup](#run-it-locally) → [project structure](#project-structure) |
| **Technical reviewer** | [Architecture](#system-architecture) → [security](#security) → [demo vs production](#demo-vs-production) |
| **Product reader** | [Product at a glance](#product-at-a-glance) → [feature discovery](#feature-discovery) → [workflow](#end-to-end-officer-workflow) |

---

## BharatBid in 60 seconds

1. An officer signs in. The shell is labeled **DEMO ENVIRONMENT**.
2. **Command Center** shows real operational load: tenders, bids, reviews, evidence gaps, DEMO verification issues.
3. A **tender** holds ordered requirements and participating submissions.
4. A **bid** is the working file: documents, DEMO SOURCE verification, cross-checks, coverage, review, and activity.
5. **Officer Review Priority** is a 0–100 *review-priority* indicator with factor links back to evidence — not a winner score.
6. **Comparative evaluation** places bids side by side. There is no winner column.
7. The officer records a **decision-support** state and can download a PDF that repeats the DEMO / SYNTHETIC disclaimer.

**AI assists. Officers decide.**

---

## Product at a glance

| Tender intelligence | Evidence layer | Bid evaluation |
| :---: | :---: | :---: |
| Tenders, requirements, status, participation | Upload, versioning, mapping, extraction | Comparison matrix, notes, officer decisions |
| Command Center KPIs from live records | Authenticated preview / download | PDF decision-support report |

| Verification | Decision intelligence | Governance |
| :---: | :---: | :---: |
| Labeled DEMO SOURCE adapters | Coverage score, review risk, officer advisory | JWT, RBAC, audit, activity timeline |
| GST · MCA · Udyam · GeM · PAN · IT · EPFO · ESIC · DPIIT · NSIC · BIS · debarment | Explainable factors, never auto-award | Reviewer is read-focused; writes require `*.write` |

Seed showcase: tender **`GEM/2026/B/CPCL/001`** (industrial valves). Stronger evidence: **Bayfront**. Attention-heavy: **Delta**.

---

## The procurement challenge

CPSE / GeM evaluation is not a single form. It is a chain of documents, identifiers, and human judgment — usually spread across folders, portals, and email.

```text
Tender published
      │
      ▼
Bidder documents collected          ←  often not tied to requirements
      │
      ▼
GST / PAN / MSME / OEM / MII        ←  checks are hard to explain later
      │
      ▼
Cross-source consistency            ←  mismatches live in memory or spreadsheets
      │
      ▼
Technical / financial reading
      │
      ▼
Review & clarification              ←  often outside the bid file
      │
      ▼
Comparison & decision               ←  weak shared evidence matrix
```

**Where friction sits**

| Pressure | What goes wrong without a workspace |
| --- | --- |
| Information fragmentation | GST, MCA, Udyam, OEM letters, and declarations are not one file |
| Document volume | Mapping “this PDF supports this requirement” is manual |
| Verification opacity | A “match” is hard to replay with source, timestamp, and field comparison |
| Consistency | Two officers can treat the same mismatch differently |
| Traceability | Later audit cannot see *why* a bid was sent for review |
| Over-claiming | Spreadsheets invite language like “verified” or “winner” |

Product statement: [`PROBLEM_STATEMENT.md`](PROBLEM_STATEMENT.md).

---

## Why BharatBid?

```text
Traditional
  Documents  →  Manual search  →  Informal comparison  →  Decision

BharatBid
  Tender  →  Structured evidence  →  Labeled DEMO checks  →  Explainable review support  →  Officer record
```

> **What if bid evaluation could move from document hunting to evidence-driven decision intelligence — while remaining a human decision?**

**BharatBid** is that workspace. It organizes tenders and bids, binds documents to requirements, runs **labeled DEMO SOURCE** checks, highlights disagreements, and supports officer review and comparison.

It **automates assembly and explanation**. It does **not** award, reject, rank, or disqualify a bidder.

> **Decision support, not decision replacement.**

---

## Feature discovery

### 01 — Tender intelligence

**What it does.** Officers create and manage tenders (reference, organisation, department, category, schedule, status), attach ordered requirements, and see participating bids.

**Why it matters.** Evaluation starts from a shared file, not a private folder.

**How BharatBid approaches it.** Status actions are explicit. Requirements can be activated or deactivated without deleting history. Command Center KPIs (`Active tenders`, evaluations in progress) read these records.

Routes: `/bharatbid/tenders`, `/bharatbid/tenders/:id`.

### 02 — Evidence intelligence

**What it does.** Each bid has a document workspace: type, version, requirement mapping, extraction state, authenticated preview and download.

**Why it matters.** A requirement without mapped evidence is a visible gap — not a silent miss.

**How BharatBid approaches it.** Extraction may use the shared AI adapter; output is **untrusted structured data**, stored as extraction state. It is never executed as SQL or treated as an award. Bidder profile PAN/GSTIN on the bid overview is **Provided / Not provided**, not “government verified”.

Route: `/bharatbid/bids/:id/documents`.

### 03 — Verification & cross-checks

**What it does.** Officers run identifier checks against **DEMO** registries (GST, MCA, Udyam, GeM, PAN, Income Tax, EPFO, ESIC, DPIIT, NSIC, BIS, debarment). Results are matched / mismatched / not found / error, with field comparison and a source snapshot.

**Why it matters.** A check is inspectable: source, mode, timestamp, identifier origin, evidence.

**How BharatBid approaches it.** Every result is labeled **DEMO SOURCE**. GST return filing is an *attribute* on the DEMO GST snapshot (`FILED` / `NOT_FILED` / `DELAYED` / `NOT_AVAILABLE`), not a GSTN download. Debarment `RECORD_FOUND` requires officer review; it never auto-rejects. PAN is masked in verification lists.

Cross-checks: GST ↔ MCA, GST ↔ Udyam, MCA ↔ Udyam — consistent, difference, or insufficient evidence.

Routes: `/bharatbid/bids/:id/verification`, `.../cross-checks`.

### 04 — Bid evaluation & comparison

**What it does.** Requirements show Evidence Coverage (missing evidence is **not** an automatic fail). Comparative evaluation places bids side by side; cells open supporting evidence. Officers record notes and a decision-support state:

- accepted for further evaluation
- requires clarification
- not recommended for further evaluation

**Why it matters.** Comparison shares one matrix instead of parallel spreadsheets.

**How BharatBid approaches it.** No winner column. **Generate report** (`bids.write`) downloads a PDF with the decision-support disclaimer and **DEMO / SYNTHETIC DATA**.

Routes: `/bharatbid/evaluation`, `/bharatbid/evaluation/:tenderId`.

### 05 — Decision intelligence

**What it does.** Compute-on-read indicators from existing records:

| Indicator | Meaning | What it is not |
| --- | --- | --- |
| Evidence & Compliance Coverage | Explainable 0–100 from mapped evidence and DEMO results | Official government compliance |
| Officer Review Priority | 0–100 review-priority with band and factor links | Winner / fraud / award score |
| Procurement Review Risk | LOW / MODERATE / HIGH / CRITICAL from attention bands; DEMO debarment can raise LOW/MODERATE to HIGH | Fraud model |
| Officer advisory | Deterministic bullets from gaps and DEMO results | Approve / reject / winner text |
| Make in India class | `CLASS_I` / `CLASS_II` / `NOT_DECLARED` from declarations | Automatic eligibility |
| OEM authorization | Structured match vs bid claim | Brand-portal authenticity |
| DigiLocker-style marker | Synthetic `ISSUED` text marker | Real DigiLocker |

Routes: `/bharatbid/intelligence`, `/bharatbid/bids/:id/intelligence`. Detail: [`docs/BHARATBID_FINAL_INTELLIGENCE_FEATURES.md`](docs/BHARATBID_FINAL_INTELLIGENCE_FEATURES.md).

### 06 — Governance & reporting

**What it does.** JWT access + rotating refresh; bcrypt passwords; RBAC (`procurement_officer`, `reviewer`, `admin`, plus catalog roles). In-app notifications. Activity timeline (officer vs system). Audit events omit PAN / GSTIN / CIN / Udyam, extracted text, storage keys, and tokens.

**Why it matters.** A later reader can see *what happened* without leaking identifiers in logs and reports.

Routes: `/bharatbid/review`, `/bharatbid/activity`, `/bharatbid/notifications`. Security: [`docs/BHARATBID_SECURITY.md`](docs/BHARATBID_SECURITY.md).

---

## How BharatBid thinks

This pipeline matches the **implemented** officer path. Command Center **aggregates** it; it does not invent a second scoring engine.

```mermaid
flowchart TB
  IN[Procurement input: tender, bidder, documents]
  IN --> TI[Tender intelligence]
  TI --> EX[Document evidence & extraction]
  EX --> VR[DEMO registration verification]
  VR --> XC[Cross-portal validation]
  XC --> CV[Coverage, review risk, advisory]
  CV --> RV[Officer review & clarification]
  RV --> AT[Officer Review Priority]
  AT --> EV[Comparative evaluation]
  EV --> DS[Officer decision-support record]
  DS --> RP[PDF report & audit trail]
```

---

## End-to-end officer workflow

```text
01 Sign in
      ↓
02 Command Center — what needs attention
      ↓
03 Open tender — requirements & participation
      ↓
04 Open bid — collect / inspect documents
      ↓
05 Run DEMO SOURCE verification
      ↓
06 Cross-check identifiers
      ↓
07 Read coverage & gaps
      ↓
08 Officer review (machine finding ≠ government result)
      ↓
09 Compare bids
      ↓
10 Record decision-support state
      ↓
11 Generate PDF · inspect activity
```

Timed script: [`docs/BHARATBID_DEMO_GUIDE.md`](docs/BHARATBID_DEMO_GUIDE.md).

---

## User roles

Seeded SIH accounts all use password `demo-password`.

| Role | Responsibility | In this product |
| --- | --- | --- |
| **Procurement officer** `demo.officer@example.com` | Own the file | Create tenders, submit bids, run DEMO checks, assess reviews, generate reports |
| **Reviewer** `demo.reviewer@example.com` | Inspect without mutating officer workflows | Same read path; Create Tender / Run verification / Generate Report hidden and **403** on the API |
| **Administrator** `demo.admin@example.com` | Platform administration | Full RBAC catalog |

The RBAC catalog also includes infrastructure roles used by tests (`manager`, `staff`, `user`). Frontend labels prefer officer / reviewer / admin. Backend `requirePermission` is authoritative; UI checks are UX only.

Permissions used by BharatBid routes: `tenders.read` / `tenders.write`, `bidders.read` / `bidders.write`, `bids.read` / `bids.write`, plus `notifications.read` for the inbox.

---

## Project maturity

| Area | Status | Evidence in this repo |
| --- | --- | --- |
| Frontend workspaces | Implemented | `frontend/src/pages/bharatbid/` |
| Backend domain API | Implemented | `backend/src/routes/bharatbid.routes.ts` |
| Database & migrations | Implemented | `database/prisma/` |
| Authentication / RBAC | Implemented | JWT + catalog in PostgreSQL |
| DEMO verification adapters | Implemented (simulated) | `backend/src/problem/verification/` |
| Evaluation & PDF reports | Implemented | Comparison workspace + `report.ts` |
| Testing | Implemented | Vitest unit, HTTP/integration, API e2e, GitHub Actions |
| Documentation | Implemented | `docs/`, this README, assignment document |
| Live government APIs | Not in this submission | Explicit DEMO SOURCE only |
| Production hardening | Partial | Local-dev JWT placeholders; demo password for SIH only |

---

## System architecture

```mermaid
flowchart TB
  UI[React / Vite UI]
  API[Express /api/v1]
  AUTH[JWT + RBAC]
  DOM[BharatBid domain services]
  PG[(PostgreSQL / Prisma)]
  ST[Object storage]
  JOB[Jobs / worker]
  PDF[pdf-lib reports]
  N[Notifications]
  AUD[Audit]

  UI --> API
  API --> AUTH
  API --> DOM
  DOM --> PG
  DOM --> ST
  DOM --> PDF
  DOM --> N
  DOM --> AUD
  JOB --> DOM
```

| Layer | Location | Responsibility |
| --- | --- | --- |
| UI | `frontend/src/pages/bharatbid/` | Command Center and workspaces |
| API | `backend/src/routes/bharatbid.routes.ts` | `/api/v1` envelopes + permission gates |
| Controller | `backend/src/controllers/bharatbid.controller.ts` | HTTP + Zod |
| Domain | `backend/src/problem/` | Tenders, evidence, verification, intelligence, review, evaluation |
| Coverage | `backend/src/problem/coverage/` | Coverage, review risk, advisory, MII, OEM, gaps — **compute-on-read** |
| Adapters | `backend/src/problem/verification/` | DEMO registries only |
| Reports | `backend/src/problem/operations/report.ts` | Officer-downloadable PDFs |

Shared infrastructure: auth, RBAC, audit, storage, document extraction, optional Redis/BullMQ, PDF renderer, feature flags, `DEMO_MODE`.

Full write-up: [`docs/BHARATBID_ARCHITECTURE.md`](docs/BHARATBID_ARCHITECTURE.md) · decisions: [`ARCHITECTURE_DECISION.md`](ARCHITECTURE_DECISION.md).

---

## Technology stack

Badges reflect packages and services **in this repository**.

### Frontend

React 18, React Router 6, Vite 6, TypeScript, Tailwind CSS, Testing Library / Vitest.

### Backend

Express, Zod, Prisma, bcryptjs, jsonwebtoken, Helmet, Multer, Pino, pdf-lib, BullMQ, ioredis.

### Data & jobs

PostgreSQL 16 (host port **5433**, database `hackathon`), Redis 7 (queues, rate limits, optional cache).

### Authentication

JWT access + rotating refresh; passwords hashed with bcrypt.

### AI (document intelligence)

Provider-agnostic `AIService` (`gemini` or `mock`). Structured output is untrusted. No winner model. `FEATURE_AI` / `AI_ENABLED` in `.env.example`.

### Infrastructure

Docker Compose (frontend, API, worker, Postgres, Redis). GitHub Actions CI (and optional CD). Node.js **20+** (`.nvmrc`).

---

## Project structure

```text
BharatBid/
├── frontend/                 # React workspaces (Command Center, tenders, bids, …)
├── backend/                  # Express API, domain services, adapters
│   └── src/problem/          # BharatBid business rules
├── workers/                  # BullMQ consumer (same backend image in Docker)
├── database/prisma/         # Schema, migrations, seed
├── docs/                     # Architecture, security, demo, assignment
├── infra/                    # Compose Postgres/Redis, healthchecks
├── .github/workflows/        # CI / CD
├── PROBLEM_STATEMENT.md
├── ARCHITECTURE_DECISION.md
└── README.md
```

The Compose project name remains `hackathon-starter-kit` so existing Docker volumes stay attached. Runtime identity is `APP_NAME=BharatBid`.

---

## Five-minute demo

**Needs:** stack running ([setup](#run-it-locally)). **Account:** `demo.officer@example.com` / `demo-password`.

| Minute | Do this | Say this |
| --- | --- | --- |
| 0 | `/login` | DEMO / SYNTHETIC. Officers decide. |
| 1 | Command Center `/bharatbid` | KPIs are real records, not a second ranking engine. |
| 2 | Open `GEM/2026/B/CPCL/001` | Requirements and participation live on one tender. |
| 3 | Open **Bayfront** bid → Documents + Verification | DEMO SOURCE. Field comparison is the evidence. |
| 4 | Delta bid → Intelligence, then Evaluation compare | Review priority ≠ winner. No winner column. |
| 5 | Generate report · Activity | PDF repeats DEMO / SYNTHETIC. Audit is inspectable. |

Do **not** say on stage: winner, best bidder, automatically approved, government verified, live GST integration, fraud detected.

Full 15-minute script: [`docs/BHARATBID_DEMO_GUIDE.md`](docs/BHARATBID_DEMO_GUIDE.md).

---

## Screenshots

This repository does **not** currently ship screenshot assets (no `png`/`jpg` files in the tree).

**To add later** (store under `docs/assets/` and link here): Command Center, tender file, bid Documents, Verification evidence drawer, Cross-checks, Requirements matrix, Officer Review Priority, comparative evaluation, PDF first page, Activity timeline, login card showing DEMO / SYNTHETIC.

Until then, run the app: http://127.0.0.1:5173/

---

## Demo vs production

### Implemented

Tender / bidder / bid workflows, documents, DEMO verification and cross-checks, requirement intelligence, officer review, Officer Review Priority, comparative evaluation, PDF reports, Command Center, notifications, activity, JWT + RBAC, audit redaction, Docker Compose, CI.

### Demo / simulated

All government-source adapters. Seed tenders and bids (including `GEM/2026/B/CPCL/001`, Bayfront, Delta). DigiLocker-style authenticity marker. GST return *attribute* on DEMO GST. Email and SMS providers default **off** (`EMAIL_ENABLED=false`, `SMS_ENABLED=false`).

### Not in this submission

Live GSTN / MCA21 / Udyam / GeM / PAN / IT / EPFO / ESIC / NSIC / DPIIT / BIS / DigiLocker. Automatic award or ranking. Fraud detection. Government certification of this software. Production-grade JWT issuers (`.env.example` uses change-me secrets).

Future items that were **explicitly not built**: [`docs/BHARATBID_FUTURE_SCOPE.md`](docs/BHARATBID_FUTURE_SCOPE.md).

---

## Run it locally

**Prerequisites:** Node.js 20+, npm 10+, Docker Desktop (PostgreSQL + Redis).

On Windows, keep `127.0.0.1` in `DATABASE_URL` (see `.env.example`). `localhost` can resolve to IPv6 and Prisma fails with P1001.

```text
Prerequisites  →  clone  →  npm install  →  .env
      →  Postgres/Redis  →  migrate  →  seed  →  npm run dev
```

```bash
git clone https://github.com/upadhyaydhruv202-hue/Bharatbid.git
cd Bharatbid
cp .env.example .env
npm install
npm run deps:up
npm run db:migrate
npm run db:seed
npm run dev
```

| Surface | URL |
| --- | --- |
| Command Center | http://127.0.0.1:5173/bharatbid |
| Sign in | http://127.0.0.1:5173/login |
| API | http://127.0.0.1:5000 |
| Health | http://127.0.0.1:5000/health |

Full-stack Docker: `docker compose up --build`. See [`docs/getting-started.md`](docs/getting-started.md) and [`docs/docker.md`](docs/docker.md).

Do **not** run `npm run db:reset` against a working demo database.

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

HTTP tests (separate `hackathon_test` database):

```bash
cp .env.test.example .env.test
npm run db:test:prepare
npm run test:integration -w backend
```

---

## Why BharatBid matters

In a public-procurement setting, the valuable outcome is not a louder dashboard. It is a file another officer can reopen:

- **Transparency** — DEMO checks and officer assessments are visible, not implied.
- **Traceability** — documents, checks, reviews, and decisions stay on the bid.
- **Consistency** — coverage and attention use the same rules for every bid in the tender.
- **Human control** — advisory language never pretends to be an award.

No claim is made here about rupee savings, live department adoption, or production certification.

---

## Roadmap

```text
Foundation (auth, RBAC, storage, jobs)     ✓
Core procurement (tenders, bidders, bids)  ✓
Evidence + DEMO verification                 ✓
Review + Officer Review Priority             ✓
Comparative evaluation + PDF                ✓
Command Center + intelligence layer         ✓
Live authorized government adapters         ○  future — legal access required
Async reports at large scale                ○  future
Production secret management / hardening    ○  future
Winner ranking / automatic award            ✕  will not implement
```

---

## Academic project documentation

Concise README map. Full assignment write-up: **[`docs/ASSIGNMENT.md`](docs/ASSIGNMENT.md)**.

<details>
<summary><b>Requirements, use cases, traceability, and academic outline</b></summary>

### Functional requirements (from the running product)

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-01 | Authenticated session (JWT) with role shown in the shell | High |
| FR-02 | Tender CRUD, status, ordered requirements | High |
| FR-03 | Bidder profiles with identifier *presence*, not government verification | High |
| FR-04 | Bid submissions linked to tender and bidder | High |
| FR-05 | Document upload, mapping, extraction, authenticated download | High |
| FR-06 | DEMO SOURCE verification with inspectable evidence | High |
| FR-07 | Cross-source checks (GST ↔ MCA ↔ Udyam) | High |
| FR-08 | Requirement Evidence Coverage (missing ≠ automatic fail) | High |
| FR-09 | Officer review: machine finding vs assessment vs clarification | High |
| FR-10 | Officer Review Priority with factor traceability | High |
| FR-11 | Comparative evaluation without a winner column | High |
| FR-12 | Decision-support PDF with DEMO disclaimer | High |
| FR-13 | Command Center aggregating existing records | High |
| FR-14 | Activity / notifications | Medium |

### Non-functional (supported, not certified)

| ID | Area | Stance in this repo |
| --- | --- | --- |
| NFR-01 | Security | JWT, bcrypt, RBAC, helmet, CORS, rate limits, SSRF helper — not a pentest certificate |
| NFR-02 | Auditability | Audit + activity; identifiers omitted from audit metadata and report tables |
| NFR-03 | Honesty | DEMO_MODE labelling in UI and reports |
| NFR-04 | Maintainability | TypeScript, Prisma migrations, Vitest, ESLint |
| NFR-05 | Availability | Compose healthchecks; `/health` and `/ready` |
| NFR-06 | Usability | Light-first officer UI; reviewer write actions hidden |

### Use cases

```mermaid
flowchart LR
  O[Procurement officer] --> L[Sign in]
  O --> T[Manage tender]
  O --> B[Inspect bid evidence]
  O --> V[Run DEMO verification]
  O --> R[Review & record decision support]
  O --> P[Download PDF]
  RV[Reviewer] --> L
  RV --> B
```

### Requirement → module → implementation

| Requirement | Module | Implementation |
| --- | --- | --- |
| FR-01 | Auth | `backend/src/auth/`, `frontend/src/auth/` |
| FR-02 | Tenders | `tender.service` + Tenders / Tender Detail pages |
| FR-05 | Documents | Bid documents panel + storage + extraction |
| FR-06 | Verification | `verification/` adapters + Verification tab |
| FR-10 | Intelligence | `coverage/` + Intelligence page / bid tab |
| FR-11 | Evaluation | Evaluation workspace + `EvaluationDecision` |
| FR-12 | Reports | `operations/report.ts` + pdf-lib |

### Aim, scope, limitations (short)

- **Aim:** Demonstrate an evidence-first bid compliance *workspace* for SIH 26100.
- **In scope:** Decision support on synthetic / DEMO data; officer remains accountable.
- **Out of scope:** Live government APIs; automatic award; claiming official compliance.

References for the assignment document include SIH PS 26100, GeM procurement context as *problem setting* (not a live integration), and the stack documentation linked from [`docs/README.md`](docs/README.md).

</details>

---

<details>
<summary><b>Under the hood — API, data, security, tests, environment</b></summary>

### API overview

Prefix: `/api/v1`. Auth: `POST /api/v1/auth/login` (see [`docs/auth.md`](docs/auth.md)). BharatBid routes are permission-gated. Conventions: [`docs/api-conventions.md`](docs/api-conventions.md).

```text
Command Center
├── GET /bharatbid/dashboard
├── GET /bharatbid/search
└── GET /bharatbid/activity

Tenders / requirements / bids / bidders
├── GET|POST /tenders
├── GET|PATCH /tenders/:id
├── POST /tenders/:id/status
├── GET|POST /tenders/:id/requirements
├── GET|POST /bidders
└── GET|POST /bids  ·  POST /bids/:id/submit

Evidence & DEMO verification
├── GET|POST /bids/:id/documents
├── GET /bids/:bidId/documents/:id/download
├── GET /verification-sources
├── GET|POST /bids/:id/verifications
└── GET|POST /bids/:id/cross-verifications

Intelligence, review, evaluation
├── GET /bids/:id/intelligence
├── GET /intelligence/bids
├── GET|POST /reviews…
├── GET /tenders/:id/evaluation/comparison
└── GET /tenders/:id/reports/evaluation
```

### Database (conceptual)

```mermaid
erDiagram
  User ||--o{ Tender : creates
  Tender ||--o{ TenderRequirement : defines
  Tender ||--o{ BidSubmission : receives
  Bidder ||--o{ BidSubmission : submits
  BidSubmission ||--o{ BidDocument : attaches
  BidSubmission ||--o{ BidVerification : checks
  BidSubmission ||--o{ BidCrossVerification : compares
  BidSubmission ||--o{ BidReviewItem : reviews
  BidReviewItem ||--o{ ReviewAssessment : assesses
  BidReviewItem ||--o{ ReviewClarification : clarifies
  Tender ||--o| TenderEvaluation : evaluates
  TenderEvaluation ||--o{ EvaluationNote : notes
  TenderEvaluation ||--o{ EvaluationDecision : records
```

Schema: `database/prisma/schema.prisma`. Guide: [`docs/database.md`](docs/database.md).

### Security

- JWT access + rotating refresh; bcrypt hashes
- RBAC reloaded from PostgreSQL on authenticate (not trusted from a JWT role claim alone)
- Authenticated document download; no public storage URLs in the UI
- SSRF checks on user-controlled URLs
- Rate limits, CORS allowlist, secure headers, body limits
- Search does not query PAN/GSTIN in the SIH UI
- Frontend cannot set officer identity or scores

Not claimed: production government API access, formal certification, hardened production secrets. Demo password is **local SIH only**.

### Testing

Vitest across `frontend/`, `backend/src`, `backend/tests`, `workers/`. Integration/e2e use `hackathon_test`. CI: [`.github/workflows/ci.yml`](.github/workflows/ci.yml) — lint, typecheck, unit, integration, API e2e, secret scan, audit, image build, Compose smoke. Coverage percentages are **not** asserted in this README; run `npm run test:coverage` locally.

### Environment (placeholders only)

Copy `.env.example`. Do not commit `.env`. Representative keys:

```env
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5433/hackathon
REDIS_URL=redis://127.0.0.1:6379
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
DEMO_MODE=true
AI_ENABLED=true
AI_PROVIDER=gemini
GEMINI_API_KEY=
EMAIL_ENABLED=false
SMS_ENABLED=false
```

Full catalog: [`docs/configuration.md`](docs/configuration.md).

</details>

---

## Architecture decisions

React/Vite, Express, PostgreSQL/Prisma, and optional Redis/BullMQ already implement the SIH demo — a parallel stack was rejected. Live government APIs are out of scope without credentials and legal access. Copilot, RAG, Odoo, and unused kit product chrome were removed from this SIH repository.

Summary: [`ARCHITECTURE_DECISION.md`](ARCHITECTURE_DECISION.md).

---

## Deployment

**Supported for demonstration:** Docker Compose (`docker compose up --build`) and hybrid host Node + Compose Postgres/Redis.

CD workflow exists ([`docs/ci-cd.md`](docs/ci-cd.md)) as an optional GitHub Actions pipeline. This README does **not** claim a production-certified government deployment.

---

## Team

| | |
| --- | --- |
| Repository | [upadhyaydhruv202-hue/Bharatbid](https://github.com/upadhyaydhruv202-hue/Bharatbid) |
| Git author on `main` | Dhruv Upadhyay |

Additional contributors can be listed here as they appear on the repository.

---

## License

[AGPL-3.0-or-later](LICENSE). Third-party dependencies remain under their own licenses.

---

## References

- [PROBLEM_STATEMENT.md](PROBLEM_STATEMENT.md) — SIH Problem Statement 26100 framing used by this repo
- [docs/README.md](docs/README.md) — documentation index
- [docs/ASSIGNMENT.md](docs/ASSIGNMENT.md) — software engineering assignment document
- [docs/BHARATBID_DEMO_GUIDE.md](docs/BHARATBID_DEMO_GUIDE.md) — live demo script
- [docs/BHARATBID_SECURITY.md](docs/BHARATBID_SECURITY.md) — security posture
- [CHANGELOG.md](CHANGELOG.md) — documentation redesign notes
- React, Express, Prisma, PostgreSQL, Vite, Tailwind, Vitest, Docker — as used in `package.json` / Compose files

GeM / CPSE procurement is the **problem context**. This codebase does not connect to production GeM.
