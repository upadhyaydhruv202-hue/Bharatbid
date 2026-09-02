# BharatBid — Slice 10

Operational Command Center, Reporting, Notifications & End-to-End Procurement Visibility on top of Slices 1–9. Runtime remains `backend/src/problem/`. This slice **aggregates and presents** existing system information. It does not add a new score, ranking, AI model, compliance percentage, risk model, verification engine, or evaluation algorithm.

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
Comparative Evaluation
   ↓
COMMAND CENTER / ACTIVITY / REPORTS
```

The officer questions are:

* What tenders are active?
* What bids have arrived?
* What requires attention?
* What evidence is missing?
* What verification issues exist?
* What reviews are open?
* What clarifications are pending?
* Which evaluations are underway?
* What actions happened recently?

## 1. Objective

Upgrade `/bharatbid` into the primary **Procurement Intelligence Command Center**. Officers open one workspace and see KPIs, Officer Review Priority workload, evidence health, verification health, review and evaluation workload, recent activity, notifications, search, and report generation — all from Slices 1–9.

## 2. Command Center

Route: `/bharatbid` (existing overview, upgraded in place).

Hero: BharatBid / Procurement Intelligence Command Center / operational clock / environment / **DEMO / SYNTHETIC** when demo mode is on.

Quick actions are role-aware. Create Tender is hidden without `tenders.write`. Generate Report is officer-only (`bids.write`).

## 3. KPI aggregation

`GET /api/v1/bharatbid/dashboard` returns one payload:

| KPI | Source |
| --- | --- |
| Active tenders | Open + under evaluation |
| Submitted bids | `submitted` / `under_review` / `finalized` |
| Open reviews | Review items `open` + `in_review` |
| Pending clarifications | Open clarification requests |
| Evidence gaps | Requirement evidence status `evidence_missing` |
| Verification issues | Latest mismatched + not found + error |
| Evaluations in progress | `in_progress` + `ready_for_decision` |

Optional `?tenderId=` filters attention, evidence, verification, reviews, evaluations, and activity.

## 4. Attention workload

Officer Attention uses Slice 8 `BidAttentionService.commandSnapshot()` in **one** scoring pass:

* High = `high_attention` + `critical_attention`
* Moderate = `moderate_attention` + `elevated_attention`
* Low = `low_attention`

The queue lists bid reference, tender, bidder, Officer Review Priority, primary attention reason, and current review state. It is **not** a risk, bidder, winner, or quality ranking.

## 5. Evidence health

Counts from existing requirement intelligence evidence statuses:

* Evidence available
* Evidence missing
* Processing
* Conflicts
* Review required

Evidence Coverage terminology is unchanged. No new evidence score.

## 6. Verification health

Latest adapter results: Matched / Mismatched / Not Found / Error / Not Run, plus source breakdown (GST, MCA, Udyam, GeM). Every source is labelled **DEMO SOURCE**.

## 7. Review workload

Existing Slice 7 statuses: Open, In Review, Clarification Requested, Assessed, Closed. Links to `/bharatbid/review`.

## 8. Evaluation workload

Existing Slice 9 statuses: Not Started, In Progress, Ready for Decision, Decision Recorded. Tenders with evaluable bids and no evaluation record count as Not Started.

## 9. Activity timeline

`GET /api/v1/bharatbid/activity` and `/bharatbid/activity`.

Filters: tender, bid, bidder, event type, officer/system, date. Actor type is derived from the **action** (and `metadata.actor` when present), not assumed from a user id:

* **System** — extraction, verification completed/mismatch/not found, cross-check completed, requirement evaluation, review item created
* **Officer** — tender/bid/document writes, review start/assessment/clarification, evaluation notes/decisions/reports

Events deep-link to the related tender, bid, review, or evaluation record.

## 10. Notifications

Reuses `NotificationService` and the `notifications` table. No second inbox.

* Live events (bid submitted, verification issue, review created/started, clarification, evaluation started/decision) write in-app rows with `metadata.href`
* Seeded DEMO / SYNTHETIC notices for `demo.officer@example.com` correspond to existing seed bids
* Read/unread uses existing `readAt`
* Routes: header bell, `/bharatbid/notifications`, existing `/notifications`

## 11. Reporting

`GET /api/v1/tenders/:id/reports/evaluation?kind=evaluation|evidence|verification|review|decision`

Uses the existing `renderPdfDocument` renderer and storage. The officer downloads the PDF through the authenticated API. Storage keys are not returned to the client.

The full **Tender Evaluation Report** includes tender information, requirements, submitted bids, evidence, verification, cross-verification, review, Officer Review Priority, evaluation status, officer notes, officer decisions, and activity.

Every report includes:

> This report is a decision-support record generated from information available in the BharatBid system. It does not constitute an automatic procurement award, rejection, or government certification. Final decisions remain with authorized procurement officers.

Plus **DEMO / SYNTHETIC DATA**. PAN/GSTIN/CIN/Udyam, extracted text, and storage keys are omitted.

## 12. Security

Dashboard, activity, and search require existing `tenders.read` / `bids.read`. Report generation requires `bids.write` (officer). Reviewers can read the command center and cannot generate reports. IDs in the report path are bound to the requested tender; associated bids come from that tender only.

## 13. RBAC

No second RBAC catalog. Frontend hides Create Tender / Generate Report using `hasPermission`. Backend remains authoritative.

## 14. Audit

`evaluation.report.generated` records `tenderId` and `reportType` only. Notification read already has existing audit in the notification service. Dashboard page views are **not** audited (no flood of view events).

## 15. Demo scenarios

Existing Slices 1–9 synthetic data. The command center naturally shows:

* Scenario A — Bayfront: stronger evidence, matched verification, lower Officer Review Priority
* Scenario B — Delta: evidence gap, verification mismatch, cross-check inconsistency, open review, high Officer Review Priority
* Scenario C — Harbour / Kaveri: source limitation / insufficient evidence, moderate attention

All labelled **DEMO / SYNTHETIC**. No live government identifiers.

## 16. Performance

Dashboard uses batched repository queries plus a **single** Slice 8 scoring pass (`commandSnapshot`). It does not query each bid over HTTP, load document files, or persist a DashboardMetric table.

## 17. AI boundaries

Optional AI operational summary was **not** implemented. No winner model, ranking, award automation, rejection automation, fraud probability, or financial recommendation.

## 18. Limitations

* Global search covers tender reference/title, bidder legal/trade name, and bid/submission reference. It does not search PAN/GSTIN/CIN/Udyam.
* Report generation is synchronous for the SIH desktop demo.
* Notification seed rows exist only when `demo.officer@example.com` is present.
* Activity actor classification is action-based; a system verification result requested by an officer is still labelled System.

## 19. Future improvements

* Optional labelled AI-assisted operational summary (advisory only, fact-bound)
* Saved officer dashboard filters
* Async report jobs for large tenders
* Production government adapters remain out of scope until a later dedicated slice

STOP after Slice 10. Do not implement Slice 11, final cleanup, production government APIs, or winner ranking unless explicitly requested.
