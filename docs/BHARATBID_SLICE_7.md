# BharatBid — Slice 7

Officer Review, Clarification & Auditable Decision-Support Workflow on top of Slice 1–6. Runtime remains `backend/src/problem/`. This slice is **decision support**. It does not approve, reject, disqualify, rank, or award bids.

```text
Evidence
   ↓
Verification
   ↓
Cross-Verification
   ↓
Requirement Intelligence
   ↓
Review Item
   ↓
Officer Review
   ↓
Assessment / Clarification
   ↓
Auditable Record
```

The human officer remains responsible for the final procurement decision.

## 1. Objective

Convert Slice 6 intelligence into a controlled workflow where an authorised procurement officer can inspect evidence, verification, cross-checks, and requirement intelligence; record an attributable assessment; request in-app clarification; and leave an immutable audit trail.

The system may say: “This issue requires officer review.” It may not say: “Therefore reject this bid.”

## 2. Review architecture

Slice 6 review items were computed on GET and not persisted. Slice 7 adds persistent `BidReviewItem` rows so officer lifecycle does not vanish on refresh.

```text
Slice 6 intelligence (computed)
        ↓
candidatesFromIntelligence()  → fingerprint
        ↓
upsert BidReviewItem if fingerprint is new
        ↓
Existing officer status / assessments / clarifications are never overwritten
```

Sync runs on bid-scoped reads (`GET /bids/:id`, `GET /bids/:id/reviews`, review detail) and after `POST /bids/:id/cross-verifications`. The global review queue is **not** synced per row (avoids N+1). Demo seed persists the showcase items.

Fingerprints include `requirement:{id}:evidence_missing` and `cross:{id}:cross_source_inconsistency`.

Machine finding (`machineFinding`, `machineExplanation`) is stored once and never updated.

## 3. Review item lifecycle

Controlled statuses:

| Status | Meaning |
| --- | --- |
| `open` | Machine-identified, not yet started |
| `in_review` | Officer started the item |
| `clarification_requested` | In-app clarification is outstanding |
| `assessed` | At least one officer assessment exists |
| `closed` | Officer explicitly closed the item |

Allowed transitions:

```text
OPEN → IN_REVIEW → ASSESSED → CLOSED
OPEN / IN_REVIEW / ASSESSED → CLARIFICATION_REQUESTED
CLARIFICATION_REQUESTED → IN_REVIEW (respond or cancel)
OPEN / IN_REVIEW → ASSESSED (assessment without an explicit start)
```

A machine-generated issue does **not** become `closed` because a document later exists. The officer must assess, then close.

## 4. Officer assessments

Controlled values: `confirmed`, `explanation_accepted`, `evidence_sufficient`, `evidence_insufficient`, `requires_clarification`, `not_applicable`.

There is no `APPROVED BID`, `REJECT BID`, or `AWARD BID`.

Assessments are immutable versions: a change inserts a new `ReviewAssessment` (`attemptNumber`, `isLatest`). The previous row remains.

Officer identity and timestamp are derived from the authenticated session. The body may contain only `assessment` and `note`. `officerId` / `role` / `userId` in the body are rejected (`.strict()`).

Important assessments require a note of at least 20 characters. Trivial values such as `ok` are rejected.

Example:

```text
Machine finding: INCONSISTENT
Officer assessment: EXPLANATION_ACCEPTED
```

The machine finding stays `INCONSISTENT`.

## 5. Clarification workflow

Minimal `ReviewClarification` model: request message, status (`requested` | `responded` | `cancelled`), officer attribution, optional DEMO response.

There is no `EXPIRED` status (no deadline mechanism).

Requests are stored in-app. **No email or SMS is sent.** Copy is honest: “No bidder email or government message was sent.”

Demo responses are labelled **DEMO / SYNTHETIC** and do not imply that a real bidder was contacted.

One `requested` clarification is allowed per review item at a time.

## 6. Human-in-the-loop model

AI is not used in this slice. Optional advisory drafting was unnecessary.

The officer must explicitly start, assess, clarify, respond (demo), or close. The UI never silently rewrites a machine result.

## 7. APIs

All under `/api/v1`. Existing envelopes.

| Method | Path | Permission |
| --- | --- | --- |
| GET | `/reviews` | `bids.read` |
| GET | `/reviews/summary` | `bids.read` |
| GET | `/reviews/:id` | `bids.read` |
| POST | `/reviews/:id/start` | `bids.write` |
| POST | `/reviews/:id/close` | `bids.write` |
| POST | `/reviews/:id/assessments` | `bids.write` |
| GET | `/reviews/:id/assessments` | `bids.read` |
| POST | `/reviews/:id/clarifications` | `bids.write` |
| GET | `/reviews/:id/clarifications` | `bids.read` |
| POST | `/reviews/:id/clarifications/:clarificationId/respond` | `bids.write` (DEMO) |
| POST | `/reviews/:id/clarifications/:clarificationId/cancel` | `bids.write` |
| GET | `/reviews/:id/activity` | `bids.read` |
| GET | `/bids/:id/reviews` | `bids.read` |
| GET | `/bids/:bidId/reviews/:id` | `bids.read` (404 if the item is not on that bid) |

