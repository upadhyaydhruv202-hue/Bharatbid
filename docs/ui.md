# Reusable React UI

Presentational React + Tailwind components used by BharatBid screens (Command Center, tables, KPIs, forms). They work in this Vite app. They do not call government APIs and do not contain procurement business rules.

Import from `frontend/src/ui`:

```tsx
import { Button, DataTable, PageContainer } from '../ui';
```

## Architecture

```text
Page
 → layout (AppShell, PageContainer)
 → visual components (Button, DataTable, Modal, …)
 → page/service callbacks
 → services/api.ts
 → /api/v1
```

Visual components receive data and callbacks as props. Pages and `frontend/src/services` own URLs, auth tokens, and domain mapping.

## Theme and toasts

`ThemeProvider` and `ToastProvider` wrap the app in `App.tsx`. Theme preference is stored in `localStorage` under `bharatbid.theme` (`light` | `dark` | `system`). The document `class="dark"` drives Tailwind tokens.

Use context only for these globals:

* color scheme
* toast stack
* auth session (`AuthProvider`)
* feature flags (`FeatureProvider`, UX only)
* optional `ApiClientProvider`

Do not put table sort, modal open state, or form fields in context.

## API client

`createApiClient` in `frontend/src/services/api.ts` is the HTTP abstraction. Components must not hardcode backend URLs.

```ts
const client = createApiClient({
  baseUrl: import.meta.env.VITE_API_URL ?? '',
  getToken: () => localStorage.getItem('hsk.accessToken') ?? undefined,
});

const items = await client.get('/api/v1/example', { query: { page: 1 } });
```

Existing helpers `apiGet` / `apiRequest` remain. `VITE_API_URL` stays empty locally so Vite/nginx can proxy `/api`, `/health`, and `/ready`. Domain helpers live in `frontend/src/services` (`auth`, `notifications`, `bharatbid`). File **upload** is multipart; send `FormData` with `fetch` rather than the JSON client.

## Layout

| Component | Role |
| --- | --- |
| `AppShell` | Sidebar + topbar + skip link |
| `Sidebar` / `SidebarNavLink` | Primary navigation (router adapter is separate from the shell) |
| `Topbar` | Menu, theme toggle, actions |
| `Breadcrumb` | Trail |
| `PageContainer` | Title, description, width |
| `ResponsiveGrid` | 1–4 column grid |

## Primitives and overlays

Button, Input, Select, Checkbox, Badge, Card, Alert, Skeleton, Tabs, Modal, Drawer, Dropdown, Toast.

Modal and drawer close on Escape, restore focus, and lock body scroll. Tabs and dropdowns support arrow keys.

## Data and states

`DataTable`, `Pagination`, `Search`, `EmptyState`, `ErrorState`, `LoadingState`.

Tables accept generic rows. Sorting can be local (no `onSortChange`) or controlled by the page for server-side sort.

## Command Center building blocks

Command Center (`/bharatbid`) composes `KpiCard`, `SimpleBarChart`, and `ActivityFeed`. There is no generic starter dashboard layout.

`SimpleBarChart` is an SVG chart so the app does not require Recharts or Chart.js.

## Auth UI

`LoginForm` is presentational. `AuthProvider` (global session only) calls `POST /api/v1/auth/login`, stores access/refresh tokens in `localStorage`, persists only known user fields, and exposes `useAuth()`. `/login` is the sign-in page and redirects home once a session exists. BharatBid pages use `SessionGate` instead of a pasted JWT.

Do not log tokens or passwords. Demo seed credentials are documented in [database.md](database.md), not hardcoded into `LoginForm`.

## Accessibility

* Native controls where possible (`input`, `select`, `button`)
* Labels, `aria-invalid`, dialog `aria-modal`
* Visible focus rings
* Skip link in `AppShell`
* `prefers-reduced-motion` disables decorative animation

## Demo routes

| Path | Purpose |
| --- | --- |
| `/login` | Sign in |
| `/bharatbid` | Command Center |
| `/notifications` | Notification channel preferences |

BharatBid product screens live under `/bharatbid/*`.
