# BharatBid — SIH Demo Guide

15-minute demonstration of **actual** routes in this repository. All seed data is **DEMO / SYNTHETIC**. Government adapters are **DEMO SOURCE**.

BharatBid is a decision-support platform. It does not automatically award, reject, rank, or disqualify bidders.

## Demo accounts

Password for all seed users: `demo-password`

| Email | Role |
| --- | --- |
| `demo.officer@example.com` | Procurement officer (primary presenter) |
| `demo.reviewer@example.com` | Reviewer (read-focused; no Create Tender / Generate Report) |
| `demo.admin@example.com` | Administrator |

Start the stack (`npm run dev` or Docker), migrate, and seed with `DEMO_MODE` enabled (default in `.env.example`).

Primary tender: `GEM/2026/B/CPCL/001` (industrial valves). Stronger evidence: **Bayfront**. Attention-heavy: **Delta**. Source limitation: Harbour / Kaveri scenarios from seed.

## 00:00–01:00 — Problem + introduction

Open `/login`. The sign-in card is the product identity (BharatBid, SIH 26100, DEMO / SYNTHETIC). The sidebar stays Sign in until a session exists.

Sign in as the officer. The app opens **Command Center** (`/bharatbid`).

Say: fragmented bidder documents, cross-source inconsistency, and manual review are hard to trace. BharatBid puts evidence, DEMO SOURCE checks, review, and comparison in one workspace — officers still decide.

## 01:00–03:00 — Command Center + tender

Stay on `/bharatbid`. Title is **Command Center**. Show the procurement-intelligence story, then clickable KPIs (each card says Open workspace).

Click **Active tenders** → `/bharatbid/tenders`. Open `GEM/2026/B/CPCL/001`. Show status, schedule, requirements, participation.

## 03:00–05:00 — Bidder + bid + evidence

From the tender, open participating bids or `/bharatbid/bids`. Open the **Bayfront** bid (`BID-GEM2026BCPCL001-0001`) for a clean evidence story, or **Delta** (`BID-GEM2026BCPCL001-0002`) for attention.

Tabs update the URL. Use **Documents** (`/bharatbid/bids/:id/documents`): mapping, extraction states, DEMO / SYNTHETIC files. Preview/download uses the authenticated API. Bid overview shows PAN/GSTIN as Provided / Not provided.

## 05:00–07:00 — Verification + cross-verification

Tabs **Verification** (`.../verification`) and **Cross-Checks** (`.../cross-checks`). Point at **DEMO SOURCE** / SIMULATED / MOCK labels. Show matched vs mismatched vs not found vs insufficient evidence. Do not claim live GSTN/MCA/Udyam/GeM.

## 07:00–09:00 — Requirement intelligence + officer review

Tab **Requirements** (`.../requirements`): Evidence Coverage, evidence missing ≠ fail. Then **Review** or `/bharatbid/review`. Open an item: machine finding vs officer assessment vs clarification. Do not call the machine finding an official government result.

## 09:00–11:00 — Officer Review Priority

Tab **Intelligence** (URL `.../intelligence`) or `/bharatbid/intelligence` titled **Officer Review Priority**. Show score **band**, factor breakdown, original vs current points. Click a factor to open the underlying evidence. This is review priority, not a winner ranking, fraud score, or award.

## 11:00–13:00 — Comparative evaluation

`/bharatbid/evaluation` → workspace for the valve tender (`/bharatbid/evaluation/:tenderId`). Compare 2–4 bids (Bayfront vs Delta). Sticky first column. Trace a cell back to evidence. No winner column.

## 13:00–14:00 — Officer decision support

Record a note and a **decision-support** state (not an award). Confirm the confirmation dialog remains.

## 14:00–15:00 — Report + close

**Generate report** is the primary action on the evaluation workspace (`bids.write`). PDF includes the decision-support disclaimer and **DEMO / SYNTHETIC DATA**. Return to `/bharatbid` and show Recent activity (OFFICER vs SYSTEM).

Optional: `/bharatbid/notifications`, `/bharatbid/activity`.

## If a reviewer account is used

Same read path. Create Tender, Submit bid, Run verification, and Generate Report stay hidden and return 403 from the API.

## Do not say

* Winner / best bidder / automatically approved / government verified / live GST integration / fraud detected
