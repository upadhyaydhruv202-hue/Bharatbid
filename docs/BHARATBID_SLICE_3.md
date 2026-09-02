# BharatBid — Slice 3

Bidder & Bid Submission workspace on top of the Slice 1 domain and Slice 2 tender workspace.

Runtime remains `backend/src/problem/`. No documents, OCR, AI extraction, government verification, compliance scoring, or risk was added.

## 1. Objective

Procurement officers and reviewers can manage bidder profiles and the non-document portion of bid submissions:

```text
Tender → Requirements → Bidders → Bid Submission → Submission Status
```

A `BidSubmission` records who submitted against which tender, the submission reference, status, and timestamps. Document evidence remains a future slice.

## 2. Bidder workflow

```text
Register profile
  → Search / filter
  → Open profile
  → Review participation
  → Update identity (officer)
```

List columns show identifier **presence** (`Provided` / `Not provided`), not verification. PAN remains masked on the list (`ABCDE****F`). Full identifiers appear only on authorised detail views.

Search: legal/trade name, email, exact PAN, exact GSTIN. Filters: state, city, profile completeness (PAN + GSTIN + city + state + email), Udyam availability.

Duplicate PAN/GSTIN/CIN/Udyam returns:

> An existing bidder profile appears to use this identifier.

## 3. Bid workflow

```text
Create draft (open tender + bidder)
  → View submission workspace
  → Submit bid (explicit confirmation)
  → Locked after submission
```

One submission per bidder per tender (existing unique constraint). Drafts do not count as submitted bids. After submit, PATCH is rejected; the UI hides edit and shows why the record is locked.

Contextual action: **Submit** on `draft` only. No arbitrary status dropdown. Withdrawal is not introduced in this slice (backend transitions still exist from Slice 1).

## 4. Tender ↔ bidder relationship

| From | Shows |
| --- | --- |
| Tender detail → Bid participation | Counts (total, submitted, draft, under review, withdrawn, finalized) plus a table of bidder, submission reference, status, submitted at |
| Bidder detail → Tender participation | Tenders, bid references, statuses; row opens the bid |
| Bid detail | Links to tender and bidder, plus tender/bidder context |

## 5. API changes

Existing `/api/v1` envelopes, auth, pagination (`page` / `pageSize`), and RBAC.

| Endpoint | Notes |
| --- | --- |
| `GET /bidders` | `q` or `search`, `state`, `city`, `hasUdyam`, `completeness` (`complete` \| `incomplete`). List items include presence flags and participation counts; no list GSTIN. |
| `GET /bidders/:id` | Adds `participation` summary and bid rows. |
| `PATCH /bidders/:id` | Unchanged permission; duplicate identifiers use the professional conflict message. |
| `GET /bidders/:id/activity` | Bidder-scoped audit (`bidders.read`). |
| `GET /bids` | `q` or `search`, `tenderId`, `bidderId`, `status`. |
| `GET /tenders/:id/bids` | Same list, scoped to the tender. |
| `GET /bids/:id` | Detail DTO: tender/bidder context, submission readiness (data availability only), `fieldLocks`, `allowedActions`. |
| `GET /bids/:id/activity` | Bid-scoped audit (`bids.read`). |
| `POST /bids/:id/submit` | Unchanged: tender must be `open`; sets `submittedAt`. |

Bid create/submit still requires tender status `open`. Draft / closed / under evaluation / awarded / cancelled cannot accept new submissions.

## 6. Database changes

None. Existing Slice 1 unique constraints and Slice 2 indexes are reused (`bidders.legalName`, `city+state`; `bid_submissions` tender/status, bidder/createdAt, status/submittedAt).

## 7. RBAC

Unchanged permissions: `bidders.read` / `bidders.write`, `bids.read` / `bids.write`.

| Role | Slice 3 |
| --- | --- |
| procurement_officer | view/create/update bidders; create/update draft bids; submit |
| reviewer | view bidders, profiles, bids, and participation |
| admin | existing catalog (includes these keys) |

Mutations are backend-enforced. Hidden frontend buttons are not sufficient.

## 8. Audit

Existing: `bidder.created`, `bidder.updated`, `bid.created`, `bid.submitted`.

Added: `bid.updated`, `bid.status.changed`.

Activity tabs reuse `AuditRepository.listByResourceId`. PAN/GSTIN/CIN/Udyam/phone remain redacted in audit metadata.

## 9. Demo data

Still 5 tenders, 10 bidders, 15 bids (synthetic CPCL / `GEM/2026/B/CPCL/…` references). One bidder participates in multiple tenders; some tenders have multiple bidders; statuses include draft, submitted, under review, withdrawn, and finalized. No fake verification or compliance results.

## 10. Tests

- Unit: PAN mask `ABCDE****F`, identifier presence, completeness, bidder/bid list query aliases
- HTTP: bidder search/filter, duplicate message, update + activity, bid submit lock, bid search, reviewer 403, cancelled tender
- Frontend: bidder list/create/detail, bid list/create/detail, submit confirmation, tender participation empty table

## 11. Known limitations

- HTTP/API tests require `DATABASE_URL`
- Draft “edit” has no extra metadata fields beyond status in this model
- Withdrawal is not exposed as a UI action
- List PAN/GSTIN search is exact-match on a well-formed identifier (no partial PAN search)
- Activity is empty if the audit store is unavailable
- Submission readiness is a data-availability checklist, not compliance

## 12. Future document integration points

`BidSubmission` remains the hang-off point. Later slices should attach:

```text
BidSubmission
  ├── Documents
  ├── Extracted Data
  ├── Verification Results
  ├── Requirement Evaluation
  ├── Discrepancies
  └── Risk Signals
```

Do not treat identifier presence as government verification.
