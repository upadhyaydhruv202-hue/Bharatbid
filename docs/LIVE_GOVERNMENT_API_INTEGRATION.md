# Live government / authorized API integration

BharatBid never relabels DEMO fixtures as LIVE.

## Path

Officer → VERIFY NOW → `/api/v1/bids/:id/verifications` → `BidVerificationService` → `VerificationAdapterRegistry` / `OrchestratedAdapter` → `AuthorizedHttpAdapter` (if configured) **or** DEMO adapter **or** `SOURCE_UNAVAILABLE` / manual.

## GST (authorized provider)

1. Create a Setu Data Gateway account and GSTIN product instance ([docs.setu.co](https://docs.setu.co)).
2. Set `GST_API_BASE_URL`, `GST_CLIENT_ID`, `GST_CLIENT_SECRET`, `GST_PRODUCT_INSTANCE_ID`.
3. Use `GST_API_MODE=sandbox` until production approval.
4. Restart the backend. `GET /api/v1/verification-sources` `catalog[].status` becomes `SANDBOX` when sandbox credentials are present. It does **not** become `LIVE` from environment variables. A LIVE badge is only shown on a stored verification that just completed an authorized HTTPS lookup (`servedFromCache: false`, `sourceMode: live`).
5. Run VERIFY NOW on an open tender **other than** the closed seed `GEM/2026/B/CPCL/001`.

This is **not** a GSTN certificate and **not** API Setu (apisetu.gov.in) unless you separately onboard there.

## DigiLocker / EntityLocker

Partner application, OAuth redirect, and scopes are required. Env placeholders exist. No password collection. Not enabled until credentials exist.

## Financial evaluation

A **separate** future module. Compliance verification does not compute L1 or award. AI does not pick a winner.
