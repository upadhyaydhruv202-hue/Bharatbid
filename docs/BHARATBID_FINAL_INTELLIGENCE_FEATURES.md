# BharatBid — Intelligence features (PS 26100)

This phase extends the existing BharatBid procurement workspace. It does **not** add live government APIs.

## Added DEMO adapters

All adapters use `sourceMode: DEMO` and the existing `VerificationAdapter` → registry → `BidVerification` path.

| Source | Identifier | Notes |
| --- | --- | --- |
| DEMO GST Registry | GSTIN | Return filing status is an **attribute** on the GST record (FILED / NOT_FILED / DELAYED / NOT_AVAILABLE), not a second verification system |
| DEMO MCA Registry | CIN | Existing |
| DEMO UDYAM Registry | Udyam | Existing |
| DEMO PAN Registry | PAN | Masked in lists (`ABCDE****F`) |
| DEMO Income Tax Registry | PAN | Assessment year / filing status |
| DEMO EPFO Registry | DEMO-EPFO-… | Synthetic codes only |
| DEMO ESIC Registry | DEMO-ESIC-… | Synthetic codes only |
| DEMO DPIIT Registry | DEMO-DPIIT-… | Startup India recognition |
| DEMO NSIC Registry | DEMO-NSIC-… | |
| DEMO GeM Registry | DEMO-GEM-… | Previously empty; synthetic seller records added |
| DEMO Debarment Registry | PAN | `RECORD_FOUND` requires officer review. Never auto-rejects |
| DEMO BIS Registry | DEMO-BIS-… | Used when a tender requirement names BIS |

GST return example (UI): **GST Return Filing · Status: Filed · Period: FY 2025–26 · Source: DEMO GST Registry**. Never claimed as GSTN.

## Compliance intelligence

Computed on read from Officer Review Priority inputs (evidence coverage, DEMO matches, mismatches, cross-checks, open reviews). Label: **Overall Compliance Score — Decision Support**.

Disclaimer: *Decision-support indicator derived from available evidence and DEMO source results. It is not an official government compliance determination.*

It is **not** a second ranking engine. Factors are explainable and signed.

## Risk indicator

**Procurement Review Risk** maps Officer Review Priority bands:

- low attention → LOW
- moderate / elevated → MODERATE
- high → HIGH
- critical → CRITICAL

A DEMO debarment `RECORD_FOUND` raises LOW/MODERATE to HIGH. This is **not** a fraud score.

## AI officer advisory

Deterministic summary of gaps, DEMO verification issues, open reviews, and missing mandatory evidence. It never says approve / reject / winner / fraudulent bidder. Officers remain the decision-makers.

## Missing / inconsistent information

Deterministic detection: missing mandatory documents, conflicting legal names, OEM mismatches, missing validity dates, undeclared Make in India class. Does not invent missing fields.

## Make in India

Reads `CLASS_I` / `CLASS_II` / `NOT_DECLARED` and optional local-content percent from declaration documents. Not an automatic eligibility decision.

## OEM authorization

Structured fields (OEM name, product, reference, validity) compared to the bid/tender claim: MATCHED / MISMATCHED / NOT_COMPARABLE / EVIDENCE_MISSING / REVIEW_REQUIRED.

## DigiLocker DEMO authenticity

Marker in extracted text (`DEMO DigiLocker authenticity: ISSUED`). Copy: *This is a synthetic demonstration result and is not connected to DigiLocker.* Never called government verified.

## Dashboard additions

The **existing** Command Center (`GET /api/v1/bharatbid/dashboard`) now includes `intelligence`: coverage average, review-risk counts, pending requirements, and officer advisory. No second dashboard.

Bid Detail **Overview** and **Intelligence** tabs show coverage, review risk, advisory, MII, OEM, DigiLocker DEMO, and gaps. Existing tabs are unchanged.

Evaluation reports add coverage, review risk, and advisory with the DEMO / SYNTHETIC disclaimer. PAN / GSTIN / CIN / Udyam are not added to report tables.

## Security limitations

- No user-supplied government URLs
- No scraping or live GSTN / MCA21 / Udyam / GeM / PAN / IT / EPFO / ESIC / NSIC / DigiLocker / BIS / DPIIT APIs
- PAN masked in verification lists
- Audit metadata still omits identifier values
- Reviewer remains read-only (`bids.write` required to run checks)

## Officer decision responsibility

BharatBid does not automatically award, reject, rank, or disqualify. Qualification remains with the procurement officer.

## Future live government API requirements

Live integration would need authorized APIs, credentials, legal basis, and a source-mode switch from DEMO to `external`. That is **not** implemented.

## Government APIs NOT integrated

GSTN, MCA21, Udyam, GeM, PAN/NSDL, Income Tax, EPFO, ESIC, NSIC, DigiLocker, BIS, DPIIT, and debarment feeds.
