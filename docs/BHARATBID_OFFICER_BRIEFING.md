# BharatBid AI — Officer Briefing

**Procurement Intelligence & Evidence-Based Bid Evaluation**  
SIH Problem Statement 26100 · Ministry of Petroleum & Natural Gas / CPCL–GeM context

| Document type | Audience | Classification |
| --- | --- | --- |
| Meeting reference / capability brief | Senior procurement officers, CPSE evaluation committees, SIH evaluators | Prototype decision-support system — not a Government of India service |

**Purpose of this document.** To describe, factually and without over-claim, what BharatBid already does, where DEMO/SYNTHETIC behaviour ends and LIVE government verification would begin, what blocks production readiness today, and which integrations would materially help officers if authorised data access is obtained.

**Ground rule.** Nothing in this document claims that DEMO, SANDBOX, cached, OCR-extracted, or manually entered evidence is “government verified.” LIVE status requires a successful authorised external HTTPS lookup that is stored and presented as fresh—not configuration alone, and never a synthetic adapter response.

---

## Executive summary (for senior officers)

BharatBid is a **decision-support workspace** for CPSE / GeM-style tender evaluation. It organises tender requirements, bidder evidence, labelled source checks, cross-source comparisons, officer review, clarification records, comparative evaluation, and an auditable PDF report—so officers can inspect large bid files with a shared evidence trail.

**What it is:** an operational Command Center for procurement officers and reviewers, with role-based access, organisation tenancy, audit logging, and explicit DEMO / SYNTHETIC labelling when synthetic adapters are used.

**What it is not:** an automatic award engine; a government certification authority; a replacement for GSTN, MCA, GeM, or other statutory portals; or a system that ranks or selects winners. Officers remain responsible for every procurement decision. AI, where present, is limited to insight, summary, and explanation—it does not award, reject, or decide.

**Current verification truth:** In the default demonstration configuration, all twelve verification modules run as **DEMO — SYNTHETIC DATA**. The product architecture is **credential-ready** for authorised GSTIN and PAN providers (e.g. Setu Data Gateway / GSP). Catalog status never becomes LIVE from environment variables alone. **No LIVE government providers are active in this workspace without operator-supplied credentials and a successful outbound lookup.**

**Ask to government / procuring entities:** authorised API or partner access (or documented manual-evidence SOPs) for GSTIN, PAN/ITD, MCA, Udyam, GeM, EPFO/ESIC, DigiLocker, debarment lists, and related sources—so DEMO adapters can be replaced with honest LIVE / SANDBOX / MANUAL modes without changing the officer workflow.

---

# Part 1 — Current system & limitations

## 1.1 What BharatBid currently does

### Product positioning

| Item | Fact (from repository) |
| --- | --- |
| Problem statement | SIH PS 26100 — AI-powered integrated bid compliance verification for GeM / CPSE procurement |
| Role of software | Decision-support; officers decide |
| Demo labelling | UI shows **DEMO ENVIRONMENT**; verification badges show **DEMO — SYNTHETIC DATA** when synthetic adapters are used |
| Commercial / financial scoring | Explicitly **NOT_AVAILABLE** in this build—not mixed into compliance verification |

### End-to-end officer workflow (already working)

The following pipeline is implemented in the application (UI routes under `/bharatbid`, APIs under `/api/v1`):

1. **Authentication & roles** — Sign-in (password / OTP / optional Google when configured); roles include `procurement_officer`, `reviewer`, and `admin`.
2. **Organisation workspace** — Organisation tenancy scopes tenders, bidders, bids, documents, and related records (cross-organisation access is denied).
3. **Command Center** — Operational KPIs, verification health counts (honestly labelled), provider readiness panel, attention queue, activity, notifications.
4. **Tenders** — Create and manage tenders; requirements with draft mutability; freeze after publish; amendments with `changeReason` and version history while open for bidding.
5. **Bidders & bids** — Bidder profiles; draft/submit bids; server-enforced submission window (closing date is authoritative; client clock is not).
6. **Documents** — Upload, version, link to requirements, archive, download; MIME/validation controls; OCR may extract **candidate text only** (not government verification).
7. **Verification** — Initiate labelled source checks (GST, PAN, MCA, Udyam, etc.); matched / mismatched / not found / error; cache vs force; freshness badges (LIVE / CACHED / SANDBOX / DEMO / MANUAL).
8. **Cross-checks** — Compare pairs of source results (e.g. GST ↔ MCA) as consistent / inconsistent / insufficient evidence.
9. **Requirement intelligence** — Evidence coverage against tender requirements (decision-support language; not a compliance score).
10. **Officer review** — Review queue; start/assess; clarifications recorded in-app; machine finding preserved separately from officer assessment.
11. **Officer Review Priority (Attention)** — Triage indicator for which bids need human attention; not a bidder ranking or merit score.
12. **Evaluation** — After closing, comparative workspace, officer notes, decision-support states, evaluation PDF report with disclaimer.

