# BharatBid — Judge workflow (SIH 2026, PS 26100)

Present this as **decision support with evidence**, not as an automated awarding engine.

## Problem

GeM-style procurement spreads bidder identity and eligibility across many artefacts: GST certificates, MCA/CIN records, Udyam, GeM seller IDs, debarment lists, and tender-specific documents. Officers compare these by hand. Gaps, mismatches, and “source unavailable” look the same on a spreadsheet. There is little traceability of *which document version* was used, *which DEMO check* ran, or *why* a cross-source difference appeared. Fragmented verification makes consistent, auditable review slow and easy to dispute.

## Solution

BharatBid is an **AI-assisted, officer-centric** workspace that keeps tender requirements, bids, evidence, DEMO SOURCE checks, cross-checks, review, and comparative notes in one audit trail.

It does **not** pick a winner. Registry checks are **DEMO — SYNTHETIC** unless an authorized provider is configured and actually contacted. Officers belong to an **organization workspace**; they only see that workspace’s tenders.

Credentials for Setu/GSP/DigiLocker are **not included**. Empty env = READY_FOR_CREDENTIALS, never fake LIVE.

## Workflow

```text
Tender
  → Bidder (one bid per tender)
  → Evidence (versioned documents)
  → Verification (DEMO SOURCE adapters)
  → Cross-check (GST ↔ MCA / Udyam)
  → Compliance intelligence (requirement coverage)
  → Officer review + in-app clarification
  → Evaluation (after closing date)
  → Decision support (human notes)
  → Audit + PDF report
```

**Demo path:** login as `demo.officer@example.com` / `demo-password` → Command Center → tender `GEM/2026/B/CPCL/001` → Bayfront (stronger evidence) vs Delta (attention-heavy) → documents → verification → cross-check → review → evaluation workspace → generate report.

Note: that seed tender’s closing date is **15 Sep 2026 18:30 UTC**. After that instant the platform correctly **refuses new bids** and **allows evaluation**. That is intended calendar behaviour, not a crash.

## Differentiators (implemented)

| Differentiator | What judges can see |
| --- | --- |
| Evidence traceability | Checksums, versions, storage keys, who uploaded, extraction status |
| Integrated verification | One bid workspace, many DEMO adapters, provenance on each result |
| Cross-source consistency | Name/state comparison with missing ≠ mismatch |
| Requirement-level compliance | Mandatory vs optional; present / missing / incomplete / unavailable |
| Officer-centric review | Start → assess; no skip from open to assessed; machine finding stays immutable |
| Auditability | Server timestamps; secrets and PAN/GSTIN redacted from audit metadata |
| Explainability | Attention/review-priority lists factors; not a black-box score |
| Requirement freeze | After publish, officers cannot silently add/edit requirements; amendments version history |
| LIVE vs cache | Cached lookups never display as LIVE; VERIFY NOW forces a fresh check |
| Human-in-the-loop | AI extracts/assists; officers record decisions; no auto-award |

## What we do not claim

- Live GSTN, MCA, Udyam, or GeM APIs.
- OCR of scanned PDFs/images.
- Financial bid ranking or L1 computation.
- Automatic fraud conviction or bidder disqualification.
- Per-organisation multi-tenant isolation.

If asked “does AI decide the tender?” the accurate answer is: **No. AI never awards. Officers do.**
