# BharatBid — Slice 8

Explainable Bid Risk & Officer Attention Intelligence on top of Slices 1–7. Runtime remains `backend/src/problem/`. This slice is **decision support**. It does not approve, reject, disqualify, rank, or award bids. It does not estimate fraud, bidder quality, or win probability.

```text
Tender
   ↓
Requirements
   ↓
Bid
   ↓
Evidence
   ↓
Verification
   ↓
Cross-Verification
   ↓
Requirement Intelligence
   ↓
Review Items
   ↓
Officer Assessments
   ↓
Attention Intelligence
```

The officer question is: **which bids require my attention first, and why?**

## 1. Objective

Consolidate deterministic signals from Slices 4–7 into an **Officer Attention Score** (review priority) with an explicit factor breakdown. The score is not a finding of fraud, misconduct, ineligibility, or bid rejection.

Product language:

* **Officer Attention Score** / **Review Priority**
* Review-priority bands (Low → Critical)
* **Evidence Coverage** remains evidence availability, not compliance

## 2. Attention intelligence architecture

Scores are **computed on read**. There is no mutable score table and no ML model. `modelVersion: "attention-v1"` identifies the deterministic rule set.

```text
GET list/summary/detail
        ↓
batch load bids, reviews, latest verifications, latest cross-checks, current documents, tender requirements
        ↓
evaluateRequirement() (Slice 6) + persisted BidReviewItem (Slice 7)
        ↓
scoreAttention() pure function
        ↓
API envelope
```

The frontend cannot submit `score`, `band`, or `factorPoints`. Extra query fields named `score` / `factorPoints` are stripped.

## 3. Scoring methodology

### Formula

```text
Attention Score =
  min(100, max(0,
    cap(Evidence Factors, 40)
  + cap(Verification Factors, 30)
  + cap(Cross-Verification Factors, 25)
  + cap(Source-availability Factors, 16)
  + cap(Review Factors, 24)
  + cap(Processing Factors, 10)
  ))
```

Each factor has:

* `originalPoints` — the documented weight before officer adjustment and before the current-point cap
* `currentPoints` — contribution after officer/clarification state and category caps

```text
unadjustedScore = same formula using original (pre-officer) points, still capped
score           = formula using current points
```

A clean evidence set produces **low review priority**. It does not mean **trusted bidder**. There are no positive “good bidder” points.

## 4. Scoring factors and weights (`attention-v1`)

| Factor | Type | Origin | Points | Category |
| --- | --- | --- | --- | --- |
| Mandatory evidence missing | `mandatory_evidence_missing` | Machine | 20 | evidence |
| Optional evidence missing | `optional_evidence_missing` | Machine | 5 | evidence |
| Evidence still processing | `evidence_processing` | Machine | 5 | processing |
| Verification mismatch | `verification_mismatch` | Machine | 20 | verification |
| Verification not found | `verification_not_found` | Machine | 10 | source_availability |
| Verification error | `verification_error` | Machine | 8 | source_availability |
| Cross-source inconsistency | `cross_source_inconsistency` | Machine | 22 | cross |
| Evidence conflict | `evidence_conflict` | Machine | 18 | cross |
| Cross insufficient evidence | `cross_insufficient_evidence` | Machine | 8 | source_availability |
| Cross source error | `cross_source_error` | Machine | 8 | source_availability |
| Officer review required | `officer_review_required` | Human | 12 | review |
| Requirement unevaluated | `requirement_unevaluated` | Human | 8 | review |

MATCHED / CONSISTENT / NOT_COMPARABLE add **no** negative factor.

NOT_FOUND and ERROR are **source limitations**, not fraud.

Optional unused requirements (Slice 6 `not_evaluated` with no evidence) do **not** add points unless a persisted review item exists for that gap.

Qualitative `review_required` / `requirement_unevaluated` contribute from **persisted review items** only, so the officer workflow is the source of those human factors. Missing evidence, verification, and cross-check signals still contribute from live state even without a review row.

## 5. Caps

| Category | Cap | Purpose |
| --- | --- | --- |
| evidence | 40 | Several missing documents cannot alone reach 100 |
| verification | 30 | Identity mismatches cannot dominate |
| cross | 25 | Cross-check differences cannot dominate |
| source_availability | 16 | Source outages cannot dominate |
| review | 24 | Open qualitative reviews cannot dominate |
| processing | 10 | In-flight extraction cannot dominate |

When a cap reduces a factor, `adjustmentReason` states the reduction. `originalPoints` remain visible.

## 6. Deduplication

Related signals share cluster keys (`requirement:{id}`, `verification:{id}`, `source:{gst|mca|udyam}`, `cross:{id}`, `comparison:{type}`, `identity:gst_mca`).

Persisted review items are scored first. Leftover machine signals are added only if they do not overlap those keys.

**Example:** GST verification MISMATCHED + GST ↔ MCA INCONSISTENT + the Slice 7 review item for that comparison count **once** (the review item, 22 points). They are not stacked.

## 7. Officer assessment effect

Machine findings are never deleted.

