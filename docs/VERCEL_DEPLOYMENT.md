# Deploying BharatBid AI to Vercel

This guide deploys the **whole application** — React frontend, Express API, PostgreSQL, Redis, real
authentication (SMTP email OTP, MSG91 mobile OTP, Google), private document storage — as **one Vercel
project** on **one origin**. Nothing is mocked: the API is the same `createApp()` used locally, running as
a Vercel Node.js function.

> Honesty rules still apply in production. Verification adapters run as **DEMO SOURCE** with
> **DEMO / SYNTHETIC** labels unless you configure a real GST/PAN provider. BharatBid is not a Government
> of India service and never claims government verification for demo data.

---

## 1. Architecture

```mermaid
flowchart LR
  B[Browser] -->|"/  /bharatbid/*  (static)"| CDN[Vercel CDN<br/>frontend/dist]
  B -->|"/api/*  /health  /ready"| FN["Vercel Function<br/>api/index.ts → Express createApp()"]
  FN --> PG[(Neon PostgreSQL<br/>data + stored_objects)]
  FN --> RD[(Upstash Redis<br/>OTP, rate limits, revocation)]
  FN --> SMTP[SMTP<br/>email OTP]
  FN --> MSG[MSG91<br/>mobile OTP]
  FN --> G[Google tokeninfo<br/>ID-token check]
```

| Piece | How it runs on Vercel |
| --- | --- |
| Frontend | `vite build` → `frontend/dist`, served by the Vercel CDN. SPA fallback rewrite to `index.html`. |
| API | `api/index.ts` re-exports `backend/src/serverless.ts`, which builds the Express app once per warm instance and caches Prisma + Redis on `globalThis`. No `listen()`. |
| Same origin | `vercel.json` rewrites `/api/*`, `/health`, `/ready` to the function. The SPA calls relative `/api/v1/...` (`VITE_API_URL` empty) — no CORS round-trips, no hard-coded hosts. |
| Jobs | `JOBS_MODE=inline`: queued work (reports, notification fan-out, email/SMS dispatch) runs inside the request before it returns. There is no background worker process on Vercel. |
| Files | `STORAGE_PROVIDER=postgres`: document bytes live in the private `stored_objects` table and are only served through authenticated, tenant-checked API routes. |

## 2. Services you need

| Service | Why | Free tier OK? |
| --- | --- | --- |
| **Vercel** | Hosting (static + function) | Hobby works; Pro gives longer function time |
| **Neon** (or Supabase / RDS Postgres) | Primary database + document bytes | Yes |
| **Upstash Redis** | Required in production: OTP state, rate limits (fail-closed), token revocation, idempotency | Yes |
| **SMTP mailbox** (Gmail app password, Brevo, SES SMTP, Zoho…) | Email OTP | Yes |
| **MSG91** | Mobile OTP (India, DLT template) | Paid credits |
| **Google Cloud OAuth client** | "Continue with Google" | Yes |

Redis is genuinely required: production config refuses to boot without `REDIS_URL`, because OTP
attempts, login throttling and refresh-token revocation must be shared across function instances.

## 3. Environment variables

The full template is [`.env.vercel.example`](../.env.vercel.example). Set every value in
**Vercel → Project → Settings → Environment Variables** (Production, and Preview if you use previews).

