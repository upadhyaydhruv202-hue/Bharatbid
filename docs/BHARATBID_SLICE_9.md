# BharatBid — Slice 9

Comparative Bid Evaluation & Officer Decision-Support on top of Slices 1–8. Runtime remains `backend/src/problem/`. This slice is **decision support**. It does not rank bidders, select winners, reject bids, or award tenders.

```text
Tender
   ↓
Requirements
   ↓
Bid Submissions
   ↓
Evidence
   ↓
Verification
   ↓
Cross-Verification
   ↓
Requirement Intelligence
   ↓
Officer Review
   ↓
Attention Intelligence
   ↓
COMPARATIVE EVALUATION
   ↓
OFFICER DECISION RECORD
```

The officer questions are:

* How do these bids compare against the tender requirements and available evidence?
* What information supports my evaluation?
* What decision should I record based on my professional judgement?

## 1. Objective

Give authorized officers a comparative workspace that consolidates Slices 1–8. The system never claims a winner, a best bidder, automatic selection, automatic rejection, fraud, or government approval.

> BharatBid does not automatically rank bidders, select winners, reject bids, or award tenders. The evaluation workspace consolidates evidence and system findings to support authorized human procurement officers.

## 2. Evaluation architecture

One `TenderEvaluation` per tender. Officer notes and decisions are append-only (`EvaluationNote`, `EvaluationDecision`). Comparison is computed on read from existing services:

```text
GET comparison
        ↓
evaluable bids (submitted / under_review / finalized)
        ↓
batch documents, latest verifications, latest cross-checks, reviews
        ↓
evaluateRequirement() (Slice 6) + BidAttentionService (Slice 8)
        ↓
requirement matrix + separate metrics + readiness
```

No composite winner score. Attention, evidence coverage, verification, and cross-checks remain separate dimensions.

## 3. Comparison workflow

1. Open `/bharatbid/evaluation` (tenders that already have submitted bids).
2. Open a tender workspace.
3. Select 2–4 bids (default first 3 by submission reference).
4. Inspect the comparison table and requirement matrix.
5. Click a cell to trace documents, verification, cross-checks, and reviews.
6. Start the evaluation, record notes, then record an officer decision-support state.

Draft and withdrawn bids are excluded.

## 4. Requirement comparison

Each active tender requirement is a row. Each compared bid is a column. Cell statuses reuse Slice 6 terminology and are **not** recast as FAIL:

| Cell | Meaning |
| ---- | ------- |
| `PASS` | Machine evaluation `pass` |
| `EVIDENCE_MISSING` | No associated evidence |
| `PROCESSING` | Evidence still processing |
| `CONFLICT` | Evidence/verification conflict |
| `REVIEW_REQUIRED` | Officer review required |
| `NOT_EVALUATED` | Not yet evaluated |

`EVIDENCE_MISSING` is never converted to `FAIL` in this slice.

## 5. Evidence traceability

Every requirement cell can be opened to show:

* requirement name and explanation
* supporting documents (links into Bid → Documents)
* verification id/source/status
* cross-check id/type/status
* related review items
* navigation into existing Bid Detail tabs

Document bytes are not returned by the comparison API.

## 6. Verification integration

Latest Slice 5 verification records are summarized per bid (`Matched` / `Mismatch` / `Issues` / `Not run`). Comparison does not re-run verification.

## 7. Cross-check integration

Latest Slice 6 cross-checks are summarized (`Consistent` / `Inconsistent` / `Not comparable` / `Not run`). Comparison does not re-run cross-checks.

## 8. Review integration

Slice 7 review items are counted per bid: open, in review, clarification requested, assessed, closed. Officer assessments remain on the review record; evaluation decisions are a separate officer-entered history.

## 9. Attention integration

Slice 8 scores are displayed as **Officer Review Priority** (`score / 100` plus band). The existing Slice 8 disclaimer is shown. The score is not used as ranking, winner score, bid quality, or procurement merit.

## 10. Evaluation status

Explicit officer transitions only:

```text
NOT_STARTED → IN_PROGRESS → READY_FOR_DECISION → DECISION_RECORDED
```

