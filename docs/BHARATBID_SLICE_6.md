# BharatBid — Slice 6

Cross-Verification & Explainable Compliance Intelligence on top of Slice 1–5. Runtime remains `backend/src/problem/`. This slice is **decision support**. It does not approve, reject, disqualify, rank, or award bids.

```text
Tender
   ↓
Tender Requirements
   ↓
Bid Submission
   ↓
Documents
   ↓
Extracted Evidence
   ↓
Government/Source Verification (Slice 5 DEMO adapters)
   ↓
Cross-Source Consistency
   ↓
Requirement Evidence Mapping
   ↓
Officer Review
```

## 1. Objective

Officers can compare completed source-verification snapshots, see field-level agreement or difference, and inspect whether each tender requirement has associated evidence. Every status is explainable and linked back to documents, extractions, and verification rows.

The system does **not** make a procurement decision.

## 2. Cross-verification architecture

```text
Latest BidVerification rows (GST / MCA / Udyam)
        ↓
POST /bids/:id/cross-verifications
        ↓
Authorize bid + verification ownership
        ↓
compareVerificationPair (deterministic)
        ↓
Persist BidCrossVerification (immutable row, groupId + attemptNumber)
        ↓
Audit + requirement evidence mapping
```

Completed rows are not edited. A later run marks previous rows for that comparison type `isLatest = false` and inserts a new attempt.

## 3. Supported comparison types

| Type | Sources | Fields compared |
| --- | --- | --- |
| `gst_mca` | GST ↔ MCA | Legal name, state |
| `gst_udyam` | GST ↔ Udyam | Legal name, state |
| `mca_udyam` | MCA ↔ Udyam | Legal name, state |

GSTIN is not compared to CIN or Udyam numbers. GeM is not comparable in this slice.

## 4. Field matching

Reuses Slice 5 `normalizeComparableText` / `normalizeStateName`. There is no second normalizer.

Field outcomes:

* `exact_match`
* `normalized_match` (for example Pvt. Ltd. vs Private Limited)
* `difference`
* `missing_from_left` / `missing_from_right`
* `not_comparable`

Overall statuses: `consistent`, `inconsistent`, `insufficient_evidence`, `not_comparable`, `error`.

A source `error` or `not_found` yields **insufficient evidence**, not inconsistent, and never fraud language.

## 5. Source modes

All Slice 5 adapters remain DEMO. Cross-check `sourceBasis`:

* `demo` — both underlying checks are simulated
* `external` — reserved; both would be official
* `mixed` — the two checks disagree on mode

UI shows **DEMO SOURCE** / **SIMULATED SOURCE**. Mixed basis shows **MIXED SOURCE BASIS** and must not be presented as an official government verification.

## 6. Requirement intelligence

Computed on the backend for the bid’s tender requirements. Evidence is mapped by linked `tenderRequirementId` or by document type for the small rule set:

| Rule | Typical requirement | Machine evaluation |
| --- | --- | --- |
| `gst_verification` | GST certificate / GSTIN | PASS only if document exists and GST verification is `matched` (and no inconsistent cross-check) |
| `udyam` | Udyam / MSME | Same pattern against Udyam verification |
| `cin_verification` | CIN / incorporation | Same pattern against MCA |
| `pan_document` | PAN | Evidence available → **review required** (no PAN source) |
| `officer_review` | Technical, financial, experience | Evidence available → **review required** |

**Evidence available** is not **requirement compliant**. PASS is an evidence signal, not an award.

Missing mandatory evidence is `evidence_missing` / `not_evaluated`, not automatic FAIL.

## 7. Evidence coverage

`evidenceCoveragePercent` is **Evidence Coverage**: share of **mandatory** requirements that have relevant evidence (`evidence_available`, `evidence_conflict`, or `evidence_processing`).

It is never labelled a compliance score, trust score, bid quality score, or AI score.

## 8. Review queue

GET intelligence (and GET `/review-items`) returns a work list of:

* requirements that need officer attention
* inconsistent cross-checks

There is no Approve / Reject / Resolve action in this slice.

## 9. Human-in-the-loop boundaries

Not implemented and must not be inferred from statuses:

* automatic bid approval or rejection
* automatic disqualification or qualification
* award recommendation
* fraud / criminality / fake-bidder claims
* Mark Compliant / Force Pass
* officer decision or clarification workflow

Non-deterministic requirements always show **Officer review required**.

## 10. APIs

All under `/api/v1`. Standard envelopes.

