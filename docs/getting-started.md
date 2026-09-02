# Getting started

## Prerequisites

* Node.js 20+
* npm 10+
* Docker (optional: full stack with `docker compose up --build`, or Postgres/Redis only)

## Setup

```bash
cd BharatBid
cp .env.example .env
npm install
```

### Full Docker stack

```bash
docker compose up --build
```

This starts frontend, backend, worker, Postgres, and Redis. See [docker.md](docker.md).

### Hybrid (Node on the host)

Start local dependencies if you want readiness checks against Postgres and Redis:

```bash
npm run deps:up
```

Docker publishes PostgreSQL on **localhost:5433** so it does not collide with a native PostgreSQL install on 5432. Keep `DATABASE_URL` pointed at that port (see `.env.example`). Compose containers use the `postgres` and `redis` service names instead of localhost.

The API still starts without Docker. `GET /health` stays up. `GET /ready` skips unconfigured dependencies and fails with HTTP 503 when a configured dependency is unreachable.

Apply migrations and optional demo data:

```bash
npm run db:migrate
npm run db:seed
```

`npm run db:seed` creates demo users when `DEMO_MODE` is on. After that, local `npm run dev` upserts the default RBAC catalog on startup, so new permission keys land without seeding again. Production does not auto-sync; run seed there. Production with `DEMO_MODE=false` skips demo users.

Copy `.env.test.example` to `.env.test` if you want a dedicated test URL, or run:

```bash
npm run db:test:prepare
npm test
npm run test:e2e
```

`db:test:prepare` creates `hackathon_test` from your `.env` credentials and applies migrations. If PostgreSQL was already initialized before the Docker init script existed:

```bash
docker exec hackathon-postgres createdb -U postgres hackathon_test
```

## Run

```bash
npm run dev
```

Or start everything with Docker: `docker compose up --build` ([docker.md](docker.md)).

* Frontend: http://localhost:5173
* API: http://localhost:5000
* Health: http://localhost:5000/health
* Readiness: http://localhost:5000/ready
* API v1: http://localhost:5000/api/v1
* Feature flags: http://localhost:5000/api/v1/features (see [features.md](features.md))
* Auth: http://localhost:5000/api/v1/auth/login (see [auth.md](auth.md))
* Sign-in UI: http://localhost:5173/login (after seed: `demo.officer@example.com` / `demo-password`)
* Password reset: http://localhost:5000/api/v1/auth/password-reset/request (see [auth.md](auth.md))
* OTP: http://localhost:5000/api/v1/auth/otp/request (see [otp.md](otp.md))
* RBAC: http://localhost:5000/api/v1/roles (see [rbac.md](rbac.md))
* Command Center: http://localhost:5173/bharatbid
* Tenders: http://localhost:5173/bharatbid/tenders
* AI health: http://localhost:5000/api/v1/ai/health (see [ai.md](ai.md); requires `ai.use`)
* Document analyze: http://localhost:5000/api/v1/documents/analyze (see [documents.md](documents.md); requires `documents.analyze`)
* Notifications: http://localhost:5000/api/v1/notifications (see [notifications.md](notifications.md); requires `notifications.read`)
* Notifications UI: http://localhost:5173/bharatbid/notifications
* PDF generate: http://localhost:5000/api/v1/pdf/generate (see [pdf.md](pdf.md); requires `reports.generate`)
* Reports: http://localhost:5000/api/v1/reports/generate (see [reports.md](reports.md); requires `reports.generate`)
* Files: http://localhost:5000/api/v1/files (see [storage.md](storage.md); requires `files.read` / `files.write`)
* Job status: http://localhost:5000/api/v1/jobs/:jobId (see [jobs.md](jobs.md); requires `jobs.read`)

Workers register `email.send`, `sms.send`, `pdf.generate`, `report.generate`, `ai.analyze`, `document.process`, `cleanup`, and `notification.dispatch`. Without Redis they share a file queue with the API; with `REDIS_URL` they share BullMQ. See [jobs.md](jobs.md) and [redis.md](redis.md).

```bash
npm run dev:workers
```

## Verify

```bash
npm test
npm run test:unit
npm run test:integration
npm run test:watch
npm run test:coverage
npm run test:e2e
npm run lint
npm run typecheck
npm run build
npm run security:secrets
```

See [testing.md](testing.md) for factories, mocks, coverage, and CI rules. GitHub Actions workflows live in `.github/workflows/` ([ci-cd.md](ci-cd.md)).

## Production secrets

`NODE_ENV=production` fails startup if required secrets are missing. See [configuration](configuration.md). Copy JWT secrets from `.env.example` into `.env` (and replace them) before calling login locally.
