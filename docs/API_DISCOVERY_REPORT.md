# API discovery report (BharatBid / SIH 2026 PS 26100)

Discovery date: **18 September 2026**. This report records what is **legitimately callable** today. It does not invent APIs, scrape protected portals, or treat marketplace wrappers as GSTN/MCA official endpoints. The production-readiness pass did **not** add new providers; it confirmed the existing registry is ready for credentials.

**Rule used:** official government API → government-authorized provider → API Setu (apisetu.gov.in) → established enterprise provider with documented provenance → official manual verification. Unofficial scrapers and leaked keys were rejected.

**API Setu vs Setu:** [API Setu](https://apisetu.gov.in) is the MeitY/NIC government API exchange. [Setu Data Gateway](https://docs.setu.co) is a **private authorized commercial provider**. They are not the same product.

## GST / GSTIN

| Candidate | Operator | Classification | Real-time | Sandbox | Production | Auth | Selected? | Reason |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| GSTN public search (services.gst.gov.in) | GSTN | MANUAL_ONLY / unofficial for automation | Portal | No public API | Portal | CAPTCHA | No | Protected portal; scraping/CAPTCHA bypass is forbidden |
| IRP / e-invoice IRN APIs | GSTN IRP (NIC and others) | OFFICIAL for **e-invoice**, not GST registration | Yes (IRN) | Yes (sandbox.gst.gov.in e-inv) | Yes with GSTN onboarding | GSP credentials | No as GSTIN registry | Different domain (IRN/invoice), not taxpayer master verification |
| GSP / ASP GST APIs | GSTN-authorized GSPs | AUTHORIZED_PROVIDER | Cached/live per GSP | Often | Contract | GSP keys | No default | Requires GSP licence; not in this repo’s credentials |
| Setu GSTIN Verification | Setu (Pine Labs) Data Gateway | AUTHORIZED_PROVIDER | Provider-stated | Yes (`dg-sandbox.setu.co`) | Yes after Setu product instance | `x-client-id`, `x-client-secret`, product instance | **Yes (adapter)** | Documented KYC/GSTIN product; BharatBid labels it authorized-provider, never GSTN |
| RapidAPI “GST verification” listings | Various | UNKNOWN / often UNOFFICIAL | Unknown | Varies | Varies | Marketplace keys | No | Provenance unclear; not treated as official |

## PAN

| Candidate | Classification | Selected? | Reason |
| --- | --- | --- | --- |
| incometax.gov.in screens | MANUAL_ONLY | Manual fallback | Do not scrape |
| NSDL / UTIITSL TIN | AUTHORIZED_PROVIDER (onboarding) | Adapter ready only with KYC vendor | No public unauthenticated PAN API |
| Setu PAN Verification | AUTHORIZED_PROVIDER | **Selected adapter when credentials exist** | Same Data Gateway family as GSTIN |
| Random GitHub PAN scrapers | UNOFFICIAL | No | |

## MCA / CIN

| Candidate | Classification | Selected? | Reason |
| --- | --- | --- | --- |
| MCA21 portal | MANUAL_ONLY | **Manual** | No public MCA21 REST API for this product |
| data.gov.in company dumps | OFFICIAL but not real-time | Not default LIVE | Batch/open data, not on-demand KYC |
| API Setu MCA datasets (if listed for the ministry) | OFFICIAL when published | Not wired — listing must be confirmed per environment | Do not assume a CIN lookup exists |
| Commercial CIN APIs (Zoho, Signzy, etc.) | COMMERCIAL_PROVIDER | Not selected without contract | |

## Udyam / MSME

Official verification remains the [Udyam registration portal](https://udyamregistration.gov.in) check. No stable public REST API was found that BharatBid can call without scraping. **MANUAL_VERIFICATION**.

## DPIIT / Startup India

Recognition certificates are typically PDF/DigiLocker artefacts. No public recognition-number REST API suitable for unattended LIVE checks was confirmed. **MANUAL_VERIFICATION**.

## DigiLocker

Official requester APIs exist (OAuth 2.0, issued documents, metadata). BharatBid does **not** ask for DigiLocker passwords. Status: **READY_FOR_CREDENTIALS** (partner onboarding with DigiLocker / NIC). Not LIVE in this workspace.

## EntityLocker

EntityLocker requester specification exists for legal-entity document pull. Status: **READY_FOR_CREDENTIALS**. Not LIVE.

## EPFO / ESIC

Employer/employee portals are protected. No public unauthenticated verification API suitable for BharatBid was confirmed. **MANUAL_VERIFICATION**. Do not scrape.

## GeM

GeM seller/buyer APIs, if any, are available to onboarded government buyers / authorized integrators, not as an anonymous GST-style lookup. **PROVIDER_REQUIRED**. Do not scrape gem.gov.in.

## NSIC / OEM / Make in India

Certificate- and declaration-based. **MANUAL_VERIFICATION** / evidence upload. There is no universal OEM or Make-in-India REST API.

## Debarment / blacklist

No single national real-time debarment API. Published orders and GeM restrictions are **manual / SOURCE_UNAVAILABLE ≠ CLEAR**. DEMO adapter remains labeled DEMO.

## Rejected approaches

- GitHub “GST API” scrapers, leaked GSTN cookies, CAPTCHA solvers
- Treating IRN APIs as GSTIN registration proof
- Relabeling DEMO fixtures as LIVE
- RapidAPI collections without operator identity and data provenance
