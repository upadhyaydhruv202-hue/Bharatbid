# BharatBid — Slice 12

Final UI/UX, QA, and SIH demo polish. **No new product modules. No backend contract changes. No Slice 13.**

Audit first: [BHARATBID_SLICE_12_UI_AUDIT.md](BHARATBID_SLICE_12_UI_AUDIT.md).

## 1. Objective

Take the existing working BharatBid application and make it visually premium, consistent, evaluator-friendly, and demo-ready without rebuilding architecture.

## 2. UI / UX improvements

* Login is a SIH identity moment (BharatBid, problem statement 26100, DEMO / SYNTHETIC, seeded officer/reviewer accounts).
* Unauthenticated shell shows Sign in only — procurement nav appears after authentication.
* Global shell shows role + DEMO / SYNTHETIC + SIH adapter disclaimer.
* Command Center title, product story, clickable KPIs with “Open workspace”, Officer Review Priority panel.
* Bid workspace tabs write the URL (`/documents`, `/verification`, `/cross-checks`, `/requirements`, `/review`, `/intelligence`, `/evaluation`, `/activity`).
* Bid overview uses Provided / Not provided for PAN and GSTIN.
* Evaluation comparison uses full width, sticky first column, primary Generate report.
* Breadcrumbs standardized to Command Center as the home crumb.
* Notification preferences auto-load; bell closes on outside click.
* Tab strip scrolls horizontally on laptop widths.
* Readiness badges use sentence case.
* Requirement matrix states that evidence missing is not a Fail.

## 3. Bugs found

P0: Bid tabs did not update the URL; documents and activity deep links were missing; in-page tab jumps (Inspect factors, Open documents) still used `setTab` without navigation.

P1: Full procurement sidebar while logged out; no role/DEMO chip; Command Center duplicate titles; PAN/GSTIN shown as raw values; bid activity date-only timestamps; evaluation table collision while scrolling; notification preferences required a manual Load inbox click.

P2: Tab wrap on 1366px; Generate report easy to miss; inconsistent breadcrumbs (“BharatBid” vs Command Center); “Bid submissions” vs Bids; generic Submit-style labels on create forms.

## 4. Bugs fixed

* Bid tab `onChange` and in-page jumps call `navigate(pathForTab(...))`.
* Routes added for `/bharatbid/bids/:id/documents` and `/activity`.
* AppLayout login-only navigation before sign-in; `localStorage` cleared in layout tests.
* Presence labels, datetime on bid activity, sticky/full evaluation layout.
* Notification inbox auto-load; outside-click close; Refresh inbox (not Load inbox).
* Breadcrumb consistency; Create bid / Register bidder action labels.
* Evaluation and evaluation-list error states include Retry.

## 5. Routes verified

Verified by `App.tsx` inspection, frontend route tests, and backend HTTP tests (not a live browser click-through):

`/login` → `/bharatbid` → `/bharatbid/tenders` → `/bharatbid/tenders/:id` → `/bharatbid/bidders` → `/bharatbid/bids` → `/bharatbid/bids/:id` plus section suffixes → `/bharatbid/review` → `/bharatbid/review/:id` → `/bharatbid/intelligence` → `/bharatbid/evaluation` → `/bharatbid/evaluation/:tenderId` → `/bharatbid/activity` → `/bharatbid/notifications`.

Wildcard `*` still redirects to Command Center. `/notifications` remains a secondary preferences page (not primary nav).

## 6. Responsive / accessibility

* Tablist `overflow-x-auto` + nowrap.
* Evaluation workspace `width="full"`; list page `width="wide"`.
* KPI cards are keyboard-focusable links where they navigate.
* Login inputs are labelled and required.
* Notification bell has an accessible unread count.
* Skip-to-content already present on AppShell.

## 7. RBAC

* Officer: Create tender, Submit bid, Run verification, Generate report remain visible when `tenders.write` / `bids.write` is present. Frontend tests cover officer vs reviewer on bid, tender, and evaluation surfaces.
* Reviewer: mutation controls hidden; backend HTTP tests still assert 403 on tender/bid/verification/evaluation/report writes.
* Backend remains authoritative.

## 8. Starter Kit

* Removed from SIH chrome: Copilot, RAG, Anomaly, Intents, Automations, UI Kit, Starter Dashboard (already gone; Slice 12 did not restore them).
* Retained: `/notifications` preferences page, kit HTTP infrastructure, Compose project name `hackathon-starter-kit` (volume safety).
* Reason: dormant runtime/tests still depend on those paths; Slice 12 does not perform another destructive cleanup.

## 9. Tests / builds

| Suite | Result |
| --- | --- |
| Frontend lint | PASS |
| Frontend typecheck | PASS |
| Frontend unit | PASS — 106 tests |
| Frontend build | PASS |
| Backend lint | PASS |
| Backend typecheck | PASS |
| Backend unit + integration/API | PASS — 640 passed, 8 skipped (Redis/gitignore extras), Postgres healthy on Docker |
| Backend build | PASS |
| Workers lint / typecheck / unit | PASS — 2 tests |

## 10. Browser verification

**Not available.** This session has no browser MCP / Playwright UI runner. Verification used route inspection, frontend tests, backend API tests against real Postgres, lint, typecheck, and production builds.

Limitation: the canonical 15-minute click-through was not exercised in a real laptop browser here.

## 11. Remaining known issues

* CSS tokens still named `--hsk-*` (not user-visible).
* Bid tab label remains “Intelligence” (page copy is Officer Review Priority).
* Command Center “Verification issues” KPI opens Attention (`/bharatbid/intelligence`); there is no global verification list.
* Compose project name leftover `hackathon-starter-kit`.
* Live projector/browser walkthrough still required before the SIH slot.

## 12. Environment variables

None added or changed.

## 13. Demo walkthrough

See updated [BHARATBID_DEMO_GUIDE.md](BHARATBID_DEMO_GUIDE.md). Seed data (Bayfront, Delta, Harbour, `GEM/2026/B/CPCL/001`) was not reset.
