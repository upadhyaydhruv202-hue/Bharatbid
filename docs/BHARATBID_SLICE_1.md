# BharatBid — Slice 1

Domain foundation for PS 26100. No document intelligence, government verification, compliance scoring, risk, or AI recommendation was implemented.

Runtime lives under `backend/src/problem/` because the Starter Kit compiles `backend/src` as `rootDir`. `modules/problem/` remains the documented problem boundary.

## 1. What was implemented

- Tender, TenderRequirement, Bidder, and BidSubmission persistence
- Foundational REST APIs with kit envelopes, pagination, Zod validation, and RBAC
- Procurement officer / reviewer roles and permissions (existing kit roles kept)
- Audit events for create/update/status/submit actions
- Demo seed: 5 tenders, 10 bidders, 15 bid submissions
- Frontend routes for overview, tenders, bidders, and bid submissions
- PAN masking on bidder lists; identifiers omitted from audit metadata

## 2. Database changes

Migration: `database/prisma/migrations/20260830184500_bharatbid_domain`

| Model | Notes |
| --- | --- |
| `Tender` | Unique `referenceNumber`; status enum; dates; optional `createdBy` → User |
| `TenderRequirement` | Cascades with tender; type enum; mandatory/active/sortOrder |
| `Bidder` | Unique nullable PAN/GSTIN/CIN/Udyam |
| `BidSubmission` | Unique `(tenderId, bidderId)` and `submissionReference` |

Enums (lowercase, kit-style; API accepts `DRAFT` or `draft`):

- TenderStatus: draft, open, under_evaluation, closed, awarded, cancelled
- TenderRequirementType: statutory, eligibility, document, financial, technical, organizational, declaration, tender_specific, other
- BidSubmissionStatus: draft, submitted, under_review, withdrawn, finalized

Assumption: one bid submission row per bidder per tender. Withdrawn submissions still occupy that unique pair.

## 3. API changes

All under `/api/v1`, authenticated.

| Group | Permission |
| --- | --- |
| `GET /bharatbid/overview` | `tenders.read` |
| Tenders CRUD + status | `tenders.read` / `tenders.write` |
| Requirements | `tenders.read` / `tenders.write` |
| Bidders CRUD | `bidders.read` / `bidders.write` |
| Bids list/create/submit | `bids.read` / `bids.write` |

Bids may only be created or submitted while the tender is `open`.

## 4. Frontend routes

- `/bharatbid` overview counts
- `/bharatbid/tenders`, `/new`, `/:id`
- `/bharatbid/bidders`, `/new`, `/:id`
- `/bharatbid/bids`, `/new`, `/:id`

Brand: **BharatBid**. Kit pages remain under Platform in the sidebar.

## 5. RBAC changes

Added roles (lowercase): `procurement_officer`, `reviewer`.

Added permissions: `tenders.read/write`, `bidders.read/write`, `bids.read/write`.

| Role | BharatBid access |
| --- | --- |
| admin | all catalog keys (includes new ones) |
| procurement_officer | read + write tenders/bidders/bids |
| reviewer | read only |
| manager | read only (does not break existing manager demos) |
| staff / user | none |

Existing `admin` / `manager` / `staff` / `user` were not renamed or removed.

Demo logins (when `DEMO_MODE` seed runs): `demo.officer@example.com`, `demo.reviewer@example.com` (password `demo-password`).

## 6. Audit events

`tender.created`, `tender.updated`, `tender.status.changed`, `tender.requirement.created`, `tender.requirement.updated`, `bidder.created`, `bidder.updated`, `bid.created`, `bid.submitted`.

PAN/GSTIN/CIN/Udyam/phone keys are treated as sensitive in audit redaction.

## 7. Demo data

5 tenders (mixed categories/statuses/requirement counts), 10 synthetic Indian bidders (including missing Udyam and multi-tender participation), 15 bid submissions.

## 8. Tests

- `backend/src/problem/problem.test.ts` identifier, transition, and schema unit tests
- `backend/src/rbac/catalog.test.ts` role grants
- `backend/tests/bharatbid.http.test.ts` API, RBAC, dates, duplicates, relationships
- `frontend/src/pages/bharatbid/TendersPage.test.tsx`

## 9. Known limitations

- No shared-tender ACL beyond permission checks (all officers with the permission see all records)
- No document, verification, compliance, or decision entities
- Draft bids can exist only on open tenders via the API; seed data may include historical rows on other statuses
- JWT still stored in localStorage (kit behaviour)
- PAN mask is display-only; detail pages show full identifiers to authorised users
- HTTP/Prisma BharatBid tests require `DATABASE_URL` (see `.env.test.example`); they skip when Postgres is not running

## 10. Future integration points

BidSubmission is the hang-off point for BidDocument, verification, compliance, discrepancy, AI recommendation, and officer decision in later slices. Do not add those tables until their slice.