### Lifecycle honesty (closing date)

An `open` tender whose **server time** is at or after `closingDate` is presented and gated as **closed for bidding** without rewriting historical seed dates. Late bids are rejected; evaluation is allowed only after closing. Example seed tender `GEM/2026/B/CPCL/001` keeps closing time `2026-09-15T18:30:00.000Z` and is not reopened for demonstration.

---

## 1.2 Current verification workflow

```text
Bid documents
    → Optional OCR / text extraction (candidate identifiers only)
    → Officer selects source + identifier
    → Adapter lookup (DEMO / SANDBOX / LIVE HTTP / MANUAL path)
    → Field comparison (match / mismatch / review_required / …)
    → Stored verification record + audit
    → Optional cross-portal comparison
    → Officer review / evaluation (human decision)
```

### Source modes and honesty rules

| Mode / badge | Meaning in BharatBid |
| --- | --- |
| **DEMO** | Synthetic adapter response. Not an official government response. |
| **SANDBOX** | Authorised provider sandbox credentials are configured. Catalog is not LIVE. |
| **READY_FOR_CREDENTIALS** | Production-oriented credentials may be present or expected; catalog still does **not** show LIVE until a successful authorised HTTPS lookup is stored. |
| **PROVIDER_REQUIRED** | No suitable authorised product API is wired (e.g. GeM without onboarding). |
| **MANUAL / MANUAL_VERIFICATION** | Officer verifies against the official portal or certificate; system stores evidence, not a LIVE API result. |
| **CACHED** | Prior lookup reused (`servedFromCache`); never presented as LIVE. |
| **LIVE** | Successful authorised external request stored as fresh (`sourceMode = live` and not served from cache). **Not granted by env alone.** |

**OCR EXTRACTED** text is never equivalent to **GOVERNMENT VERIFIED**.

Provider errors (HTTP 503, timeout, invalid JSON, authentication failure, rate limit, not found, empty payload) do **not** become MATCHED / CLEAR / VERIFIED.

---

## 1.3 Supported verification modules (as implemented)

Twelve modules exist in the provider catalog. Default SIH / demo runtime without credentials: **DEMO** for all.

| Module (code) | Display | Selected path in architecture | Classification | Typical status without LIVE creds |
| --- | --- | --- | --- | --- |
| `gst` | GST | Setu GSTIN Verification (HTTP adapter when configured) | AUTHORIZED_PROVIDER | DEMO or READY_FOR_CREDENTIALS |
| `pan` | PAN | Setu PAN Verification (HTTP adapter when configured) | AUTHORIZED_PROVIDER | DEMO or READY_FOR_CREDENTIALS |
| `mca` | MCA | Manual MCA master-data check | MANUAL_ONLY | DEMO or MANUAL_VERIFICATION |
| `udyam` | UDYAM | Manual Udyam portal verification | MANUAL_ONLY | DEMO or MANUAL_VERIFICATION |
| `dpiit` | DPIIT | Manual recognition certificate | MANUAL_ONLY | DEMO or MANUAL_VERIFICATION |
| `income_tax` | Income Tax | Manual / authorised PAN–IT status | MANUAL_ONLY | DEMO or MANUAL_VERIFICATION |
| `epfo` | EPFO | Manual establishment check | MANUAL_ONLY | DEMO or MANUAL_VERIFICATION |
| `esic` | ESIC | Manual registration check | MANUAL_ONLY | DEMO or MANUAL_VERIFICATION |
| `gem` | GeM | Manual seller profile evidence | MANUAL_ONLY | DEMO or **PROVIDER_REQUIRED** |
| `nsic` | NSIC | Manual certificate evidence | MANUAL_ONLY | DEMO or MANUAL_VERIFICATION |
| `debarment` | DEBARMENT | Manual debarment order evidence | MANUAL_ONLY | DEMO or MANUAL_VERIFICATION |
| `bis` | BIS / OEM / Make in India | Evidence-based (certificate upload) | MANUAL_ONLY | DEMO or MANUAL_VERIFICATION |

