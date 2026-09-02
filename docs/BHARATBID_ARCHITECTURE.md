# BharatBid — Architecture

Product architecture for SIH Problem Statement 26100. Platform internals (Express, Prisma, Redis, Docker) are described in `docs/` (getting started, database, auth, jobs, Docker).

## Disclaimer

BharatBid is a **decision-support platform**. It does not automatically award, reject, rank, or disqualify bidders. Government verification adapters in this codebase are **DEMO / SYNTHETIC / MOCK / SIMULATED** unless a dedicated production adapter is configured (none are configured in this submission).

## Runtime flow

```text
Frontend (React / Vite)
    ↓
REST API `/api/v1`
    ↓
Authentication / RBAC
    ↓
BharatBid domain services (`backend/src/problem/`)
    ↓
Evidence / Verification / Intelligence / Review / Evaluation
    ↓
PostgreSQL (Prisma)
    ↓
Storage / Notifications / PDF reporting / Audit / Jobs
```

## Domain relationship

```text
Tender
  └── Requirement (ordered, active/inactive)
        └── Bid submission (bidder + status)
              ├── Document evidence (versions, mapping, extraction)
              ├── Verification (GST, MCA, Udyam, GeM adapters)
              ├── Cross-verification (GST↔MCA, GST↔Udyam, MCA↔Udyam)
              ├── Requirement intelligence (Evidence Coverage)
              ├── Officer review (assessments, clarifications)
              ├── Officer Review Priority (Slice 8 attention)
              └── Evaluation (comparative workspace, notes, decisions)
                    └── Report (PDF decision-support record)
```

Command Center (`/bharatbid`) **aggregates** these records. It does not compute a new score.

## Layers

| Layer | Location | Responsibility |
| --- | --- | --- |
| UI | `frontend/src/pages/bharatbid/` | Workspaces, Command Center |
| API | `backend/src/routes/bharatbid.routes.ts` | `/api/v1` envelopes |
| Controller | `backend/src/controllers/bharatbid.controller.ts` | HTTP + schema |
| Service | `backend/src/problem/*.service.ts` | Business rules |
| Repository | `backend/src/repositories/` | Prisma queries |
| Adapters | `backend/src/problem/verification/` | Demo government sources |
| Reports | `backend/src/problem/operations/report.ts` + PDF renderer | Officer-downloadable PDFs |

## Shared infrastructure used by BharatBid

Auth, RBAC, audit, storage, documents, AI extraction, jobs/workers, notifications, PDF renderer, feature flags, demo mode.

Copilot, RAG, Odoo, anomaly, intents, and automation product modules were removed. They are not part of this SIH repository.

## Security boundaries

* Session identity only — the client cannot set officer identity or scores.
* RBAC permissions (`tenders.*`, `bids.*`, `bidders.*`, `notifications.*`) are enforced on the API.
* Reviewers can read procurement data; mutation of officer-controlled workflows requires write permissions.
* Reports and search omit PAN/GSTIN/CIN/Udyam and storage keys.
* Documents download through authenticated APIs, not public URLs.

## AI boundary

Document extraction may use the shared AI service. AI output is untrusted: it is stored as extraction state, not executed as SQL/JS/shell, and never becomes an award.