| Review state | Current contribution |
| --- | --- |
| `open`, `in_review`, `clarification_requested` | Full `originalPoints` |
| `assessed` + `explanation_accepted` / `evidence_sufficient` / `not_applicable` | **0** (original remains visible) |
| `assessed` + `confirmed` / `evidence_insufficient` | Full points (issue still needs attention) |
| `closed` | **0** (historical activity remains) |

Example:

```text
Original factor: Cross-source inconsistency +22
Officer assessment: Explanation accepted
Current attention contribution: 0
```

History on the intelligence payload shows `unadjustedScore → score` with the adjustment reason. Snapshots are not persisted; history is derived on read.

## 8. Clarification effect

| Clarification | Effect |
| --- | --- |
| `requested` | Issue stays visible; current points unchanged |
| `responded` | Issue stays pending officer review; current points unchanged; never auto-closed |
| later assessed/closed | Current score follows §7 |

## 9. Score bands (review-priority bands, not legal conclusions)

| Score | Band |
| --- | --- |
| 0–20 | Low attention |
| 21–40 | Moderate attention |
| 41–60 | Elevated attention |
| 61–80 | High attention |
| 81–100 | Critical attention |

## 10. API

All routes require `bids.read`. There is no write/edit-score route.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/v1/intelligence/summary` | Band counts, open reviews, pending clarifications |
| GET | `/api/v1/intelligence/bids` | Priority table (default sort: score DESC) |
| GET | `/api/v1/bids/:id/intelligence` | Bid score, factors, history |
| GET | `/api/v1/bids/:id/intelligence/factors` | Factor list |
| GET | `/api/v1/bids/:id/intelligence/history` | Current vs unadjusted |

`GET /api/v1/bids/:id` includes `attentionSummary` (score, band, open issues, Evidence Coverage).

List filters (server-side): `band`, `tenderId`, `category`, `reviewStatus`, `verificationState`, `clarificationState`, `q` / `search`.

Sort: `score` (default), `evidence_coverage`, `last_activity`, `open_reviews`, `closing_date`.

Summary response uses **high-attention bids**, not “high risk bidders”.

## 11. Database / persistence

No new Prisma models. Compute on read from existing bid, document, verification, cross-check, requirement, and review tables.

Scan limit: 250 matching bids per list/summary request (sufficient for the demo corpus).

## 12. RBAC

| Role | View intelligence | Edit score |
| --- | --- | --- |
| Procurement officer (`bids.read`) | Yes | No endpoint exists |
| Reviewer (`bids.read`) | Yes | No |
| Unauthenticated | 401 | — |

Officer assessments continue to use `bids.write` (Slice 7). They change workflow state, which may change the **current** score; they do not PATCH the number.

## 13. Security

* Backend calculates the score
* Object-level: intelligence is loaded through `bidSubmission.findById`; missing bids return 404
* No cross-bid payload mixing
* POST `/bids/:id/intelligence` is not registered (404)

## 14. Audit

Score generation is not an auditable mutation. Ordinary request logs are sufficient. Slice 7 assessment/clarification/close events remain the audit trail for human actions that change current attention.

## 15. Demo scenarios (DEMO / SYNTHETIC)

Existing Slice 1–7 rows are reused. Bayfront technical/financial reviews are **closed** after `evidence_sufficient` so Scenario A is actually low attention, while the machine findings and historical clarifications remain.

| Scenario | Bid | Signals | Expected band |
| --- | --- | --- | --- |
| A Low | Bayfront `…-0001` | Matched verification, consistent cross-checks, mandatory evidence present, reviews closed | Low attention |
| B High | Delta `…-0002` | GST ↔ MCA inconsistency (open) + missing mandatory evidence + optional Udyam clarification | High attention |
| C Moderate/Elevated | Harbour `…-0003` | Source unavailable / insufficient evidence + some mandatory gaps | Moderate or elevated |
| D Evidence gap | Delta Udyam review | Optional missing + clarification requested (included in B) | Contributes to high attention on that bid |
| E Resolved | Bayfront financial/technical | Previous qualitative reviews closed; `unadjustedScore` > current `score` | Current low; history visible |

All calculations are labelled **DEMO / SYNTHETIC**.

## 16. AI boundaries

The authoritative score is **only** `scoreAttention()`. Existing AI infrastructure is not used. A future advisory summary, if added, must be labelled **AI-assisted summary — advisory** and must not replace the factor list.

Future versions could learn weights from historical procurement outcomes after governance, validation, and authorization. **Not implemented.**

## 17. Limitations

> The score is not statistically calibrated and is not a prediction of fraud, rejection, bidder quality or procurement outcome. It is a deterministic prioritization mechanism for this prototype.

* Not an official government risk assessment
* Not bidder ranking (no 1st/2nd/3rd)
* No automatic procurement decision
* History is derived on read, not a stored time series
* List scan capped at 250 bids
* Opening Bid Detail still syncs Slice 7 review items; the intelligence list does not sync every row (avoids N+1)

## 18. Future improvements

* Optional AI-assisted narrative of the deterministic factors
* Persisted snapshots if auditors need a frozen score at a point in time
* Calibrated weights only after authorized historical outcome data exists

Do not add automatic rejection, award recommendation, winner prediction, fraud probability, bidder trust scores, black-box ML, live government APIs, scraping, or an external bidder portal in this slice.
