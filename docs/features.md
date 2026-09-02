# Feature flags and demo mode

Env-based configuration so BharatBid can enable only the capabilities this problem statement needs. There is no remote flag SaaS.

Server evaluation is authoritative (`isFeatureEnabled()`, `isDemoMode()`). The frontend may hide navigation from `GET /api/v1/features`. That is UX only and does not replace API checks, RBAC, or production secret rules.

```bash
FEATURE_AI=true
FEATURE_PDF=true
FEATURE_NOTIFICATIONS=true
FEATURE_SMS=false
```

## Public interface

| Helper | Role |
| --- | --- |
| `isFeatureEnabled(config, name)` | True only when that flag is on. Missing and unknown names are false |
| `isDemoMode(config)` | True when `DEMO_MODE` is on (defaults to true outside production) |
| `requireFeature(config, name)` | Throws `FEATURE_DISABLED` (404) when the flag is off |
| `shouldMockExternalIntegrations(config)` | Demo or test: mock email, SMS, OTP, and optional AI |
| `GET /api/v1/features` | Public snapshot `{ demoMode, features }` with no secrets |

```ts
import { isFeatureEnabled, isDemoMode, requireFeature } from '../features';

if (isFeatureEnabled(config, 'ai')) {
  // register AI / document intelligence
}

if (isDemoMode(config)) {
  // mock OTP / email / SMS; optional mock AI
}

requireFeature(config, 'pdf');
```

## Feature registry

Defaults apply when the variable is **missing**. `.env.example` turns common local-demo flags on. `FEATURE_PDF` defaults to `true` so PDF/report HTTP stays available unless you turn it off.

| Flag | Default | Dependencies | Purpose |
| --- | --- | --- | --- |
| `FEATURE_AI` | `false` | — | LLM toolkit and document intelligence. Alias: `AI_ENABLED` |
| `FEATURE_NOTIFICATIONS` | `false` | email/SMS adapters | Extra notification side effects (document-analysis alerts). Inbox HTTP stays available when the database is configured |
| `FEATURE_OTP` | `false` | email or SMS | OTP HTTP and password reset |
| `FEATURE_SMS` | `false` | — | SMS channel. Alias: `SMS_ENABLED` |
| `FEATURE_S3` | `false` | — | Require AWS secrets. `STORAGE_PROVIDER=s3` also enables this flag |
| `FEATURE_PDF` | `true` | storage | PDF generate and report HTTP APIs. Set `false` to disable |

## Demo mode

`DEMO_MODE` defaults to **true** when `NODE_ENV` is not `production`. Set `DEMO_MODE=false` for a production-like local run.

When demo mode is on:

* Seed may create demo users (`demo.officer@example.com` / `demo-password`)
* Email never leaves the process (mock provider)
* SMS never hits a real gateway
* OTP uses the mock adapter (no accidental real SMS or production email)
* AI may fall back to the mock provider when no Gemini key is set
* GST / MCA / Udyam / GeM adapters stay DEMO / MOCK / SYNTHETIC

Production (`NODE_ENV=production`) refuses `DEMO_MODE=true` unless `ALLOW_DEMO_IN_PRODUCTION=true`. It also refuses mock AI, email, SMS, and OTP providers unless demo mode is allowed that way. Do not set either flag on a real production tenant.

Demo-user seed is skipped when `DEMO_MODE` is off (including production). RBAC catalog seed still runs.

## Frontend

`FeatureProvider` loads `GET /api/v1/features`. BharatBid navigation is always the Command Center, Tenders, Bidders, Bids, Review, Attention, Evaluation, Activity, and Notifications. The API still rejects disabled infrastructure modules.

## Safety

Feature flags do not bypass RBAC, validation, audit, or production secret checks.