**LIVE providers in this workspace without credentials:** **NONE.**

HTTP orchestration is implemented for **GST** and **PAN** only. Other modules are DEMO and/or manual-evidence paths by design until official APIs or partner onboarding exist.

---

## 1.4 Already working vs demo-supported vs unavailable

| Capability | Classification |
| --- | --- |
| Tender / bidder / bid lifecycle, RBAC, org isolation, audit | **Already working** |
| Document evidence workspace (upload, version, link, archive) | **Already working** |
| Requirement freeze + amendments with audit trail | **Already working** |
| Verification UX, statuses, cache/force, freshness badges | **Already working** (honesty rules included) |
| Cross-checks, review, attention, evaluation, PDF report | **Already working** (decision-support; DEMO-labelled when synthetic) |
| Twelve DEMO SOURCE adapters for SIH demonstration | **Demo-supported** |
| GST / PAN LIVE via authorised provider after credentials + successful lookup | **Credential-ready architecture; currently unavailable without keys** |
| MCA, Udyam, DPIIT, EPFO, ESIC, NSIC, debarment, BIS as LIVE APIs | **Currently unavailable** (no public product API wired; manual / DEMO) |
| GeM LIVE seller/buyer APIs | **Currently unavailable** (`PROVIDER_REQUIRED` until onboarded) |
| DigiLocker / EntityLocker requester integration | **Documented as ready-for-credentials; not LIVE in this build** |
| Automated financial / commercial scoring | **NOT_AVAILABLE** |
| Automatic award / winner selection | **Out of scope — must not be implemented** |

---

## 1.5 Important limitations (and path to production)

For each limitation: **Current Status → Why limited → What is required → How it becomes production-ready.**

### L1 — GSTIN master-data verification is not LIVE by default

| | |
| --- | --- |
| **Current Status** | DEMO adapter (or READY_FOR_CREDENTIALS / SANDBOX when Setu/GSP env is set). Catalog never shows LIVE from env alone. |
| **Why limited** | Official GSTN master data is not exposed as a free public REST API for arbitrary applications. Portal use involves CAPTCHA; scraping is prohibited. IRP e-invoice APIs are the wrong family for GSTIN master verification. |
| **Required** | Authorised provider contract (e.g. Setu Data Gateway or GSTN GSP): base URL, client id/secret, product instance; sandbox vs production keys kept separate. |
| **Production-ready** | Configure `GST_API_*`; run successful authorised HTTPS lookup; stored fresh result may show LIVE; retain DEMO only as explicit fallback when allowed. |

### L2 — PAN verification is not LIVE by default

| | |
| --- | --- |
| **Current Status** | DEMO / READY_FOR_CREDENTIALS; HTTP adapter ready for Setu-style PAN KYC. |
| **Why limited** | PAN validation is via NSDL/UTIITSL through licensed KYC providers, not open public APIs. |
| **Required** | Authorised PAN KYC credentials (`PAN_API_*` pattern). |
| **Production-ready** | Same honesty model as GST: SANDBOX vs LIVE after successful lookup; never mix sandbox keys into LIVE labelling. |

### L3 — MCA / company master data has no public MCA21 API in this product

| | |
| --- | --- |
| **Current Status** | DEMO + MANUAL_VERIFICATION path. |
| **Why limited** | No public MCA21 REST API suitable for this product; officer portal / dumps are the realistic channels. |
| **Required** | Either official MCA API partnership, or SOP for officer portal check + upload of evidence into BharatBid (manual mode). |
| **Production-ready** | Wire authorised API if granted; otherwise keep MANUAL with evidence upload and audit—never relabel DEMO as LIVE. |

### L4 — Udyam / MSME verification has no official REST API

