# BharatBid authentication setup

BharatBid verifies **identity** separately from **authorization**. A successful email OTP, SMS OTP, or Google sign-in creates or links a user. Organization membership and RBAC still decide which tenders and bids that user can see. New accounts receive the default `user` role. They are not procurement officers.

This product is not a Government of India service.

## 1. Google Cloud project

1. Open [Google Cloud Console](https://console.cloud.google.com/).
2. Create or select a project.
3. Enable the Google Identity / OAuth consent screen for a **web application**.

## 2. Configure Google Identity (OAuth 2.0)

Create an OAuth client of type **Web application**.

Authorized JavaScript origins (examples):

- `http://localhost:5173`
- `http://localhost:5000`
- your production frontend origin

Authorized redirect URIs are only required if you later add a redirect code flow. The current Sign in with Google button uses [Google Identity Services](https://developers.google.com/identity/gsi/web/reference/js-reference) and an **ID token**. Do not use the deprecated implicit OAuth flow.

## 3. Client credentials

Copy the **Client ID**. Put it in backend environment as `GOOGLE_CLIENT_ID`.

The frontend reads the public client ID from `GET /api/v1/auth/public-config`. Do not put `GOOGLE_CLIENT_SECRET` in any `VITE_*` variable.

`GOOGLE_CLIENT_SECRET` and `GOOGLE_REDIRECT_URI` are reserved for a confidential server flow and are not sent to the browser.

## 4. Backend environment

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=
```

The backend verifies the ID token with Google (`aud`, `iss`, `sub`, `exp`). Email from the browser is never trusted as proof of identity. The stable Google account key is `sub`.

## 5. MSG91 mobile OTP

1. Create an MSG91 account.
2. Enable the OTP / authentication product.
3. Create an OTP template. For India SMS, complete DLT sender and template registration as required by TRAI/DLT.
4. Copy the auth key and template ID into backend environment only:

```env
SMS_ENABLED=true
SMS_PROVIDER=msg91
MSG91_AUTH_KEY=
MSG91_TEMPLATE_ID=
MSG91_WIDGET_ID=
```

`MSG91_WIDGET_ID` is optional. BharatBid uses the MSG91 OTP v5 send API and stores a **hashed** copy of a locally generated 6-digit OTP. MSG91 API failures are never treated as successful authentication.

If MSG91 is not configured, the API returns **CONFIGURATION REQUIRED**.

## 6. Email OTP (SMTP)

```env
EMAIL_ENABLED=true
EMAIL_PROVIDER=smtp
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=
SMTP_FROM_NAME=
```

Never set `VITE_SMTP_*`. OTP values are hashed, expire in 5 minutes, allow 5 attempts, and are invalidated on success or when a newer code is issued.

## 7. Demo / development shortcuts

```env
AUTH_DEMO_MODE=false
DEMO_MODE=true
```

`AUTH_DEMO_MODE=true` (non-production) may mock OTP delivery for local development. Production defaults to `false`. The login UI does not display demo email/password pairs.

## 8. Start the application

```bash
npm run dev
```

## 9. Test sign-in

1. Open `/login`.
2. Request an email or mobile OTP.
3. Confirm the message arrived from SMTP or MSG91.
4. Verify the code.
5. Confirm `/auth/me` shows the default role and only that user's organization.
6. Test Google only after `GOOGLE_CLIENT_ID` is set; invalid tokens must fail.

## Account linking

A verified Google `sub` is stored on the user. If Google reports a verified email that already belongs to a BharatBid user with no Google subject, the accounts are linked. Email string matching alone without Google `email_verified` does not merge accounts.

## Security notes

- OTP, SMTP passwords, MSG91 auth keys, Google client secrets, and access tokens must not appear in audit logs.
- Organization IDs and roles supplied by the frontend are ignored; membership comes from the database.
- Logout revokes the refresh-token family and the access JTI when revocation is configured.
