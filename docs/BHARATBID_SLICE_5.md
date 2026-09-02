# BharatBid — Slice 5

Government Source Verification & Verification Intelligence Foundation on top of Slice 1–4. Runtime remains `backend/src/problem/`. All adapters in this slice are **DEMO / MOCK**. They do not call government APIs, scrape websites, or present mock data as an official response.

This slice does **not** implement cross-verification, compliance percentages, risk or fraud scores, AI decisions, officer qualification, or award recommendations.

## 1. Objective

Procurement officers can compare extracted (or manually entered) bidder identifiers against structured **demo source records** and inspect an explainable, immutable result.

```text
Tender
   ↓
Requirement
   ↓
Bid Submission
   ↓
Document Evidence
   ↓
Extracted Information
   ↓
Verification Adapter
   ↓
Source Record
   ↓
Verification Result
```

A document is **evidence**. Extracted text is **machine-extracted information**. Only an adapter lookup produces a verification result.

## 2. Verification architecture

```text
POST /bids/:id/verifications
        ↓
Validate bid, document, identifier type, source
        ↓
Resolve identifier (extracted → manual → bidder profile)
        ↓
AdapterRegistry.require(source)
        ↓
Adapter.lookup (synchronous for demo adapters)
        ↓
Field comparison
        ↓
Persist BidVerification (immutable row)
        ↓
Audit events
```

Statuses: `not_started`, `queued`, `processing`, `matched`, `mismatched`, `not_found`, `error`.

There is no `AUTHENTIC` or `FRAUDULENT` state. Queue values exist for future real adapters; Slice 5 demo lookups complete in the same request.

## 3. Adapter architecture

`VerificationAdapter` (`backend/src/problem/verification/types.ts`) exposes:

* `source`, `displayName`, `mode`
* `supportedIdentifierTypes`
* `availability()`
* `lookup({ identifierType, identifier })`

`VerificationAdapterRegistry` is a **server-side** catalog. Clients send `source: gst | mca | udyam | gem`. Arbitrary URLs are rejected (Zod `.strict()` plus enum). Adapters never fetch user-supplied hosts (SSRF protection).

## 4. Source catalog

| Source | Display name | Identifiers | Slice 5 implementation |
| --- | --- | --- | --- |
| `gst` | DEMO GST Registry | GSTIN | Mock registry |
| `mca` | DEMO MCA Registry | CIN | Mock registry |
| `udyam` | DEMO UDYAM Registry | Udyam | Mock registry |
| `gem` | DEMO GeM Registry | none | Catalog stub only |

GeM is listed as available and DEMO. It does not look up GSTIN/CIN/Udyam/PAN.

## 5. DEMO vs EXTERNAL

Every result stores `sourceMode`:

* `demo` — simulated adapter (all Slice 5 adapters)
* `external` — reserved for a future official integration

`sourceMode` is immutable on a completed row. A demo result cannot later appear as an external verification.

UI always shows **DEMO SOURCE** and:

> Demo source — simulated verification data. Not an official government response.

Never: “Verified by GST Government API”, “officially verified”, “live government result”.

## 6. Identifier types

| Type | Use in Slice 5 |
| --- | --- |
| `gstin` | GST adapter |
| `cin` | MCA adapter |
| `udyam` | Udyam adapter |
| `pan` | **Not verifiable** — no authorized PAN source. POST rejects `pan`. |

Origin is recorded as `extracted`, `manual`, or `bidder_profile`. Manual entry is labelled **Manually entered identifier**.

## 7. Verification lifecycle

1. Officer (or admin with `bids.write`) requests a check.
2. Server validates access, source, and identifier format.
3. Duplicate request within 5 seconds with the same bid/source/type/value/document returns the existing row.
4. Lookup runs on the registered adapter.
5. A new `BidVerification` row is inserted (`groupId` + `attemptNumber`). Previous rows in the group stay as history (`isLatest = false`).
6. Retry is allowed **only** when `status = error`. Retry creates a new attempt; it never edits MATCHED/MISMATCHED.

