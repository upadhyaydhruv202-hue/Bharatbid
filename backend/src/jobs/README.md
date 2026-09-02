# Jobs

Queue definitions and job payloads live here.

Workers consume these jobs asynchronously. Do not process queues inside controllers.

`createJobQueue({ redisUrl })` uses BullMQ. `createJobQueue({ jobsDir })` uses a file queue shared by the API and workers on one machine. Tests without either option stay in-memory.

Registered job names: `email.send`, `sms.send`, `pdf.generate`, `report.generate`, `ai.analyze`, `document.process`, `cleanup`, `notification.dispatch`. See `docs/jobs.md`.

`GET /api/v1/jobs/:jobId` returns sanitized status. Redis also backs cache, rate limits, OTP hashes, and idempotency keys when `REDIS_URL` is set.
