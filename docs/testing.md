# Testing

Reusable test conventions for BharatBid. A feature is not complete until tests cover its main success path **and** its main failure modes.

CI runs without production credentials, paid SaaS, or human interaction. Mock AI, email, SMS, storage, and other HTTP providers.

## Commands

From the repository root:

```bash
npm test                 # unit + integration (skips Postgres/Redis suites when those URLs are unset)
npm run test:unit        # workspace unit tests (backend src/, frontend, workers)
npm run test:integration # backend HTTP / Prisma / Redis suites (skips when URLs are unset)
npm run test:watch       # backend watch mode
npm run test:coverage    # V8 coverage (text, HTML, lcov under each workspace's coverage/)
npm run test:e2e         # representative API workflow (requires DATABASE_URL)
```

Workspace-specific:

```bash
npm test -w backend
npm run test:watch -w frontend
npm run test:coverage -w workers
```

Prepare a dedicated Postgres database before integration or e2e tests:

```bash
cp .env.test.example .env.test
npm run db:test:prepare
```

Optional Redis (KV, cache, idempotency, BullMQ). Uncomment `REDIS_URL` in `.env.test` or export it, then start Compose:

```bash
npm run deps:up
```

Without `DATABASE_URL` or `REDIS_URL`, those integration suites are skipped (`describe.skip`). `npm run test:e2e` fails loudly if Postgres is missing.

## Layers

| Layer       | Where                                                                                | Tools                              | External services                                                                                                                         |
| ----------- | ------------------------------------------------------------------------------------ | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Unit        | `backend/src/**/*.test.ts`, `frontend/src/**/*.test.tsx`, `workers/src/**/*.test.ts` | Vitest                             | None. Use in-memory stores and mock providers. Frontend UI tests cover primitives, overlays, tables, theme/toasts, and API client errors. |
| Integration | `backend/tests/**/*.test.ts` (HTTP, Prisma, Redis, queues)                           | Vitest, Supertest, Prisma, ioredis | Local Postgres and optional Redis only.                                                                                                   |
| End-to-end  | `backend/tests/e2e/**/*.test.ts`                                                     | Vitest, Supertest, `createApp`     | Postgres. Mock AI/email/SMS via demo/test config.                                                                                         |

Do not add Playwright or Cypress unless a hackathon truly needs a browser driver. The representative workflow is API-level: register, authorize, notify, audit.

## Mocks

Never call live Gemini, SMTP, SMS gateways, or S3 in tests.

| Concern          | Mock / test double                                                   |
| ---------------- | -------------------------------------------------------------------- |
| AI               | `MockAiProvider` (`enqueue` text or `Error`)                         |
| Email            | `MockEmailProvider`                                                  |
| SMS              | `MockSmsProvider` (`failTimes`, `permanentFailure`)                  |
| OTP delivery     | `MockOtpProvider`                                                    |
| Storage metadata | `MemoryFileStore`                                                    |
| Push / webhook   | `MockPushProvider`, `MockWebhookProvider`                            |
| Generic HTTP     | `createRejectingFetch()`                                             |

Import the barrel: `backend/tests/mocks`. Module-level helpers also live next to the integration (`ai.test-helpers.ts`).

Demo mode and `NODE_ENV=test` already select mock email/SMS/OTP. CI must not set `GEMINI_API_KEY`, SMTP passwords, or AWS keys. Feature-flag tests live in `backend/src/features` and `backend/tests/features.http.test.ts`. See [features.md](features.md).

## Factories

Reusable builders live in `backend/tests/factories`.

- `build*` returns a plain object (unit tests, no database).
- `create*` persists through repositories (Postgres integration).

| Factory                                                                         | Use                                  |
| ------------------------------------------------------------------------------- | ------------------------------------ |
| `buildUser` / `createUser` / `createUserWithRole` / `createUserWithPermissions` | Users                                |
| `buildRole` / `createRole`                                                      | Roles                                |
| `buildPermission` / `createPermission`                                          | Permissions (`resource.action` keys) |
| `buildNotification` / `createNotification`                                      | In-app inbox rows                    |
| `buildDocument` / `createDocument`                                              | Document metadata                    |
| `buildAuditEvent` / `createAuditEvent`                                          | Audit events                         |