`GET /bids/:id/review-items` remains the Slice 6 **computed** intelligence queue for the Requirements tab.

List filters: `search`/`q`, `tenderId`, `bidId`, `bidderId`, `status`, `issueType`, `mandatory`, `verificationState`, `crossCheckState`, pagination (`page`, `pageSize` or `limit`), `sortOrder`.

## 8. Database

Additive migration `20260830223000_bharatbid_reviews`.

| Model | Table | Notes |
| --- | --- | --- |
| `BidReviewItem` | `bid_review_items` | Unique `(bidSubmissionId, fingerprint)` |
| `ReviewAssessment` | `review_assessments` | Immutable versions |
| `ReviewClarification` | `review_clarifications` | `synthetic` defaults true |

Existing Slice 1–6 tables are not dropped or reset.

## 9. RBAC

Reuses `bids.read` / `bids.write`. No new permissions.

| Role | View | Mutate |
| --- | --- | --- |
| Procurement officer | Yes | Start, assess, clarify, demo-respond, close |
| Reviewer | Yes | No |

## 10. Security

* Identity comes from the session, never from the request body.
* Object-level: `GET /bids/:bidId/reviews/:id` returns 404 when the review item does not belong to that bid.
* Reviewer mutation is `403`.
* Audit metadata stores IDs, statuses, and issue types — not PAN, GSTIN, extracted text, or document bytes.
* Existing audit redaction already covers identifier keys.

## 11. Audit

Reuses `AuditService`. Resource is the **bid**, with `reviewItemId` in metadata.

Actions: `review_item.created`, `review.opened`, `review.started`, `review.assessment.created`, `review.assessment.updated`, `clarification.requested`, `clarification.responded`, `clarification.cancelled`, `review.closed`.

Activity titles distinguish System events from Officer events.

## 12. Demo scenarios

All labelled **DEMO / SYNTHETIC**. They do not represent a real officer, bidder, or government communication.

| Scenario | Bid | Item | Status |
| --- | --- | --- | --- |
| 1 Bayfront financial | BID-…-0001 | `REVIEW_REQUIRED` + assessment `EVIDENCE_SUFFICIENT` | `assessed` (historical clarification `responded`) |
| 2 Delta GST ↔ MCA | BID-…-0002 | `CROSS_SOURCE_INCONSISTENCY` | `open` |
| 3 Harbour MCA unavailable | BID-…-0003 | `SOURCE_UNAVAILABLE` / `INSUFFICIENT_EVIDENCE` | `open` |
| 4 Missing Udyam evidence | BID-…-0002 | `EVIDENCE_MISSING` | `clarification_requested` |
| 5 Bayfront technical | BID-…-0001 | `REVIEW_REQUIRED` | `clarification_requested` |

## 13. AI boundaries

Slice 7 does **not** use AI to decide fraud, eligibility, rejection, award, or tender outcome.

No automatic government communication. Clarification drafting, if added later, must remain **AI-ASSISTED / ADVISORY** and officer-submitted.

## 14. Tests

* Unit: lifecycle transitions, note validation (`ok` rejected), candidates (no fraud language), schemas (`officerId` rejected, `limit` → `pageSize`), activity titles
* HTTP (when `DATABASE_URL` is set): list/filter, start, assessment, immutability of machine finding, assessment history, closure rules, reviewer 403, cross-bid 404, clarification + safe audit
* Frontend: review queue, filters, detail, evidence navigation, machine vs officer, required notes, clarification modal, reviewer read-only, Bid Detail Review tab, empty and error states

If Postgres is unavailable: `HTTP/API tests skipped — database unavailable.`

## 15. Known limitations

* Clarification is in-app only; there is no bidder portal and no email
* Demo responses are synthetic
* Global review queue does not re-sync every list request (seed + bid-scoped GET cover demos)
* No deadline / `EXPIRED` clarification state
* No AI drafting
* Closing a review is not a procurement decision
* Coverage remains Evidence Coverage, not a compliance or risk score

## 16. Future work

Later slices may add a procurement decision workflow, richer clarification delivery, or advisory summaries. They must not treat Slice 7 assessments as awards, and they must not add unofficial government scraping, fake official APIs, fraud scores, bid ranking, or automatic qualification.