| Variable | Value | Notes |
| --- | --- | --- |
| `NODE_ENV` | `production` | Enables strict config checks, hides stack traces |
| `APP_URL`, `FRONTEND_URL` | `https://<your-domain>` | Used for signed links and email text |
| `CORS_ORIGINS` | `https://<your-domain>` | Never `*` (boot fails). Same-origin calls don't need it; list extra origins only for third-party browser clients |
| `VITE_API_URL` | *(empty)* | SPA uses same-origin `/api` |
| `DATABASE_URL` | Neon **pooled** URL + `&pgbouncer=true` | Runtime connection |
| `DATABASE_POOL_MAX` | `3` | Per function instance |
| `REDIS_URL` | `rediss://default:<token>@<host>:6379` | Upstash TLS URL |
| `JOBS_MODE` | `inline` | Required on Vercel |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `OTP_HASH_SECRET`, `STORAGE_SIGNING_SECRET` | 32+ random chars each | `openssl rand -base64 48` |
| `AUTH_DEMO_MODE` | `false` | Real OTP delivery. Production never inherits this from `DEMO_MODE` |
| `AUTH_PASSWORD_LOGIN` | `false` | Removes the old password login (`POST /auth/login` → 404) |
| `OTP_PROVIDER` | `auto` | Never `mock` |
| `GOOGLE_CLIENT_ID` | OAuth web client ID | Public by design (it's in the GIS button) |
| `EMAIL_ENABLED`, `EMAIL_PROVIDER`, `EMAIL_FROM`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM_NAME` | your SMTP | Email OTP |
| `SMS_ENABLED`, `SMS_PROVIDER=msg91`, `MSG91_AUTH_KEY`, `MSG91_TEMPLATE_ID` | your MSG91 | Server-only; never reaches the browser bundle |
| `STORAGE_PROVIDER` | `postgres` (or `s3` + `AWS_*`) | Vercel's filesystem is read-only |
| `DOCUMENT_MAX_BYTES`, `STORAGE_MAX_BYTES` | `4194304` | Vercel caps request bodies at 4.5 MB |
| `AI_ENABLED`, `FEATURE_AI` | `false` | Enable only with `GEMINI_API_KEY` |
| `DEMO_MODE`, `ALLOW_DEMO_IN_PRODUCTION` | `true`, `true` | Synthetic CPCL data + DEMO SOURCE adapters, clearly labelled |
| `DEMO_PROVISION_NEW_USERS` | `true` for a judge demo, `false` for real use | New verified sign-ups get `procurement_officer` in the synthetic demo tenant |
| `SEED_DEMO_PASSWORDS` | `false` | Demo users are created without passwords |

Only variables prefixed `VITE_` are embedded in the frontend bundle; the only one used is `VITE_API_URL`.

## 4. PostgreSQL (Neon)

1. Create a Neon project in the region closest to your users. Through the Vercel Marketplace
   (`vercel integration add neon -m region=sin1`) the closest region to India is **`sin1` Singapore**;
   a Neon account created directly also offers **AWS ap-south-1 / Mumbai**.
2. Copy two connection strings from the Neon dashboard (Marketplace installs expose them as
   `DATABASE_URL` / `DATABASE_URL_UNPOOLED`, or with the prefix you chose):
   - **Pooled** (host contains `-pooler`): runtime `DATABASE_URL` — append `&pgbouncer=true`.
   - **Direct** (no `-pooler`): only for migrations and seeding from your machine.
3. Keep `sslmode=require` on both; drop `channel_binding=require` (not needed by Prisma).

## 5. Prisma migrations (and the optional demo seed)

Migrations are **never** run by the Vercel build (`vercel-build` only runs `prisma generate` and the
frontend build). Run them yourself against the **direct** URL. Only `migrate deploy` is used — never
`migrate reset`, never `db push --force-reset`.

PowerShell:

```powershell
$env:DATABASE_URL = "postgresql://USER:PASSWORD@HOST/DB?sslmode=require"   # DIRECT url
npx prisma migrate deploy --schema database/prisma/schema.prisma
```

bash:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DB?sslmode=require" \
  npx prisma migrate deploy --schema database/prisma/schema.prisma
```

**Demo data (optional, idempotent, safe to re-run)** — synthetic CPCL tenders, bidders, bids and
DEMO-SYNTHETIC documents. Documents are written into `stored_objects`, so they download correctly on
Vercel. Demo users are created **without passwords**:

```powershell
$env:DATABASE_URL = "<DIRECT url>"; $env:NODE_ENV = "production"; $env:DEMO_MODE = "true"
$env:ALLOW_DEMO_IN_PRODUCTION = "true"; $env:STORAGE_PROVIDER = "postgres"; $env:SEED_DEMO_PASSWORDS = "false"
npm run db:seed -w backend
```

```bash
DATABASE_URL="<DIRECT url>" NODE_ENV=production DEMO_MODE=true ALLOW_DEMO_IN_PRODUCTION=true \
  STORAGE_PROVIDER=postgres SEED_DEMO_PASSWORDS=false npm run db:seed -w backend
```

Re-running the seed updates the same records (verified: counts unchanged on a second run).

## 6. Google OAuth

The app uses Google Identity Services (popup + ID token verified server-side). There is **no redirect
URI and no client secret** in this flow.

1. Google Cloud Console → APIs & Services → Credentials → **Create OAuth client ID** → *Web application*.
2. **Authorized JavaScript origins**: add `https://<your-domain>` (and each preview/custom domain you
   want Google sign-in on). Without this, Google silently renders no button on that origin.
3. OAuth consent screen: publish it (or add test users).
4. Set `GOOGLE_CLIENT_ID` in Vercel. `/api/v1/auth/public-config` then reports `googleEnabled: true`.

## 7. SMTP (email OTP)

Any SMTP provider on port 587 (STARTTLS) or 465 works; Vercel only blocks outbound port 25.

- Gmail: enable 2FA → create an **App password** → `SMTP_HOST=smtp.gmail.com`, `SMTP_USER=<gmail>`,
  `SMTP_PASSWORD=<app password>`, `EMAIL_FROM=<gmail>`.
- Set `EMAIL_ENABLED=true`, `EMAIL_PROVIDER=smtp`.
- `public-config` reports `emailOtpConfigured: true` once configured.

## 8. MSG91 (mobile OTP)

Mobile OTP is sent **only from the backend**. `MSG91_AUTH_KEY` is never exposed to the browser
(checked: the built `frontend/dist` contains no MSG91/SMTP/JWT/DB strings).

1. MSG91 → create an OTP template approved under your **DLT** registration; copy the template ID.
2. Copy the Auth Key.
3. MSG91 → API security / IP whitelisting: **disable IP restriction** (Vercel egress IPs are not static)
   or MSG91 will reject calls from the function.
4. Set `SMS_ENABLED=true`, `SMS_PROVIDER=msg91`, `MSG91_AUTH_KEY`, `MSG91_TEMPLATE_ID`.
5. The UI accepts a 10-digit Indian number (or `0`-prefixed, or full `+CC…`) and sends E.164 (`+91…`).

## 9. Object storage

Default: `STORAGE_PROVIDER=postgres`. Bytes are stored in the `stored_objects` table, private by
construction — there is no public bucket URL. Downloads go through
`GET /api/v1/bids/:bidId/documents/:id/download`, which requires a bearer token **and** membership in the
tender's organization (cross-org → 404).

Alternative: `STORAGE_PROVIDER=s3` with `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`,
`AWS_S3_BUCKET` (private bucket; the API still proxies downloads). Note: seeded demo documents are
written to `stored_objects`, so with `s3` the synthetic seed files won't be downloadable — upload new ones.

Limits: uploads are capped at 4 MB (`DOCUMENT_MAX_BYTES`) because Vercel rejects request bodies over
4.5 MB. Larger files are refused with a clear `400 Uploaded file is too large`.

## 10. Redis (Upstash)

1. Upstash → Create database (same region as the function) → copy the **`rediss://`** URL (TLS).
2. Set `REDIS_URL`.
3. `/ready` reports `redis.healthy: true` when reachable.

With `JOBS_MODE=inline`, Redis is **not** used as a BullMQ queue (no worker needed); it holds OTP state,
rate-limit counters (fail-closed in production), refresh-token revocation and idempotency keys.

## 11. Vercel project configuration

Everything is in [`vercel.json`](../vercel.json) — leave the dashboard's framework preset as **Other** and
the root directory as the **repository root**.

| Setting | Value (from `vercel.json`) |
| --- | --- |
| Install command | `npm ci --include=dev` (dev deps are needed for the build even though `NODE_ENV=production`) |
| Build command | `npm run vercel-build` → `prisma generate` + `vite build` |
| Output directory | `frontend/dist` |
| Function | `api/index.ts`, `maxDuration: 60`, bundles the Prisma Linux engine (`rhel-openssl-3.0.x`) |
| Rewrites | `/api/*`, `/health`, `/ready` → function; everything else → `index.html` |

Node.js version: 20.x or 22.x (Project → Settings → General). The **function region** is pinned next to
Neon by `"regions": ["sin1"]` in `vercel.json`; change it if your database lives elsewhere.

`.vercelignore` patterns for runtime folders (`/storage/`, `/job-queue/`, `/coverage/`) are anchored to the
repository root on purpose: an unanchored `storage/` also matches `backend/src/integrations/storage/` and
the function then fails with `Cannot find module '../storage/storage.keys'`.

## 12. Domain

1. Vercel → Project → Settings → Domains → add your domain and follow the DNS instructions.
2. Update `APP_URL`, `FRONTEND_URL`, `CORS_ORIGINS` to the final `https://` domain.
3. Add the domain to Google **Authorized JavaScript origins**.
4. Redeploy (env changes apply to new deployments only).

## 13. Local development

Nothing changes locally:

```bash
npm install
npm run deps:up          # Docker Postgres (5433) + Redis (6379)
npm run db:migrate
npm run db:seed          # local: demo users get password demo-password
npm run dev              # API :5000, Vite :5173 (proxies /api)
```

To rehearse the production shape locally: `npm run vercel-build`, then run the serverless handler with
`NODE_ENV=production JOBS_MODE=inline STORAGE_PROVIDER=postgres AUTH_PASSWORD_LOGIN=false` and serve
`frontend/dist` with the same rewrites. `vercel dev` also works once the project is linked.

## 14. Deployment commands

```bash
npm i -g vercel                      # or: npx vercel ...
vercel login
vercel link                          # from the repository root; framework "Other"

# Add each variable from .env.vercel.example (repeat per name; choose Production/Preview):
vercel env add DATABASE_URL production
vercel env add REDIS_URL production
# ...JWT_*, OTP_HASH_SECRET, STORAGE_SIGNING_SECRET, GOOGLE_CLIENT_ID, SMTP_*, MSG91_*, etc.

# One-time database setup from your machine (DIRECT Neon URL) — see section 5:
npx prisma migrate deploy --schema database/prisma/schema.prisma
npm run db:seed -w backend           # optional demo data, with the production flags

vercel --prod                        # build + deploy
```

Smoke test after deploy:

```bash
curl https://<your-domain>/health
curl https://<your-domain>/ready                       # database + redis healthy
curl https://<your-domain>/api/v1/auth/public-config   # passwordLogin:false, demoAuth:false
```

## 15. Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| Every API call returns `503 Service is not configured` | Boot-time config error. Function logs show which variable (e.g. missing `REDIS_URL`, short JWT secret, `CORS_ORIGINS=*`, `DEMO_MODE` without `ALLOW_DEMO_IN_PRODUCTION`). |
| Build fails: `vite: not found` / `tsc: not found` | Install ran without dev deps. Keep `npm ci --include=dev` from `vercel.json`. |
| `PrismaClientInitializationError: Query engine ... rhel-openssl-3.0.x` | Keep `binaryTargets = ["native", "rhel-openssl-3.0.x"]` in the schema and the `includeFiles` entry in `vercel.json`. |
| `prepared statement "s0" already exists` | Pooled Neon URL without `pgbouncer=true`. |
| `/ready` shows database unhealthy | Wrong URL, missing `sslmode=require`, or Neon compute suspended (first request wakes it). |
| Google button missing | Domain not in Google *Authorized JavaScript origins*, or `GOOGLE_CLIENT_ID` unset. |
| Email OTP "not configured" | `EMAIL_ENABLED` not `true` or SMTP variables missing. |
| Mobile OTP fails with provider error | MSG91 IP whitelist on, DLT template not approved, or wrong template ID. |
| Upload returns 413 / "too large" | Over 4 MB — Vercel body limit. |
| New sign-ups see an empty workspace / 403 on tenders | `DEMO_PROVISION_NEW_USERS=false` (by design) or the demo seed was not run; grant roles via the admin API. |
| `GET /api/v1/jobs/:id` 404 right after a queued report | Job status is kept per function instance; with `JOBS_MODE=inline` the job has already finished when the enqueue call returns. The UI uses synchronous report downloads. |

## 16. Security notes

- **Secrets**: only in Vercel env vars. `.env*` files are git-ignored (except the `*.example` templates)
  and excluded from uploads via `.vercelignore`. No secrets are committed.
- **Auth**: bearer JWTs (access 15 min, rotating refresh tokens with family revocation in Redis). Password
  login is disabled in production by default; demo users have no passwords.
- **OTP**: hashed with `OTP_HASH_SECRET`, attempt- and resend-limited via Redis; codes are never logged or
  returned. Production never mocks OTP delivery.
- **Tenancy**: every tender/bid/bidder/document/verification/report query is scoped to the caller's
  organization; cross-org access returns 404.
- **RBAC**: permissions per role (`procurement_officer`, `reviewer`, `manager`, `staff`, `admin`, `user`) enforced
  server-side on every route.
- **Errors**: production responses never include stack traces or 5xx internals; audit entries redact
  credentials and codes.
- **Transport**: `trust proxy` is on in production so rate limits use the real client IP; Helmet headers,
  strict CORS allow-list (never `*` with credentials).
- **Rate limits** fail closed in production if Redis is unreachable.
- **Demo honesty**: `DEMO_MODE` labels every adapter result DEMO / SYNTHETIC; no LIVE label without a
  configured live provider. Set `DEMO_PROVISION_NEW_USERS=false` before loading real procurement data.
- **Dependencies**: `npm audit --omit=dev` leaves two known items: `react-router` (open redirect via
  backslash links / SSR hydration — not used by this SPA; fix needs a v7 major upgrade) and
  `deepmerge-ts` inside the Prisma CLI config loader (build-time only).

## Verified before release

Run against a fresh database with the production settings above (serverless handler, `NODE_ENV=production`,
`JOBS_MODE=inline`, `STORAGE_PROVIDER=postgres`, real Redis):

- `migrate deploy` on an empty database; seed twice (idempotent); zero demo passwords.
- `/health`, `/ready` (database + Redis healthy); SPA deep links; `/api/v1/auth/login` → 404.
- 53 end-to-end API checks: auth/session, dashboards, tender lifecycle + amendment with change reason,
  duplicate reference and duplicate bid → 409, upload → Postgres → byte-identical download, oversize upload
  rejected, anonymous download 401, DEMO-labelled verification, bid lock on submit, document lock on closed
  tender, officer review OPEN → IN_REVIEW → ASSESSED → CLOSED and CLARIFICATION_REQUESTED, all five PDF
  report kinds, inline queued report, cross-org 404 on tender/bid/bidder/document/verification/report,
  reviewer RBAC, audit redaction, no stack traces.
- Backend unit + integration suites, frontend tests, lint and typecheck all green.
