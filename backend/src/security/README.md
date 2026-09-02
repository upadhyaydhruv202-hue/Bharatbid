# Security

Reusable HTTP and integration hardening. Auth-specific password hashing and JWT verification stay in `backend/src/auth`.

## Controls

* **Headers** — Helmet with an API CSP (`default-src 'none'`), `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy: no-referrer`, HSTS in production
* **CORS** — explicit origin allowlist, credentials enabled, `*` rejected
* **Body limits** — `REQUEST_BODY_LIMIT` (JSON/urlencoded) plus per-upload byte caps
* **Rate limiting** — Redis when a Redis client is configured, otherwise in-memory. Separate policies for authentication, OTP, AI, file upload, public APIs, authenticated APIs, and admin APIs. Login, OTP, and password reset also have identity+IP brute-force limits
* **Cookies** — `secureCookieOptions()` for any future httpOnly cookies. Tokens are currently JSON, not cookies
* **SSRF** — `assertSafeExternalUrl` / `fetchExternal` for user-controlled URLs (webhooks). Timeouts, `redirect: 'error'`, hostname checks, and DNS resolution of private/loopback addresses are blocked
* **Secrets** — production startup checks plus `npm run security:secrets`
* **Errors** — stack traces and secrets are never returned to clients

Do not use feature flags to bypass these controls.
