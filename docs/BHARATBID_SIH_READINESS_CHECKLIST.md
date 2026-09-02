# BharatBid — SIH readiness checklist

Mark items during the live demo prep. Slice 11 documents engineering status; the presenter still walks the UI once on the demo machine.

## Product

* [x] Command Center works (`/bharatbid`, consolidated dashboard API)
* [x] Tender workflow works
* [x] Bidder workflow works
* [x] Bid workflow works
* [x] Evidence workflow works
* [x] Verification works (DEMO SOURCE adapters)
* [x] Cross-verification works
* [x] Requirement intelligence works
* [x] Officer review works
* [x] Intelligence (Officer Review Priority) works
* [x] Comparative evaluation works
* [x] Reports work (authenticated PDF download)

## Security

* [x] RBAC verified in existing Slice 1–10 tests (officer vs reviewer)
* [x] Object-level access via tender/bid IDs (report bound to tender)
* [x] Sensitive identifiers omitted from reports/search/audit
* [x] Documents protected (authenticated download)
* [x] No secrets committed (`.env` gitignored; examples are placeholders)
* [x] SSRF helper present for user-controlled URLs
* [x] No fake live government endpoint claimed in UI copy

## Engineering

* [x] Backend lint
* [x] Frontend lint
* [x] Backend typecheck
* [x] Frontend typecheck
* [x] Backend build
* [x] Frontend build
* [x] Unit tests (backend 573, frontend 109)
* [x] HTTP/API tests against local Postgres (`hackathon_test`) — 228 passed, 8 skipped (git ownership / Redis optional)
* [x] Database migration safety (19 existing migrations applied; history not rewritten)

## Demo

* [x] Demo data available in `backend/src/problem/seed.ts` when `DEMO_MODE` seed runs
* [x] DEMO labels visible on Command Center and verification
* [x] Synthetic data clearly labelled
* [x] Demo users documented (README + demo guide)
* [x] Main demo flow documented
* [x] Report generation documented
* [x] SIH sidebar has no starter-kit gallery / placeholder dashboard

## Repository

* [x] Unused Starter Kit modules audited
* [x] Proven unused **product chrome** removed from the frontend (kit pages deleted; old URLs redirect to Command Center)
* [x] No duplicate architecture / Command Center
* [x] README updated
* [x] Architecture documented
* [x] Demo guide documented
