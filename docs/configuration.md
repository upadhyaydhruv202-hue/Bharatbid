# Configuration

Centralized configuration lives in `backend/src/config`.

The process loads `.env` from the repository root, then validates environment variables. Invalid values fail startup with a field-level message. Missing production secrets fail with a bullet list.

Copy `.env.example` to `.env` before running locally.

## Application

| Variable                                                           | Default                                       | Notes                                                                                                               |
| ------------------------------------------------------------------ | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`                                                         | `development`                                 | `development`, `test`, or `production`                                                                              |
| `PORT`                                                             | `5000`                                        | HTTP port                                                                                                           |
| `HOST`                                                             | `0.0.0.0`                                     | Bind address                                                                                                        |
| `APP_NAME`                                                         | `BharatBid`                                | Display name for health, logs, and PDF metadata                                                                     |
| `APP_URL`                                                          | `http://localhost:5000`                       |                                                                                                                     |
| `FRONTEND_URL`                                                     | `http://localhost:5173`                       |                                                                                                                     |
| `LOG_LEVEL`                                                        | `info`                                        | pino level                                                                                                          |
| `SHUTDOWN_TIMEOUT_MS`                                              | `10000`                                       | Forced-exit timeout                                                                                                 |
| `REQUEST_BODY_LIMIT`                                               | `1mb`                                         | Express JSON/urlencoded limit                                                                                       |
| `CORS_ORIGINS`                                                     | `http://localhost:5173,http://localhost:8080` | Comma-separated origin URLs. `*` is rejected. Include `http://localhost:8080` when using the optional nginx profile |
| `RATE_LIMIT_ENABLED`                                               | `true`                                        | Enables categorized rate limits and brute-force limits                                                              |
| `RATE_LIMIT_FAIL_CLOSED`                                           | `true` in production                          | Reject requests when the rate-limit store fails                                                                     |
| `RATE_LIMIT_PUBLIC_MAX` / `RATE_LIMIT_PUBLIC_WINDOW`               | `60` / `1m`                                   | Unauthenticated `/api/v1` traffic                                                                                   |
| `RATE_LIMIT_AUTH_MAX` / `RATE_LIMIT_AUTH_WINDOW`                   | `20` / `15m`                                  | Register, refresh, logout                                                                                           |
| `RATE_LIMIT_AUTHENTICATED_MAX` / `RATE_LIMIT_AUTHENTICATED_WINDOW` | `120` / `1m`                                  | Bearer-protected APIs                                                                                               |
| `RATE_LIMIT_ADMIN_MAX` / `RATE_LIMIT_ADMIN_WINDOW`                 | `30` / `1m`                                   | RBAC catalog                                                                                                        |
| `RATE_LIMIT_AI_MAX` / `RATE_LIMIT_AI_WINDOW`                       | `20` / `1m`                                   | AI HTTP APIs                                                                                                        |
| `RATE_LIMIT_UPLOAD_MAX` / `RATE_LIMIT_UPLOAD_WINDOW`               | `10` / `15m`                                  | File and document uploads                                                                                           |
| `AUTH_PASSWORD_RESET_RATE_LIMIT_MAX`                               | `5`                                           | Per email / window                                                                                                  |
| `AUTH_PASSWORD_RESET_IP_RATE_LIMIT_MAX`                            | `20`                                          | Per IP / window                                                                                                     |
| `AUTH_PASSWORD_RESET_RATE_LIMIT_WINDOW`                            | `15m`                                         |                                                                                                                     |
| `DEMO_MODE`                                                        | `true` outside production                     | See [features.md](features.md)                                                                                      |
| `ALLOW_DEMO_IN_PRODUCTION`                                         | `false`                                       | Required in addition to `DEMO_MODE=true` when `NODE_ENV=production`                                                 |

## Dependencies