Evidence completeness does **not** auto-complete the evaluation. Notes and decisions are allowed from `in_progress` onward. `DECISION_RECORDED` requires at least one officer decision-support record and an explicit officer action.

## 11. Officer notes

Append-only. Session identity only. Minimum 20 characters; trivial acknowledgements (`ok`, `fine`) are rejected. Optional `bidSubmissionId` scopes a note to one bid on the same tender. Historical rows stay visible (`isLatest`, `attemptNumber`).

## 12. Decision recording

Neutral officer-entered states:

* `accepted_for_further_evaluation`
* `requires_clarification`
* `not_recommended_for_further_evaluation`

Each row stores decision, reason, officer identity, timestamp, and version. This is **not** an award, rejection, disqualification, or automated system decision.

## 13. Decision history

`GET /api/v1/evaluations/:id/history` returns notes, decisions, and audit activity. New records append; previous rows are not rewritten.

## 14. RBAC

| Role | View / compare | Create / start / notes / decisions |
| ---- | -------------- | ---------------------------------- |
| Reviewer (`bids.read`) | Yes | No |
| Procurement officer (`bids.write`) | Yes | Yes |

No new permission keys. Frontend identity fields are ignored; Zod `.strict()` rejects `officerId` / `createdById` / `decidedBy`.

## 15. Security

* Current user comes from the session.
* Evaluation is scoped to its tender.
* `bid.tenderId` must equal `evaluation.tenderId`.
* Comparison `bidIds` from another tender return validation errors.
* Identifiers (PAN, GSTIN, CIN, Udyam), extracted text, and secrets are not written to audit metadata.

## 16. Audit

| Action | When |
| ------ | ---- |
| `evaluation.created` | Workspace created |
| `evaluation.started` | Officer starts evaluation |
| `evaluation.note.created` | Note appended |
| `evaluation.decision.recorded` | Decision appended |
| `evaluation.status.changed` | Ready / recorded transitions |

Resource: `evaluation`.

## 17. Demo scenarios

CPCL valves tender (`GEM/2026/B/CPCL/001`) remains the SIH story. Delta (`BID-GEM2026BCPCL001-0002`) is a **submitted** bid so three evaluable bids can be compared without destroying Slice 1–8 documents, verifications, reviews, or attention data.

| Bid | Story |
| --- | ----- |
| Bayfront (`…-0001`) | Strong evidence, matched verification, consistent cross-checks, low review priority |
| Delta (`…-0002`) | Missing / conflicting evidence, verification mismatch, open review, clarification pending, high review priority |
| Harbour (`…-0003`) | Partial evidence, source-unavailable signals, moderate/elevated priority |

Seeded evaluation is `in_progress` with one tender-wide officer note. Live decision recording is left for the demonstration. All data remains **DEMO / SYNTHETIC**.

Financial bid amounts are **not** in `BidSubmission`. The UI shows “Not available in current bid data”.

## 18. AI boundaries

No ranking model, winner prediction, award recommendation, or new ML training. Optional AI comparison summaries were **not** added in this slice so advisory language cannot drift into award recommendations. Deterministic Slice 5–8 facts remain authoritative.

## 19. Limitations

* Bid amount / price comparison is out of scope until the bid model stores financial values.
* Comparison loads at most four columns at once (horizontal scroll + selectable columns).
* Readiness (`READY` / `REVIEW_REQUIRED` / `EVIDENCE_INCOMPLETE` / `CLARIFICATION_PENDING`) is workflow context, not eligibility or award.
* Checklist items are derived from system state and cannot be ticked to hide unresolved issues.
* Live government registries remain unused.

### Readiness logic

```text
if pending clarifications → CLARIFICATION_PENDING
else if mandatory evidence missing → EVIDENCE_INCOMPLETE
else if unresolved mandatory reviews or mandatory conflicts → REVIEW_REQUIRED
else → READY
```

`READY` does not mean the bid is eligible or should be awarded.

## 20. Future improvements

* Optional labelled AI-assisted comparison summary (advisory only)
* Financial comparison when bid amounts exist in the domain model
* Exportable evaluation pack for committee files
* Broader than four-column layouts with frozen panes

STOP after Slice 9. Do not implement automatic award, automatic rejection, bidder ranking, or Slice 10 unless explicitly requested.
