# BharatBid — Slice 11

Final SIH cleanup and presentation readiness. **No new intelligence engine. No schema changes. No Slice 12.**

## 1. Objective

Preserve Slices 0–10 behaviour. Hide unused Starter Kit product chrome from the SIH sidebar. Rebrand the landing and sign-in experience. Document architecture, demo, and security honestly.

## 2. Cleanup

Forensic table: [BHARATBID_SLICE_11_CLEANUP_AUDIT.md](BHARATBID_SLICE_11_CLEANUP_AUDIT.md).

No backend modules were deleted. Optional kit APIs (Odoo, Copilot, RAG, anomaly, intents, automation) remain **REVIEW** / retained infrastructure.

`/dashboard` redirects to `/bharatbid` so placeholder KPI numbers cannot be mistaken for Command Center data. `DashboardPage.tsx` is kept for `gallery.test.tsx`.

## 3. UI / navigation

* Sidebar: procurement only (Command Center through Notifications)
* Brand: BharatBid / Decision-support platform → `/bharatbid`
* Home rewritten as product landing
* Login opens Command Center
* Notification bell: accessible unread count + link to `/bharatbid/notifications`
* Document title: BharatBid

## 4. Security / language

* No winner / fraud / government-verified copy added
* Bidder search placeholder no longer advertises PAN/GSTIN
* PDF metadata creator/producer: BharatBid
* `APP_NAME` default: BharatBid
* Seed welcome notification: BharatBid / DEMO / SYNTHETIC

## 5. Demo

Unchanged synthetic scenarios (Bayfront / Delta / source-limitation). Guide: [BHARATBID_DEMO_GUIDE.md](BHARATBID_DEMO_GUIDE.md).

## 6. AI

No winner model, ranking, award automation, or optional operational AI summary.

## 7. Database

No migrations. No resets.

## 8. Limitations

* Optional kit URLs still exist if typed (`/ui`, `/copilot`, …)
* HTTP/API tests require `DATABASE_URL`
* Git `safe.directory` issues on some Windows drives can fail `gitignore` hygiene tests independently of BharatBid

STOP after Slice 11.