| | |
| --- | --- |
| **Current Status** | DEMO + manual portal verification. |
| **Why limited** | MoMSME Udyam verify page is form/portal oriented; no official REST selected in the provider matrix. |
| **Required** | Official Udyam API if published, or DigiLocker/issuer documents, or manual certificate workflow. |
| **Production-ready** | API adapter if available; else MANUAL evidence + optional DigiLocker issuer verification. |

### L5 — GeM seller / buyer APIs are not onboarded

| | |
| --- | --- |
| **Current Status** | DEMO; fallback **PROVIDER_REQUIRED** when not in demo mode. |
| **Why limited** | GeM APIs require buyer/seller/partner onboarding; not wired LIVE in-repo. |
| **Required** | GeM onboarding credentials, documented endpoints, allowlisted HTTPS hosts. |
| **Production-ready** | Implement GeM adapter behind orchestrator; catalog moves from PROVIDER_REQUIRED only when real lookups succeed. |

### L6 — EPFO / ESIC establishment checks are portal/manual

| | |
| --- | --- |
| **Current Status** | DEMO + MANUAL. |
| **Why limited** | Employer portals; no authorised product API wired. |
| **Required** | Official employer/establishment APIs if released, or manual evidence SOP. |
| **Production-ready** | Adapter if API exists; else MANUAL evidence linked to requirements. |

### L7 — DPIIT / Startup India, NSIC, BIS / OEM / Make in India

| | |
| --- | --- |
| **Current Status** | DEMO and/or evidence-based MANUAL. |
| **Why limited** | Certificate / declaration driven; no universal real-time API selected. |
| **Required** | Certificate uploads, DigiLocker issuers where applicable, OEM letters, BIS certificate numbers + authority channels. |
| **Production-ready** | Evidence workflows + optional issuer verification; expiry monitoring once dates are captured from verified sources. |

### L8 — Debarment / blacklist has no single national LIVE feed

| | |
| --- | --- |
| **Current Status** | DEMO registry + MANUAL orders; **SOURCE_UNAVAILABLE ≠ CLEAR**. |
| **Why limited** | Debarment is fragmented across procuring entities / GeM restriction lists. |
| **Required** | Curated order repository, GeM restriction access if granted, officer upload of orders. |
| **Production-ready** | Manual + multi-source checks; unavailable must remain “unavailable,” never “cleared.” |

### L9 — DigiLocker / EntityLocker not LIVE

| | |
| --- | --- |
| **Current Status** | Documented READY_FOR_CREDENTIALS; partner app credentials missing. |
| **Why limited** | Requires official requester onboarding (MeitY/NIC). |
| **Required** | Partner client credentials, OAuth, issuer mappings. |
| **Production-ready** | Pull issued documents as evidence; still compare identifiers via verification modules—DigiLocker alone is not GST/MCA LIVE. |

### L10 — OCR is extraction only

| | |
| --- | --- |
| **Current Status** | Optional `OCR_HTTP_URL`; advisory: OCR EXTRACTED / not GOVERNMENT VERIFIED. |
| **Why limited** | OCR produces candidate text; it cannot authenticate government records. |
| **Required** | Optional OCR vendor + always a separate authorised verification step. |
| **Production-ready** | Keep advisory language; never auto-promote OCR fields to LIVE. |

### L11 — Financial / commercial evaluation module

| | |
| --- | --- |
| **Current Status** | **NOT_AVAILABLE**. |
| **Why limited** | Deliberately separated from compliance verification; must not award via AI. |
| **Required** | Separate commercial evaluation design, tender-specific formulae, officer ownership. |
| **Production-ready** | Dedicated module; still no automatic winner selection. |

### L12 — Continuous re-verification / national event feeds

| | |
| --- | --- |
| **Current Status** | On-demand lookup + short cache; no national change-feed integration. |
| **Why limited** | Depends on provider webhooks / scheduled APIs not yet contracted. |
| **Required** | Provider event APIs or scheduled re-check policy + officer notification rules. |
| **Production-ready** | Scheduler + force refresh + attention alerts when status changes. |

---

# Part 2 — Future integrations & officer benefits

Each row: **Integration → What it verifies → Data/API required → How it helps the officer.**

