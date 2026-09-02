# BharatBid — Slice 12 UI/UX audit

Forensic inspection of `frontend/src/` before Slice 12 polish. No code was changed for this document.

## Product surface inspected

Login, AppShell/sidebar/header, Command Center, Tenders (list/create/detail), Bidders, Bids (list/create/detail + panels), Review queue/detail, Intelligence, Evaluation list/workspace, Activity, Notifications, report download actions, StatusBadge, KPIs, forms, SessionGate.

## Findings

### P0 — broken or demo-breaking behaviour

1. **Bid workspace tabs do not update the URL.** `BidDetailPage` reads `tabFromPath(location.pathname)` but `Tabs.onChange` only calls `setTab`. Reloading or sharing after clicking Documents/Verification does not restore the tab. Evaluation/intelligence links that already use `/bids/:id/verification` work on first load only if the presenter does not then click Overview and lose the URL.
2. **Missing deep-link routes** for Documents and Activity (`/bharatbid/bids/:id/documents`, `/bharatbid/bids/:id/activity`). Verification, cross-checks, requirements, review, intelligence, and evaluation already exist in `App.tsx`.

### P1 — serious UX / SIH demo friction

3. **Unauthenticated chrome shows the full procurement sidebar.** Login lives inside `AppLayout`. Judges see Command Center / Tenders / Bids before they have a session; inner pages then show a second `SessionGate` login card.
4. **No role or DEMO indicator in the global shell.** Role is only implied after opening a page. `AuthStatus` shows display name + Sign out. Command Center has DEMO / SYNTHETIC; other pages do not.
5. **Command Center first-screen hierarchy is duplicated.** Page title is “BharatBid” and the hero repeats the same brand. KPI cards are links but look like inert tiles (no hover/affordance). Section title “Officer attention” is weaker than “Officer Review Priority”.
6. **Login is a thin form inside the app shell**, not a clear SIH identity moment (what / problem / DEMO accounts).
7. **Evaluation comparison tables** already have `overflow-x-auto` and a sticky first column, but sticky headers/cells lack a solid edge so content can visually collide while scrolling. `PageContainer` default max-width squeezes the most important SIH page.
8. **Bid overview shows PAN and GSTIN strings** when the API returns them. Presence-only is the safer SIH posture (Provided / Not provided).
9. **Activity timestamps on bid detail use `formatDate` (date only)** instead of `formatDateTime`.
10. **Readiness badges use raw enums** (`READY`, `REVIEW_REQUIRED`) instead of sentence case used elsewhere.

### P2 — visual polish

11. CSS tokens still named `--hsk-*` (not user-visible, but leftover kit identity in the design tokens).
12. Nav label “Bid submissions” vs judge language “Bids”.
13. Bid tab strip can wrap/overflow on 1366px without horizontal scroll on the tablist.
14. Command Center loads a spinner *and* KPI skeletons together.
15. Login inputs have labels but no required-field indication.
16. Notification bell popover does not close on outside click.
17. Evaluation “Generate report” is easy to miss among many outline buttons.

### P3 — optional

18. Rename Intelligence tab (would churn tests; keep label, improve copy).
19. Token rename `--hsk` → `--bb` (cosmetic internals).

## What already works (do not regress)

- BharatBid-only primary nav (no Copilot/RAG/UI kit).
- KPI destinations exist (`/tenders`, `/bids`, `/review`, `/intelligence`, `/evaluation`).
- SessionGate + `bids.write` hide Submit / Upload / Run verification / Generate report for reviewers.
- StatusBadge terminology (Evidence missing ≠ fail, DEMO SOURCE copy, Officer Review Priority).
- Submit bid confirmation modal.
- Evaluation sticky first column (structure is present).
- Report download with toast success/error.

## Prioritized fix plan

| Priority | Fix |
| --- | --- |
| P0 | Sync bid tabs to routes; add documents + activity routes |
| P1 | Login-focused unauthenticated shell; role + DEMO chip; Command Center story + clickable KPIs; evaluation width/sticky; presence labels; datetime on bid activity |
| P2 | Human readiness labels; tablist scroll; login required fields; report button emphasis; notification outside-click |
| P3 | Skip token rename and Intelligence tab rename |

## Out of scope

Backend contract changes, new scoring, live government APIs, restoring Starter Kit pages, destroying seed data.
