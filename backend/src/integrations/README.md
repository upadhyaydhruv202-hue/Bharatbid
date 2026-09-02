# Integrations

External providers are isolated behind adapters.

* AI providers — `backend/src/integrations/ai` (see `docs/ai.md`)
* Document intelligence — `backend/src/integrations/documents` (see `docs/documents.md`)
* Storage providers — `backend/src/integrations/storage` (see `docs/storage.md`)
* Email providers — `backend/src/integrations/email` (see `docs/email.md`)
* OTP — `backend/src/otp` (see `docs/otp.md`)
* PDF generation — `backend/src/integrations/pdf` (see `docs/pdf.md`)
* SMS providers — `backend/src/integrations/sms` (see `docs/sms.md`)

Business logic must not import provider SDKs directly. Frontend code must not receive AI, SMTP, or other backend credentials.
