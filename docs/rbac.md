# Role-based access control

Reusable authorization on top of authentication. Identity is `authenticate()`. Access is roles and `resource.action` permissions loaded from PostgreSQL on each request.

Frontend checks are UX only. Backend middleware and services are authoritative.

## Model

```text
User
  → Role (many)
    → Permission (many)
```

A user may hold multiple roles. Effective permissions are the **union** of those roles. There is no hardcoded ADMIN bypass in middleware: ADMIN is a seeded role that is granted the default catalog, not a special case in `requirePermission`.

Default roles (configurable; stored lowercase, matched case-insensitively):

| Role | Typical use |
| --- | --- |
| `admin` (`ADMIN`) | Full catalog |
| `manager` (`MANAGER`) | Users, reports, notifications, audit (infrastructure role used by tests) |
| `staff` (`STAFF`) | Operational access |
| `user` (`USER`) | Application login (`AUTH_DEFAULT_ROLE`) |
| `procurement_officer` | Create and manage tenders, bidders, and bids |
| `reviewer` | Read tenders, bidders, and bids |

`AUTH_DEFAULT_ROLE` (default `user`) is assigned on register when that role exists.

## Permission format

Keys are `resource.action` (lowercase, dotted). Examples already in the catalog:

* `users.read` / `users.write`
* `reports.generate`
* `notifications.read` / `notifications.write`
* `ai.use`
* `documents.analyze` / `documents.read`
* `files.read` / `files.write`
* `jobs.read`
* `audit.read`
* `admin.settings`
* `tenders.read` / `tenders.write`
* `bidders.read` / `bidders.write`
* `bids.read` / `bids.write`

New keys such as `inventory.approve` can be added **without changing middleware internals**.

## Middleware

```ts
import { authenticate } from '../auth';
import { authorizeRole, requirePermission } from '../rbac';

router.get('/reports', authenticate, requirePermission('reports.generate'), controller.generate);
router.delete('/settings', authenticate, authorizeRole('ADMIN'), controller.reset);
```

* `authorizeRole("ADMIN")` — caller must have **at least one** of the listed roles (`ADMIN` and `admin` are the same).
* `requirePermission("reports.generate")` — caller must have **every** listed permission.
* Missing `authenticate()` fails closed with `401`.
* Wrong role or permission returns `403 AUTHORIZATION_ERROR`.

Use `hasRole` / `hasPermission` / `assertPermission` in services for non-HTTP checks.

Do not authorize from the JWT `role` claim. `authenticate()` reloads roles and permissions from the database so assignments take effect before the access token expires.

AI routes require `ai.use`. Manager and admin receive it by default. See [ai.md](ai.md).

Document intelligence routes require `documents.analyze` / `documents.read`. Manager and admin receive them by default. See [documents.md](documents.md).

File upload routes require `files.read` / `files.write`. User, staff, manager, officer, and admin receive them as catalogued. Callers only access their own files unless they have `admin.settings`. See [storage.md](storage.md).

Job status (`GET /api/v1/jobs/:jobId`) requires `jobs.read`. See [jobs.md](jobs.md).

BharatBid routes require `tenders.*`, `bidders.*`, and `bids.*` as listed in `backend/src/rbac/catalog.ts`.

## Public HTTP API

Prefix: `/api/v1`. All of these require a bearer token **and** a catalog permission.

| Method | Path | Permission | Description |
| --- | --- | --- | --- |
| GET | `/roles` | `roles.read` | List roles and their permission keys |
| POST | `/roles` | `roles.write` | Create a role |
| GET | `/permissions` | `roles.read` | List permission keys |
| POST | `/permissions` | `roles.write` | Create a permission key |
| POST | `/roles/:roleName/permissions` | `roles.write` | Grant a permission to a role |
| POST | `/users/:userId/roles` | `roles.write` | Assign a role to a user |

`GET /api/v1/auth/me` returns `roles` and `permissions` for UI rendering. That list is not an authorization decision.

## Adding a permission

### 1. Catalog (recommended for defaults)

Edit `backend/src/rbac/catalog.ts`:

```ts
export const PERMISSIONS = {
  // ...
  INVENTORY_APPROVE: 'inventory.approve',
} as const;

// add to DEFAULT_PERMISSIONS, then to the roles that should have it
```

Re-run `npm run db:seed` in production, or restart the API locally. Outside production and test, startup upserts the default catalog (roles, permission keys, and default role grants). Seed is additive; it does not delete custom keys.

ADMIN receives every **catalog** key through seed data. A key created only via the API is not auto-granted to ADMIN.

### 2. API (runtime / demo)

```http
POST /api/v1/permissions
Authorization: Bearer <admin-access-token>
Content-Type: application/json

{
  "key": "inventory.approve",
  "description": "Approve inventory adjustments"
}
```

```http
POST /api/v1/roles/staff/permissions
Authorization: Bearer <admin-access-token>
Content-Type: application/json

{ "key": "inventory.approve" }
```

### 3. Protect the route

```ts
router.post(
  '/inventory/:id/approve',
  authenticate,
  requirePermission('inventory.approve'),
  controller.approve,
);
```

No changes to `authorizeRole` / `requirePermission` internals.

### 4. Optional custom role

```http
POST /api/v1/roles
{ "name": "inventory_manager", "description": "Approve stock movements" }

POST /api/v1/roles/inventory_manager/permissions
{ "key": "inventory.approve" }

POST /api/v1/users/<user-id>/roles
{ "role": "inventory_manager" }
```

## Frontend (UX only)

`frontend/src/lib/rbac.ts` helpers hide buttons and routes. Never skip the backend check because the UI hid a control.

```ts
if (hasPermission(user, 'tenders.write')) {
  // show create-tender control
}
```

## Tests

* correct / missing role
* correct / missing permission
* unauthenticated access
* multiple roles (permission union)
* protected catalog routes
* new keys such as `inventory.approve` without middleware changes
* ADMIN does not bypass unassigned permissions
* USER can call `/auth/me` but cannot obtain officer write rights from login alone

## Limitations

* Permissions are loaded on each authenticated request (no cache). Fine for the SIH demo.
* Seed is additive; unused roles from earlier demos (for example `member`) are not deleted.
* Outside production and test, API startup syncs the default catalog so new keys (for example `jobs.read`) are granted without a manual seed. Production must still run `npm run db:seed`.
* There is no permission-revocation HTTP endpoint yet (remove rows in the database or add one in a later module).