`createTestUser` in `backend/tests/helpers/database.ts` delegates to `createUser`. HTTP helpers: `registerSession`, `loginSession`, `authHeader` in `backend/tests/helpers/http.ts`.

Reset tables with `resetDatabase()` between integration tests. Seed the default catalog with `seedRbacCatalog(getTestPrisma())` when roles or permissions are required.

## What to test

Every new module should cover, at minimum:

| Case                      | Example                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------- |
| Success                   | Happy path through the service or HTTP envelope                                       |
| Invalid input             | Zod `VALIDATION_ERROR`, check constraints                                             |
| Missing data              | `NotFoundError` / 404                                                                 |
| Duplicate requests        | Unique keys, notification `idempotencyKey`                                            |
| Timeouts                  | Job `timeoutMs`, AI client timeouts                                                    |
| Retries                   | Transient provider errors; non-retryable validation/authz                             |
| Permission failures       | 401 unauthenticated, 403 missing `resource.action`                                    |
| External service failures | Mock provider throws; mapped `ExternalServiceError`                                   |
| Malformed AI output       | Schema parse + parse retries, then `ValidationError`                                  |
| Queue failures            | Closed queue, failed job status, BullMQ when Redis is up                              |
| Database failures         | Unreachable Postgres, `mapPrismaError` → `DatabaseError` without leaking URLs/secrets |

Controllers stay thin: assert status codes and envelopes. Put business assertions in service tests.

## Coverage

`npm run test:coverage` writes:

- `backend/coverage/`
- `frontend/coverage/`
- `workers/coverage/`

HTML: `coverage/index.html`. CI does not fail on a global percentage. Do not chase 100%. Raise coverage on auth, RBAC, validation, secrets handling, and money/destructive paths first. UI chrome and generated Prisma client are not a target.

## CI

GitHub Actions (`.github/workflows/ci.yml`) provides Postgres and Redis, caches npm, installs, migrates, lints, typechecks, runs `npm run test:unit` (with coverage), `npm run test:integration`, `npm run test:e2e`, secret scan, dependency audit, frontend build, and backend build. A separate Docker job builds production images, then runs `docker compose up --build --wait` and `infra/scripts/smoke.mjs`. Reports, coverage, and `dist/` are uploaded as artifacts. No paid APIs.

CD (`.github/workflows/cd.yml`) is provider-agnostic: reusable CI → image build → registry push → deploy hook → health check. See [ci-cd.md](ci-cd.md).

Compose/Dockerfile structure is asserted in `backend/tests/infra/docker.test.ts` without starting containers.

## Adding tests for a new module

1. Unit-test the service, repository helpers, validators, and parsers next to the source (`foo.service.test.ts`).
2. Add an HTTP suite under `backend/tests/` when the module exposes `/api/v1`.
3. Use factories instead of one-off `prisma.user.create` blobs.
4. Mock every external provider.
5. Cover the failure modes in the table above that apply.
6. Document env vars and how to run the tests in the module README.
7. Keep BharatBid tests next to `backend/src/problem/` and `backend/tests/bharatbid-*.ts`, not mixed into unrelated infrastructure tests.

## Helpers

| Helper             | Role                                   |
| ------------------ | -------------------------------------- |
| `describeDatabase` | Skip when `DATABASE_URL` is unset      |
| `describeRedis`    | Skip when `REDIS_URL` is unset         |
| `AUTH_TEST_ENV`    | JWT and bcrypt settings safe for tests |
| `createApp`        | Full Express app for HTTP/e2e          |

`fileParallelism` is off in the backend Vitest config so Prisma tests do not share a truncated database.

## Known limits

- Browser e2e (Playwright) is not in the core kit.
- Redis/BullMQ tests run only when `REDIS_URL` points at a reachable Redis.
- Coverage HTML is local/CI-artifact only; it is gitignored.