These are **future / production enhancements** aligned with the existing architecture. They are **not** claimed as LIVE today unless credentials and successful lookups exist.

### 2.1 GST (authorised provider / GSP)

| | |
| --- | --- |
| **Integration** | LIVE GSTIN verification via Setu Data Gateway or GSTN GSP (HTTP adapter already scaffolded). |
| **What it verifies** | Legal name, trade name, registration status, registration date, state (as returned by provider). |
| **Data/API required** | `GST_API_BASE_URL`, client id/secret, product instance; sandbox then production. |
| **Officer benefit** | Replace DEMO GST checks with attributable LIVE/SANDBOX results; reduce spreadsheet chasing of GST certificates. |

### 2.2 PAN / Income Tax Department channels

| | |
| --- | --- |
| **Integration** | LIVE PAN KYC via authorised provider; ITD status remains manual/partner unless API granted. |
| **What it verifies** | PAN existence / name match fields per provider contract. |
| **Data/API required** | `PAN_API_*` credentials; ITD portal SOP or authorised status API if any. |
| **Officer benefit** | Faster identity cross-check against bidder profile and GST name. |

### 2.3 MCA (company / LLP master)

| | |
| --- | --- |
| **Integration** | Authorised MCA API if available; otherwise structured MANUAL MCA21 evidence. |
| **What it verifies** | Legal name, CIN/LLPIN, incorporation, status, directors as permitted. |
| **Data/API required** | MCA partnership API **or** officer portal evidence pack. |
| **Officer benefit** | Stronger GST ↔ MCA consistency checks with auditable sources. |

### 2.4 Udyam / MSME

| | |
| --- | --- |
| **Integration** | Official Udyam API (if published) or DigiLocker MSME certificates + MANUAL. |
| **What it verifies** | Udyam registration number, enterprise type/category, validity fields. |
| **Data/API required** | MoMSME API or DigiLocker issuer access. |
| **Officer benefit** | MSME preference / eligibility evidence tied to the bid file. |

### 2.5 GeM

| | |
| --- | --- |
| **Integration** | Onboarded GeM buyer/seller APIs (today: PROVIDER_REQUIRED). |
| **What it verifies** | Seller profile, registration artefacts GeM exposes to onboarded clients. |
| **Data/API required** | GeM partner credentials and documented endpoints. |
| **Officer benefit** | Align GeM marketplace identity with tender bidder identity without portal copy-paste. |

### 2.6 EPFO / ESIC

| | |
| --- | --- |
| **Integration** | Establishment / coverage APIs if released; else MANUAL portal evidence. |
| **What it verifies** | Establishment registration / coverage signals relevant to labour compliance requirements. |
| **Data/API required** | EPFO/ESIC authorised APIs or evidence SOP. |
| **Officer benefit** | Attach labour-compliance evidence to mandatory requirements with clear unavailable vs matched semantics. |

### 2.7 DPIIT / Startup India & NSIC

| | |
| --- | --- |
| **Integration** | Certificate + DigiLocker issuer verification; NSIC registration evidence. |
| **What it verifies** | Startup recognition / NSIC registration claims on the bid. |
| **Data/API required** | Certificate uploads; DigiLocker issuers; NSIC channels if any. |
| **Officer benefit** | Preference-category claims become inspectable evidence, not free-text claims. |

### 2.8 DigiLocker / issuer verification

| | |
| --- | --- |
| **Integration** | Official DigiLocker / EntityLocker requester APIs after partner onboarding. |
| **What it verifies** | Authenticity of issued documents pulled from issuers (as permitted). |
| **Data/API required** | Partner OAuth credentials, issuer URI mappings. |
| **Officer benefit** | Reduce forged PDF risk for certificates that DigiLocker can issue; still run domain verification (GST/PAN/etc.) separately. |

### 2.9 OEM authorisation

| | |
| --- | --- |
| **Integration** | Evidence workflow for manufacturer authorisation letters (no universal API). |
| **What it verifies** | Claimed OEM / dealership authority for the tendered goods. |
| **Data/API required** | Letter templates, officer checklist, optional DigiLocker if OEM issues there. |
| **Officer benefit** | OEM claims sit beside the bid with versioned evidence and review items. |

### 2.10 BIS / certification verification