| Method | Path |
| --- | --- |
| `GET` | `/bids/:id/cross-verifications` |
| `POST` | `/bids/:id/cross-verifications` |
| `GET` | `/bids/:bidId/cross-verifications/:id` |
| `GET` | `/bids/:bidId/cross-verifications/:id/activity` |
| `GET` | `/bids/:id/requirement-intelligence` |
| `GET` | `/bids/:id/review-items` |
| `GET` | `/bids/:id` includes `intelligenceSummary` |

POST body (strict): `{ leftVerificationId?, rightVerificationId?, comparisonType? }`. Both verification IDs or neither. Empty body runs all comparable **latest** pairs on that bid. Cross-bid IDs are rejected.

List query: `latestOnly` (default true).

## 11. Database

Prisma migration `20260830214000_bharatbid_cross_verifications`.

Table `bid_cross_verifications` (`BidCrossVerification`): bid, bidder, left/right `BidVerification` FKs, `comparisonType`, `status`, `sourceBasis`, source display names and modes, `fieldComparisons` JSON, `explanation`, `groupId`, `attemptNumber`, `isLatest`.

Requirement evaluations and review items are **not** a second mutable table; they are derived from current documents, latest verifications, and latest cross-checks so they cannot silently drift from Slice 5 results.

## 12. RBAC

Reuses bid permissions (no new catalog keys).

| Role | Access |
| --- | --- |
| procurement_officer (`bids.write`) | run cross-checks, view results, intelligence, review queue |
| reviewer (`bids.read`) | view only |
| unauthenticated / missing `bids.read` | 401 / 403 |

## 13. Security

* Authentication and bid-scoped authorization
* Verification IDs must belong to the path bid
* Controlled comparison enum — no user-supplied URLs
* No unofficial scraping or fake government endpoints
* Completed cross-checks are not PATCH-editable
* Audit redaction still covers identifiers, snapshots, and extracted text

## 14. Audit

| Action |
| --- |
| `cross_verification.requested` |
| `cross_verification.completed` |
| `cross_verification.inconsistent` |
| `requirement.evaluation.completed` |
| `review_item.created` |

Metadata stores comparison type, status, source basis, and record IDs — not identifier values or document text.

## 15. Demo scenarios

Seeded synthetic data (not government records):

| Scenario | Bid | Expected |
| --- | --- | --- |
| A Consistent | BID-GEM2026BCPCL001-0001 (Bayfront) | GST↔MCA, GST↔Udyam, MCA↔Udyam **CONSISTENT**; GST requirement can PASS; technical experience **REVIEW_REQUIRED** |
| B Inconsistent | BID-GEM2026BCPCL001-0002 (Delta GST vs MCA name) | GST↔MCA **INCONSISTENT** |
| C Insufficient | BID-GEM2026BCPCL001-0003 (Harbour GST/MCA not found) | GST↔MCA **INSUFFICIENT_EVIDENCE** |
| D Missing evidence | Bids 0002 / 0003 mandatory PAN/technical/financial without documents | **EVIDENCE_MISSING** (not FAIL) |
| E Officer review | Bid 0001 technical capability + experience certificate | Evidence available, **REVIEW_REQUIRED** |

## 16. Tests

* Unit: GST↔MCA consistent / inconsistent / normalized match, GST↔Udyam, insufficient (not found and source error), not comparable, DEMO and mixed basis, field outcomes, GST PASS, missing evidence not FAIL, PAN/technical review required, schemas, activity titles
* HTTP (when `DATABASE_URL` is set): consistent demo cross-check + GST PASS, inconsistent names, insufficient MCA not found, cross-bid 400, reviewer 403 POST / 200 GET, PATCH 404, audit without identifier values
* Frontend: Cross-Checks and Requirements tabs, consistent / inconsistent / insufficient, DEMO SOURCE, matrix, coverage label, review queue, evidence missing, officer review, reviewer read-only, empty and error states

If Postgres is unavailable: `HTTP/API tests skipped — database unavailable.`

## 17. Known limitations

* All sources remain DEMO
* Only legal name and state are cross-compared
* No persisted requirement-evaluation table (derived on read)
* Review items cannot be resolved in this slice
* Coverage is evidence coverage, not eligibility
* Activity is empty if the audit store is unavailable
* GeM is still a catalog stub

## 18. Future work

Later slices may add richer compliance rules, officer clarification, risk intelligence, advisory AI summaries, and a procurement decision workflow. They must not treat Slice 6 PASS as an award, and they must not add unofficial government scraping or fake official APIs.
