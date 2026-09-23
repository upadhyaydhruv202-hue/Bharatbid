# Provider setup

Backend-only. Never put these in `VITE_*` or the frontend bundle.

| Variable | Used for |
| --- | --- |
| `GST_API_BASE_URL` | Authorized GSTIN HTTPS origin (e.g. Setu sandbox) |
| `GST_CLIENT_ID` / `GST_CLIENT_SECRET` | Provider auth headers |
| `GST_PRODUCT_INSTANCE_ID` | Setu product instance |
| `GST_API_PATH` | Path template, default `/api/gstin/{identifier}` |
| `GST_API_METHOD` | `GET` or `POST` |
| `GST_API_MODE` | `sandbox` or `live`. Sandbox credentials never become LIVE. Live-mode catalog stays READY_FOR_CREDENTIALS until a successful HTTPS lookup is stored. |
| `PAN_API_*` | Same pattern as GST for authorized PAN KYC |
| `OCR_HTTP_URL` / `OCR_API_KEY` | Optional OCR HTTP extractor (HTTPS only). OCR is **not** verification |

Copy `.env.example`. Leave keys empty for SIH DEMO. Obtain Setu (or GSP) credentials yourself; this repository does not ship secrets.

Accounts you need for LIVE GST: Setu Data Gateway (or a GSTN GSP) production/sandbox keys after provider KYC. For DigiLocker: official requester onboarding.