| | |
| --- | --- |
| **Integration** | BIS certificate evidence + any future BIS verification channel. |
| **What it verifies** | Product certification claims against tender technical requirements. |
| **Data/API required** | Certificate numbers, scans, optional BIS API if authorised. |
| **Officer benefit** | Technical compliance matrix cells backed by documents, not assertions. |

### 2.11 Debarment / blacklist sources

| | |
| --- | --- |
| **Integration** | Multi-source debarment: published orders, GeM restrictions, entity lists. |
| **What it verifies** | Whether a bidder appears on available restriction lists. |
| **Data/API required** | Curated feeds / GeM access / officer-uploaded orders. |
| **Officer benefit** | Early attention flags; unavailable sources never silently “clear” a bidder. |

### 2.12 Cross-portal identity matching

| | |
| --- | --- |
| **Integration** | Extend existing GST ↔ MCA (and similar) cross-verification with LIVE sources. |
| **What it verifies** | Consistency of legal name and identifiers across sources. |
| **Data/API required** | At least two LIVE or MANUAL attested sources per pair. |
| **Officer benefit** | Surfaces inconsistencies for review without calling them fraud automatically. |

### 2.13 Document authenticity verification

| | |
| --- | --- |
| **Integration** | DigiLocker + checksum/versioning (already have versions) + LIVE identifier checks. |
| **What it verifies** | Document provenance and identifier alignment—not “PDF looks real.” |
| **Data/API required** | DigiLocker + authorised registries. |
| **Officer benefit** | Clear separation: file present vs identifier verified vs portal cross-checked. |

### 2.14 Automated compliance matrix

| | |
| --- | --- |
| **Integration** | Enrich existing requirement intelligence with LIVE verification outcomes. |
| **What it verifies** | Mapping of tender requirements → evidence → verification → review state. |
| **Data/API required** | Same module credentials as above; stable requirement versioning (already present). |
| **Officer benefit** | One matrix for committee meetings; gaps and conflicts visible before evaluation. |

### 2.15 Certificate / expiry monitoring

| | |
| --- | --- |
| **Integration** | Track validity dates from verified certificates and re-alert before expiry. |
| **What it verifies** | Time-bound eligibility artefacts (MSME, BIS, etc.). |
| **Data/API required** | Reliable date fields from LIVE/MANUAL evidence; scheduler. |
| **Officer benefit** | Avoid evaluating bids on expired certificates discovered late. |

### 2.16 Officer attention / alert system

| | |
| --- | --- |
| **Integration** | Extend existing Officer Review Priority + notifications with LIVE status changes. |
| **What it verifies** | N/A — prioritises human work. |
| **Data/API required** | Event hooks from verification/cross-check/review modules. |
| **Officer benefit** | Officers spend time on high-attention bids first; not a merit ranking. |

### 2.17 Automated clarification workflow

| | |
| --- | --- |
| **Integration** | Evolve in-app clarifications (already recorded) toward structured bidder response channels if policy allows. |
| **What it verifies** | Traceability of questions and responses on the bid file. |
| **Data/API required** | Notification/email/SMS providers already scaffolded; bidder portal policy. |
| **Officer benefit** | Clarifications stay inside the audit trail instead of scattered email. |

### 2.18 Continuous re-verification / event-based updates

| | |
| --- | --- |
| **Integration** | Scheduled or webhook-driven re-checks with force refresh. |
| **What it verifies** | Whether previously LIVE results still hold. |
| **Data/API required** | Provider webhooks or poll quotas; cache policy. |
| **Officer benefit** | Catch GST cancellation / debarment updates between submission and award decision—without pretending DEMO is LIVE. |

---

# Closing sections

## 1. Data & API requirements from government (checklist)

Use this as a procurement / MoU discussion list. Items marked **scaffold ready** already have application hooks.

