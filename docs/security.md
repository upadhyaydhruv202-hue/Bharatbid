# Security

This repository includes reusable hardening for the BharatBid API. It is **not** a claim that the application is fully secure. Treat the controls as a baseline, then review them against the problem statement, threat model, and deployment.

## Assumptions

* The API is reached over HTTPS in production (Helmet HSTS only runs when `NODE_ENV=production`).
* `trust proxy` is enabled in production so `req.ip` reflects the reverse-proxy client. The proxy must overwrite `X-Forwarded-For` and not pass through untrusted values.
* Browser clients send `Authorization: Bearer` access tokens. Refresh tokens stay in the JSON body unless the UI later stores them in httpOnly cookies via `secureCookieOptions()`.
* Redis, when configured, is trusted infrastructure on a private network.
* SMS, SMTP, and AI base URLs are operator-configured, not chosen by end users. User-controlled URLs go through SSRF checks.
* Destructive or high-risk actions require application authorization and confirmation where appropriate.

## HTTP controls

| Control | Behavior |
| --- | --- |
| Headers | Helmet CSP `default-src 'none'`, frame deny, `nosniff`, no referrer, HSTS in production |
| CORS | `CORS_ORIGINS` allowlist only. `*` is rejected. Credentials are allowed for listed origins |
| Body size | `REQUEST_BODY_LIMIT` (default `1mb`) for JSON and urlencoded bodies |
| Uploads | Multer memory storage, one file, purpose-specific MIME/magic-byte checks, path-safe filenames |
| Errors | Operational `AppError` messages are sanitized. Unhandled errors return a generic 500 with no stack |

Health and readiness stay outside `/api/v1` and are not rate-limited, so probes are not starved by API traffic. Readiness error strings are sanitized. Durable audit events are listed at `GET /api/v1/audit` for callers with `audit.read`. See [audit.md](audit.md) and [observability.md](observability.md).

## Rate-limit categories

`RATE_LIMIT_ENABLED` (default `true`) turns the abstraction on. Redis backs counters when a Redis client is configured; otherwise each process uses memory.

| Category | Default | Key | Typical routes |
| --- | --- | --- | --- |
| Public APIs | 60 / 1m | IP | `GET /api/v1`, register, refresh, logout |
| Authentication | 20 / 15m | IP | register, refresh, logout |
| Login brute force | 5 / email and 20 / IP per 15m | email + IP | `POST /auth/login` |
| OTP | 5 / destination and 20 / IP per 15m | destination + IP | OTP request/verify |
| Password reset brute force | 5 / email and 20 / IP per 15m | email + IP | password-reset request/confirm |
| Authenticated APIs | 120 / 1m | user | All Bearer-protected routes |
| Admin APIs | 30 / 1m | user | RBAC catalog writes/reads |
| AI | 20 / 1m | user | `/ai/*` |
| File upload | 10 / 15m | user | `POST /files`, `POST /documents/analyze` |

If the store fails, production **fails closed** (`RATE_LIMIT_FAIL_CLOSED` defaults to true when `NODE_ENV=production`). Development and test fail open so a local Redis outage does not block work.

## Authentication and authorization

Protected `/api/v1` routes run `authenticate()` then RBAC (`requirePermission` / `authorizeRole`). Public auth routes are register, login, refresh, logout, OTP, and password reset.

Password reset (`FEATURE_OTP=true`):

1. `POST /api/v1/auth/password-reset/request` `{ "email": "ada@example.com" }` always returns the same envelope whether the account exists.
2. `POST /api/v1/auth/password-reset/confirm` `{ "email", "code", "password" }` verifies the `password-reset` OTP, updates the hash, and revokes refresh tokens **and access tokens** issued before the reset.

Logout revokes the refresh-token family. When `Authorization: Bearer` is also sent, that access token's `jti` is denylisted until it would have expired. Keep `JWT_ACCESS_EXPIRES_IN` short so a stolen access token without a matching logout still ages out quickly.