There is no “Mark as Verified” or officer override of MATCHED/MISMATCHED.

## 8. Matching logic

Deterministic. No AI.

* Identifiers (GSTIN, CIN, Udyam): exact comparison after trim/uppercase.
* Legal names: punctuation/case collapse; `Pvt`/`Ltd` → `PRIVATE`/`LIMITED`. Identical normalized strings → `match`. High token overlap → `potential_match` (not fraud). Otherwise `mismatch`.
* State: normalized names (TN → Tamil Nadu, etc.).
* Registry status is shown from the source; it is `not_compared` when the document did not claim a status.

Overall: any hard `mismatch` → `mismatched`; otherwise `matched`. `potential_match` does not flip the overall result to mismatched.

## 9. Field-level comparison

Each result stores `fieldComparisons`: field, label, outcome, claimed value, claimed origin, source value, note.

Outcomes: `match`, `mismatch`, `potential_match`, `review_required`, `not_compared`.

Mismatch copy: document value vs source value + “This difference requires officer review.” Not “fraud” or “fake document”.

Not found: “This does not by itself prove that the bidder is invalid.”

## 10. Mock source architecture

Fixtures live in `backend/src/problem/verification/fixtures.ts` (not in controllers).

Synthetic GST examples include:

* `33AAAPB1234C1Z5` — Bayfront Engineering (match vs demo bid 0001)
* `24ABCDE1234F1Z5` — ABC Technologies, Gujarat
* `29AACPD3456E1Z8` — Southern Petrochem Wholesale (mismatch vs Delta Petrochem Traders)
* `27AAEPF5678G1Z4` — Frontier Labs Consumables
* `00ERROR1234E1Z5` — simulated `SOURCE_UNAVAILABLE`

MCA: `U29120TN2014PTC095001`. Udyam: `UDYAM-TN-02-0001001`.

## 11. Database

Prisma migration `20260830203000_bharatbid_verifications`.

Table `bid_verifications` (`BidVerification`): bid, bidder, optional document, `groupId`, `attemptNumber`, `isLatest`, identifier fields, `source`, **immutable** `sourceMode`, snapshot JSON, field comparisons JSON, timestamps.

Indexes: bid+createdAt, bid+isLatest, bidder, document, identifierType, source, status, group+attempt.

Slice 1–4 tables are not reset.

## 12. APIs

All under `/api/v1`. Standard success/error envelopes.

| Method | Path |
| --- | --- |
| `GET` | `/verification-sources` |
| `GET` | `/bids/:id/verifications` |
| `POST` | `/bids/:id/verifications` |
| `GET` | `/bids/:bidId/verifications/:id` |
| `POST` | `/bids/:bidId/verifications/:id/retry` |
| `GET` | `/bids/:bidId/verifications/:id/activity` |
| `GET` | `/bids/:id` includes `verificationSummary` |

POST body: `{ source, identifierType, identifier?, documentId? }`. Extra fields such as `url` are rejected.

List query: `source`, `status`, `identifierType`, `latestOnly` (default true), `page` / `pageSize`.

Adapter error codes: `SOURCE_UNAVAILABLE`, `SOURCE_TIMEOUT`, `RECORD_NOT_FOUND`, `INVALID_IDENTIFIER`, `UNSUPPORTED_IDENTIFIER`. Stack traces are not returned.

## 13. RBAC

Reuses bid permissions (no new catalog keys).

| Role | Access |
| --- | --- |
| procurement_officer (`bids.write`) | initiate, retry, view |
| reviewer (`bids.read` only) | list, detail, source catalog, field comparison |
| unauthenticated / missing `bids.read` | 401 / 403 |
| admin | existing catalog |

Reviewers cannot POST or retry. Frontend hiding is not sufficient; routes use `requirePermission`.

## 14. Security