| Variable                        | Required in production        | Notes                                        |
| ------------------------------- | ----------------------------- | -------------------------------------------- |
| `DATABASE_URL`                  | Yes                           | PostgreSQL connection string                 |
| `DATABASE_POOL_MAX`             | No (`10`)                     | Prisma `connection_limit`                    |
| `DATABASE_POOL_TIMEOUT_SECONDS` | No (`10`)                     | Prisma `pool_timeout`                        |
| `REDIS_URL`                     | Yes                           | Queues, cache, rate limits, OTP, token revocation, idempotency |
| `JOB_MAX_ATTEMPTS`              | No (`3`)                      | Default job attempts                         |
| `JOB_BACKOFF_MS`                | No (`200`)                    | Exponential backoff base                     |
| `JOB_TIMEOUT_MS`                | No (`60000`)                  | Per-attempt job timeout                      |
| `JOBS_PROCESS`                  | No (`true`)                   | Register queue consumers in this process. Compose sets `false` on the API |

## Authentication

See [auth.md](auth.md) for usage. Values below are loaded by `backend/src/config`.

| Variable                          | Required in production          | Default                     |
| --------------------------------- | ------------------------------- | --------------------------- |
| `JWT_ACCESS_SECRET`               | Yes (32+ characters). Also required in development whenever `DATABASE_URL` is set | unset                       |
| `JWT_REFRESH_SECRET`              | Yes (32+ characters). Also required in development whenever `DATABASE_URL` is set | unset                       |
| `JWT_ACCESS_EXPIRES_IN`           | No                              | `15m`                       |
| `JWT_REFRESH_EXPIRES_IN`          | No                              | `7d`                        |
| `JWT_ISSUER`                      | No                              | `bharatbid-ai`              |
| `JWT_AUDIENCE`                    | No                              | `bharatbid-ai-api`          |
| `AUTH_PASSWORD_MIN_LENGTH`        | No                              | `8`                         |
| `AUTH_PASSWORD_MAX_LENGTH`        | No                              | `72`                        |
| `AUTH_PASSWORD_REQUIRE_UPPERCASE` | No                              | `false`                     |
| `AUTH_PASSWORD_REQUIRE_LOWERCASE` | No                              | `false`                     |
| `AUTH_PASSWORD_REQUIRE_NUMBER`    | No                              | `false`                     |
| `AUTH_PASSWORD_REQUIRE_SPECIAL`   | No                              | `false`                     |
| `AUTH_BCRYPT_COST`                | No (minimum `10` in production) | `12`                        |
| `AUTH_DEFAULT_ROLE`               | No                              | `user`                      |
| `AUTH_LOGIN_RATE_LIMIT_MAX`       | No                              | `5` (per email / window)    |
| `AUTH_LOGIN_IP_RATE_LIMIT_MAX`    | No                              | `20` (per IP / window)      |
| `AUTH_LOGIN_RATE_LIMIT_WINDOW`    | No                              | `15m`                       |

## Integrations and feature flags

AI, email, SMS, and storage settings are parsed by `backend/src/config`.

In production, secrets become required when the matching feature is enabled:

