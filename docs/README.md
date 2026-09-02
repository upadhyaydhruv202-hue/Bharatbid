# Documentation

Product documentation for **BharatBid** (SIH Problem Statement 26100):

| Document | Purpose |
| --- | --- |
| [Academic assignment](ASSIGNMENT.md) | Software engineering project document |
| [BharatBid architecture](BHARATBID_ARCHITECTURE.md) | Product architecture |
| [SIH demo guide](BHARATBID_DEMO_GUIDE.md) | Live demonstration script |
| [Security](BHARATBID_SECURITY.md) | Product security posture |
| [SIH readiness](BHARATBID_SIH_READINESS_CHECKLIST.md) | Submission checklist |
| [Future scope](BHARATBID_FUTURE_SCOPE.md) | Explicitly out-of-scope items |
| [Intelligence features](BHARATBID_FINAL_INTELLIGENCE_FEATURES.md) | DEMO adapters, coverage, risk, advisory |
| [Final repository audit](BHARATBID_FINAL_REPOSITORY_AUDIT.md) | Earlier dependency purge (Slice 12) |

Shared infrastructure still used by BharatBid:

| Document | Purpose |
| --- | --- |
| [Getting started](getting-started.md) | Local setup and verification |
| [UI](ui.md) | React + Tailwind components used by Command Center |
| [Docker](docker.md) | Compose stack and health checks |
| [Foundation](foundation.md) | Configuration, health, shutdown |
| [Database](database.md) | Prisma, migrations, seeding, repositories |
| [Authentication](auth.md) | Register, login, JWT, refresh rotation |
| [RBAC](rbac.md) | Roles and `resource.action` permissions |
| [AI](ai.md) | Provider-agnostic LLM service used by document intelligence |
| [AI guardrails](ai-guardrails.md) | Schema, confirmation, redaction, audit |
| [Document intelligence](documents.md) | Upload, validate, extract |
| [Storage](storage.md) | Local filesystem, PostgreSQL, and S3 object storage |
| [Background jobs](jobs.md) | Queues, job status API, workers |
| [Redis](redis.md) | Optional cache, rate limits, OTP state, queues |
| [Email](email.md) | Transactional email |
| [OTP](otp.md) | Hashed one-time passcodes |
| [SMS](sms.md) | Transactional SMS |
| [PDF](pdf.md) | Low-level PDF renderer |
| [Reports](reports.md) | Report templates and async PDF jobs |
| [Notifications](notifications.md) | Multi-channel notifications |
| [Scheduler](scheduler.md) | Optional interval/cron ticks |
| [API conventions](api-conventions.md) | `/api/v1` envelopes |
| [Validation](validation.md) | Zod schemas and parse helpers |
| [Security](security.md) | Headers, CORS, rate limits |
| [Audit](audit.md) | Audit events and redaction |
| [Observability](observability.md) | Logs, health, metrics hooks |
| [Configuration](configuration.md) | Environment variables |
| [Feature flags](features.md) | `FEATURE_*` registry and demo mode |
| [Testing](testing.md) | Unit, integration, e2e |
| [CI/CD](ci-cd.md) | GitHub Actions |

Repository-level documents:

* `README.md`
* `CHANGELOG.md` — documentation redesign notes
* `PROBLEM_STATEMENT.md`
* `ARCHITECTURE_DECISION.md`