* Authentication on every verification route
* Bid-scoped authorization (verification id must belong to the path bid)
* Document must belong to the bid when `documentId` is sent
* Controlled source enum only — no user URLs, no SSRF
* Mock responses come from trusted fixtures, not request bodies
* Secrets never stored on verification rows
* Audit redaction includes `identifierValue` and `sourceSnapshot`
* No PAN verification endpoint in this slice

## 15. Audit

Existing `AuditService`. Resource is the **bid**; `verificationId` is in completion metadata.

| Action |
| --- |
| `verification.requested` |
| `verification.completed` |
| `verification.mismatched` |
| `verification.not_found` |
| `verification.failed` |
| `verification.retried` |

Identifier values and extracted document text are not logged.

## 16. UI

Bid detail tabs: **Overview | Documents | Verification | Activity**.

Route `/bharatbid/bids/:id/verification` opens the Verification tab.

Workspace includes: counts from real records, source catalog (all DEMO), table (identifier, type, document, source, DEMO SOURCE, result, checked at, View), detail (fields, snapshot, timeline from actual timestamps, history), mismatch / not-found / error copy, Retry on ERROR only, manual identifier labelled as such.

Document preview: **Verify GSTIN / CIN / Udyam** when the document type supports it, using extracted values when present.

Extraction confidence remains separate from verification status. No compliance %, risk score, or “bidder is compliant”.

## 17. Demo scenarios

Seeded synthetic data (not government records):

| Scenario | Bid | Identifier | Result |
| --- | --- | --- | --- |
| A Match | BID-GEM2026BCPCL001-0001 | GSTIN `33AAAPB1234C1Z5` (+ CIN, Udyam) | MATCHED |
| B Mismatch | BID-GEM2026BCPCL001-0002 | GSTIN `29AACPD3456E1Z8` vs Southern Petrochem name | MISMATCHED |
| C Not found | BID-GEM2026BCPCL001-0003 | Harbour GSTIN not in demo GST registry | NOT_FOUND |
| D Error | BID-GEM2026BCPCL002-0001 | `00ERROR1234E1Z5` | ERROR (retryable) |

Officers can also run ABC Technologies `24ABCDE1234F1Z5` as a clean match against DEMO GST.

## 18. Tests

* Unit: adapter registry, GST mock match/not-found/error, unsupported identifier, exact GSTIN, legal-name normalize, mismatch, extraction of labelled GSTIN, schema SSRF/PAN rejection, activity titles
* HTTP (when `DATABASE_URL` is set): match + snapshot + audit, mismatch/not-found/error/retry/history, reviewer 403 POST / 200 GET, URL field rejected, GeM+GSTIN rejected, document-linked extraction
* Frontend: list, DEMO badge, matched/mismatch/not-found/error, retry, reviewer read-only, empty state, document Verify GSTIN, bid tabs

If Postgres is unavailable: `HTTP/API tests skipped — database unavailable.`

## 19. Known limitations

* All sources are DEMO. There is no live GST / MCA / Udyam / GeM connectivity
* PAN cannot be verified
* GeM adapter does not look up identifiers
* Lookups are synchronous; `queued` / `processing` are unused in Slice 5
* Legal-name matching is conservative (normalized equality or high overlap), not a linguistic identity proof
* Activity is empty if the audit store is unavailable
* Demo GSTIN values are synthetic and must not be treated as real taxpayer data

## 20. Future real-government integration strategy

```text
VerificationService
       ↓
AdapterRegistry
       ↓
GstAdapter (new implementation of VerificationAdapter)
       ↓
Official GST API (server-side credentials only)
```

A future official adapter would:

1. Keep the same `VerificationAdapter` interface
2. Return `sourceMode: external` only when a real configured integration succeeds
3. Read credentials from environment variables, never from the frontend or source control
4. Map provider errors to `SOURCE_UNAVAILABLE` / `SOURCE_TIMEOUT` / `RECORD_NOT_FOUND`
5. Store a **normalized snapshot**, not raw provider secrets or full payloads
6. Remain behind feature flags and allowlists

Do not implement unofficial scraping, CAPTCHA bypass, or fake “government verified” UI if the adapter is still a mock.
