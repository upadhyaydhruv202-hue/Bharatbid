# Live integration status

This file is the **truthful** runtime map. Empty environment variables mean the adapter is **not LIVE**.

| Service | Selected provider | Authority | Mode in-repo without creds | Real data | Credentials | Status |
| --- | --- | --- | --- | --- | --- | --- |
| GST | Setu GSTIN Verification | GSTN via authorized provider | DEMO (if `DEMO_MODE`) else READY_FOR_CREDENTIALS | Only if `GST_CLIENT_ID` + `GST_CLIENT_SECRET` + `GST_API_BASE_URL` | Not present in this workspace | READY_FOR_CREDENTIALS |
| PAN | Setu PAN Verification | NSDL/UTIITSL via provider | DEMO / READY_FOR_CREDENTIALS | No | Missing | READY_FOR_CREDENTIALS |
| MCA | Manual MCA21 | MCA | DEMO + MANUAL | No LIVE | N/A | MANUAL_VERIFICATION |
| Udyam | Manual Udyam portal | MoMSME | DEMO + MANUAL | No LIVE | N/A | MANUAL_VERIFICATION |
| DPIIT | Manual certificate | DPIIT | DEMO + MANUAL | No LIVE | N/A | MANUAL_VERIFICATION |
| DigiLocker | Official requester | NIC/MeitY | Not LIVE | No | Missing partner app | READY_FOR_CREDENTIALS |
| EntityLocker | Official requester | NIC/MeitY | Not LIVE | No | Missing | READY_FOR_CREDENTIALS |
| EPFO | Manual portal | EPFO | DEMO + MANUAL | No LIVE | N/A | MANUAL_VERIFICATION |
| ESIC | Manual portal | ESIC | DEMO + MANUAL | No LIVE | N/A | MANUAL_VERIFICATION |
| GeM | Onboarded GeM APIs | GeM | DEMO | No LIVE | Missing | PROVIDER_REQUIRED |
| NSIC | Manual certificate | NSIC | DEMO + MANUAL | No LIVE | N/A | MANUAL_VERIFICATION |
| OEM | Evidence | Manufacturer | MANUAL | No | N/A | MANUAL_VERIFICATION |
| Make in India | Declaration | DPIIT policy | MANUAL | No | N/A | MANUAL_VERIFICATION |
| Debarment | Orders + DEMO registry | Procuring entities | DEMO; unavailable ≠ clear | No national LIVE | N/A | MANUAL_VERIFICATION |

**LIVE in this workspace:** none. No government or Setu credentials were supplied. DEMO adapters remain and are labeled **DEMO — SYNTHETIC DATA**.

When GST env vars are set, `GST_API_MODE=sandbox` produces catalog **SANDBOX**. `GST_API_MODE=live` with credentials still shows catalog **READY_FOR_CREDENTIALS** until a successful outbound HTTPS lookup is stored as a fresh verification. Cached rows are labeled **CACHED**, never LIVE.