- AI + Gemini: `GEMINI_API_KEY` (see [ai.md](ai.md))
- Email: `EMAIL_FROM` or `SMTP_FROM`, plus provider secrets (`SMTP_HOST`, `RESEND_API_KEY`, or `BREVO_API_KEY`)
- SMS HTTP: `SMS_HTTP_URL`, `SMS_API_KEY`
- S3: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET`

AI request behavior (used when AI is enabled):

| Variable               | Default                               |
| ---------------------- | ------------------------------------- |
| `AI_PROVIDER`          | `gemini` (`gemini` or `mock`)         |
| `AI_MODEL`             | unset (`gemini-2.5-flash` for Gemini) |
| `AI_TIMEOUT_MS`        | `30000`                               |
| `AI_MAX_OUTPUT_TOKENS` | `4096`                                |
| `AI_TEMPERATURE`       | `0.2`                                 |
| `AI_MAX_RETRIES`       | `2`                                   |
| `AI_RETRY_BASE_MS`     | `200`                                 |

`AI_PROVIDER=mock` is for local testing, CI, and demo mode. In production it is allowed only when `DEMO_MODE=true` and `ALLOW_DEMO_IN_PRODUCTION=true`. Demo/test environments without `GEMINI_API_KEY` automatically use the mock provider.

Document intelligence (see [documents.md](documents.md)):

| Variable                         | Default    |
| -------------------------------- | ---------- |
| `DOCUMENT_MAX_BYTES`             | `10485760` |
| `DOCUMENT_MAX_TEXT_CHARS`        | `100000`   |
| `DOCUMENT_CONFIDENCE_THRESHOLD`  | `0.7`      |
| `DOCUMENT_ASYNC_THRESHOLD_BYTES` | `1048576`  |

Storage (see [storage.md](storage.md)):

| Variable                     | Default                                           |
| ---------------------------- | ------------------------------------------------- |
| `STORAGE_PROVIDER`           | `local` (`local`, `s3`, or `postgres`)            |
| `STORAGE_LOCAL_DIR`          | `storage` (relative to the backend package)       |
| `STORAGE_MAX_BYTES`          | `10485760`                                        |
| `STORAGE_SIGNED_URL_EXPIRES` | `300`                                             |
| `STORAGE_SIGNING_SECRET`     | unset (falls back to `JWT_ACCESS_SECRET`)         |
| `AWS_REGION`                 | unset (`us-east-1` on the S3 client when omitted) |

Feature flags: `FEATURE_AI`, `FEATURE_NOTIFICATIONS`, `FEATURE_OTP`, `FEATURE_SMS`, `FEATURE_S3`, `FEATURE_PDF`. Missing flags default to `false` except `FEATURE_PDF` (`true`, so existing PDF/report HTTP keeps working). Use `isFeatureEnabled()` / `isDemoMode()`; the server is authoritative. Registry, demo-mode safety, and `GET /api/v1/features`: [features.md](features.md).

`FEATURE_OTP=true` enables `POST /api/v1/auth/otp/request`, `/otp/verify`, and password reset. See [otp.md](otp.md) and [auth.md](auth.md).

`FEATURE_SMS=true` (or `SMS_ENABLED=true`) enables the SMS channel and `SmsService`. See [sms.md](sms.md).

`FEATURE_NOTIFICATIONS=true` also writes an in-app notification when document analysis finishes. The notification HTTP API is available whenever the database is configured. See [notifications.md](notifications.md).

`FEATURE_PDF=true` enables `POST /api/v1/pdf/generate` and report HTTP. See [pdf.md](pdf.md) and [reports.md](reports.md).

Scheduler (see [scheduler.md](scheduler.md)):

| Variable             | Default                      | Notes                                     |
| -------------------- | ---------------------------- | ----------------------------------------- |
| `SCHEDULER_ENABLED`  | `false`                      | Clock that emits `scheduled` events       |
| `SCHEDULER_INTERVAL` | `1m`                         | Default `tick` schedule. `0s` disables it |
| `SCHEDULER_POLL`     | `1s`                         | How often due schedules are checked       |

## Docker

Used by Compose interpolation. Host-based `npm run dev` still uses `DATABASE_URL` / `REDIS_URL` with `localhost`. Inside containers Compose overrides those URLs to service names. See [docker.md](docker.md).

| Variable            | Default                 | Notes                                        |
| ------------------- | ----------------------- | -------------------------------------------- |
| `POSTGRES_USER`     | `postgres`              | Local Compose only                           |
| `POSTGRES_PASSWORD` | `postgres`              | Local Compose only; not a production secret  |
| `POSTGRES_DB`       | `hackathon`             | Local Compose only                           |
| `SEED_ON_START`     | `true`                  | API container runs Prisma seed after migrate |
| `API_PROXY_TARGET`  | `http://localhost:5000` | Vite dev server proxy target                 |

## Frontend

| Variable       | Default                                                                |
| -------------- | ---------------------------------------------------------------------- |
| `VITE_API_URL` | empty (Vite or frontend nginx proxies `/health`, `/ready`, and `/api`) |

## GitHub Actions

CI/CD variables and secrets (`IMAGE_REGISTRY`, `DEPLOY_PROVIDER`, `HEALTHCHECK_URL`, registry credentials, and others) are documented in [ci-cd.md](ci-cd.md). They are not application runtime config and are not loaded by `backend/src/config`.
