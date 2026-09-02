# BharatBid — Security

Honest security notes for SIH evaluation. This is **not** a certification, pentest report, or production-hardening guarantee.

BharatBid is a decision-support platform. It does not automatically award, reject, rank, or disqualify bidders. Adapters are **DEMO / SYNTHETIC / MOCK** unless a real production adapter is explicitly configured (none in this submission).

## What is in place

* JWT access + rotating refresh; passwords hashed (bcrypt)
* RBAC catalog (`procurement_officer`, `reviewer`, `admin`, …) enforced on `/api/v1` routes
* Object access through tender/bid IDs loaded from the database — report generation is bound to the requested tender
* Document upload validation (size, type) and authenticated download — no public storage URLs in the UI
* SSRF checks on user-controlled URLs (`backend/src/security/ssrf.ts`)
* Rate limits, CORS allowlist, secure headers, body limits
* Audit events without PAN/GSTIN/CIN/Udyam, extracted text, storage keys, or tokens
* Search does not query PAN/GSTIN; bidder list search is name/email in the SIH UI (API still requires `bidders.read`)
* Frontend cannot set officer identity, attention scores, or evaluation outcomes — those come from the session and server rules
* Secrets belong in `.env` (gitignored). `.env.example` uses local-dev JWT placeholders labelled change-me

## What is not claimed

* Production government API access
* Formal security certification
* Perfect object-level isolation in every list filter without `tenders.read` / `bids.read` (those permissions are the gate)
* Hardened production JWT issuers (defaults are `bharatbid-ai` / `bharatbid-ai-api` for this product; replace secrets before any shared host)

## Residual risks

* Demo password `demo-password` is for local SIH only
* Live government endpoints must not be added without dedicated adapters, allowlists, and legal access

## Related infrastructure docs

[docs/security.md](security.md) describes HTTP headers, CORS, rate limits, and SSRF controls used by BharatBid.