| # | Requirement | Authority / channel | BharatBid readiness |
| --- | --- | --- | --- |
| 1 | GSTIN verification API via authorised GSP/KYC provider (sandbox + production) | GSTN via Setu/GSP | **Scaffold ready** (GST HTTP adapter) |
| 2 | PAN verification API via authorised KYC provider | NSDL/UTIITSL via provider | **Scaffold ready** (PAN HTTP adapter) |
| 3 | MCA company/LLP master access (API or sanctioned extract) | MCA | Manual path today; API if granted |
| 4 | Udyam registration verification API or DigiLocker issuer | MoMSME / DigiLocker | Manual / DigiLocker pending onboarding |
| 5 | GeM seller/buyer API onboarding | GeM | **PROVIDER_REQUIRED** until onboarded |
| 6 | EPFO / ESIC establishment verification channels | EPFO / ESIC | Manual |
| 7 | DPIIT Startup recognition / certificate verification | DPIIT | Manual / DigiLocker |
| 8 | NSIC registration evidence channel | NSIC | Manual |
| 9 | BIS certificate verification channel | BIS | Manual / evidence |
| 10 | Debarment / restriction list access (GeM + CPSE orders) | GeM / procuring entities | Manual + DEMO; unavailable ≠ clear |
| 11 | DigiLocker / EntityLocker requester credentials | MeitY / NIC | Ready for credentials; not LIVE |
| 12 | OEM authorisation evidence SOP (letters / DigiLocker) | OEMs | Evidence workflow |
| 13 | Allowlisted HTTPS hosts & SSRF-safe production networking | IT / cybersecurity | SSRF controls already in product |
| 14 | Clear legal basis: BharatBid is decision-support, not a statutory certifier | Policy | Product position already enforced in UX/copy |

**Non-negotiable labelling:** DEMO ≠ LIVE · SANDBOX ≠ LIVE · CACHED ≠ LIVE · OCR ≠ GOVERNMENT VERIFIED · SOURCE_UNAVAILABLE ≠ CLEAR.

---

## 2. Prototype → Production roadmap

| Phase | Outcome | Depends on |
| --- | --- | --- |
| **P0 — Prototype (current)** | Full officer workflow with DEMO adapters; org isolation; audit; honest badges; evaluation PDF | SIH demo data; no government credentials required |
| **P1 — Credential-ready GST/PAN** | SANDBOX then LIVE GSTIN/PAN after successful lookups; catalog stays truthful | Setu/GSP contracts; key vault; host allowlists |
| **P2 — Manual evidence SOPs for MCA/Udyam/EPFO/ESIC/BIS/OEM** | Officers attach attested portal screenshots/certificates; MANUAL mode | CPSE SOP; training |
| **P3 — GeM + DigiLocker onboarding** | GeM moves off PROVIDER_REQUIRED; DigiLocker issuer pulls | Partner applications approved |
| **P4 — Debarment multi-source + expiry monitoring** | Attention alerts on restriction hits and certificate expiry | List access + scheduler |
| **P5 — Continuous re-verification** | Event/schedule driven refresh before award recommendation meetings | Provider webhooks/quotas |
| **P6 — Optional financial module** | Separate commercial evaluation (**still no auto-award**) | Finance committee design |

Throughout all phases: **AI remains insight-only; officers decide.**

---

## 3. Short executive summary (speakable)

> BharatBid is a procurement decision-support platform for CPSE / GeM-style tenders. It already gives officers a single workspace for tenders, evidence, labelled source checks, cross-checks, review, clarifications, comparative evaluation, and auditable reports.  
>  
> Today’s demonstration uses **DEMO / SYNTHETIC** verification adapters. That is intentional and labelled. The architecture is ready for authorised LIVE GST and PAN providers and for manual or partner-based integration of MCA, Udyam, GeM, EPFO/ESIC, DigiLocker, debarment, and certification sources.  
>  
> BharatBid does **not** award tenders, select winners, or certify government compliance. With legitimate API and partner access, the same officer workflow can move from prototype demonstration to production-grade, attributable verification—without pretending synthetic data is government-verified.

---

## Document control

| Field | Value |
| --- | --- |
| Based on | BharatBid repository code, Prisma schema, routes, UI, provider catalog, and project docs (`PROVIDER_SETUP`, `LIVE_INTEGRATION_STATUS`, `GOVERNMENT_API_PROVIDER_MATRIX`, `LIVE_GOVERNMENT_API_INTEGRATION`, workflows, future scope) |
| LIVE providers claimed | **NONE** (unless operator supplies credentials and a successful authorised lookup is stored) |
| Code changes for this document | None |

*End of briefing.*