## External requests

User-controlled URLs are validated before fetch:

* `http` / `https` only
* no embedded credentials
* ports 80 and 443 only
* loopback, private, link-local, CGNAT, metadata, and `.internal` / `.localhost` hosts blocked
* DNS lookup of hostnames; any resolved address that is private/loopback is blocked
* `redirect: 'error'`
* timeout (webhook defaults are 5s)

Operator-configured URLs (SMS HTTP gateway, email providers) require `http`/`https` and a timeout but may target private hosts for on-prem demo setups.

## AI

AI output is untrusted text/JSON. It is schema-validated and never executed as SQL, shell, or arbitrary HTTP. High-risk AI actions require an application confirmation flag (`confirmed: true`); a `confirm` field inside tool arguments is ignored. See [ai-guardrails.md](ai-guardrails.md) for the full control plane and residual risks.

## Secrets

* Do not commit `.env`, key files, or `credentials.json`.
* Production refuses to start without required secrets (see [configuration.md](configuration.md)).
* Production refuses `DEMO_MODE=true` unless `ALLOW_DEMO_IN_PRODUCTION=true`. Mock AI, email, SMS, and OTP providers still require demo mode. Do not enable either flag on a real production host. See [features.md](features.md).
* `npm run security:secrets` scans tracked files for private keys and assigned provider secrets.
* `npm run security:audit` runs `npm audit --omit=dev`.
* GitHub Actions uses repository/environment **Secrets** and **Variables** only. Workflows do not hardcode credentials. CD authenticates to GHCR with `GITHUB_TOKEN` (or `REGISTRY_USERNAME` / `REGISTRY_PASSWORD`) and can use OIDC (`id-token: write`) instead of long-lived cloud keys. See [ci-cd.md](ci-cd.md).

## Residual risks

* Access JWTs are denylisted on logout (that token's `jti`, when Bearer is sent) and after password reset (access-token version bump). Logout without an access token still only revokes the refresh family. Keep `JWT_ACCESS_EXPIRES_IN` short.
* SSRF resolves hostname DNS before fetch. A record that changes to a private IP between lookup and connect (classic DNS rebinding TOCTOU) is not fully prevented.
* In-memory rate limits and token revocation are per process and reset on restart. Production requires `REDIS_URL` so those stores are shared.
* `trust proxy` can be abused if a public client can set `X-Forwarded-For` without a stripping proxy.
* Signed file downloads are unauthenticated by design; possession of a valid signature is the capability. Prefer `STORAGE_SIGNING_SECRET` instead of reusing the JWT access secret.
* Dependency audit findings change over time. A clean scan today does not stay clean without regular upgrades. As of 2026-08-29, `npm audit --omit=dev --audit-level=high` reports:
  * **high** `deepmerge-ts` via the Prisma CLI (`prisma` / `@prisma/config`). The advertised fix is a breaking Prisma downgrade; wait for an upstream Prisma release instead of `npm audit fix --force`.
  * **moderate** `react-router` / `react-router-dom` (open redirect / SSR hydration). Not in the API process. Upgrade when a compatible 7.18+ release is adopted.
* Demo mode and mock providers reduce realism; they must never be enabled in a real production tenant without an explicit decision.
* The SPA stores access tokens in `localStorage`. XSS in the frontend can steal sessions. `secureCookieOptions()` exists for a later httpOnly-cookie migration.
* Compose interpolates local-dev JWT placeholders when `JWT_*` is unset or empty in `.env`. Replace them before any shared environment. Development still refuses to start when `DATABASE_URL` is set without JWT secrets if you run the API outside Compose.

## Tests

See `backend/tests/security.http.test.ts` and `backend/src/security/*.test.ts` for unauthorized access, forbidden roles, brute force, malformed tokens, oversized uploads, malicious filenames, unauthorized AI tools, and categorized rate limits.
