# BharatBid — Future scope

Items discovered during Slice 11 that were **not** implemented.

| Feature | Why it may be useful | Why not in Slice 11 | Potential future slice |
| --- | --- | --- | --- |
| Production GSTN / MCA / Udyam / GeM adapters | Real government-source checks | Requires legal access, credentials, SSRF-safe allowlists; current adapters are DEMO SOURCE | Dedicated integration slice |
| Labelled AI operational summary | Command Center narrative for judges | Slice 10 deferred it to avoid a second AI path and invented facts | Optional advisory-only slice |
| Async report jobs for large tenders | Scale beyond SIH desktop demo | Current reports are synchronous and sufficient for seed data | Reporting scale slice |
| Saved officer dashboard filters | Repeatable SIH and ops views | Not required for the canonical demo | UX polish slice |
| Remove optional kit modules (Odoo, Copilot, RAG, anomaly) | Smaller repo | Forensic audit classified them REVIEW — tests and `app.ts` still wire them | Dedicated kit-trim slice |
| Winner ranking / automatic award | Out of scope and prohibited | Would violate the decision-support product | Do not implement |
| Mesh networking / disaster response | Unrelated | Not PS 26100 | Do not implement |

Do not start these without an explicit developer instruction.
