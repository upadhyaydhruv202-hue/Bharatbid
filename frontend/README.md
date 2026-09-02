# Frontend

React + Vite + Tailwind + React Router for **BharatBid**.

Product screens live in `src/pages/bharatbid/`. Shared UI primitives in `src/ui` are the Command Center / workspace layout (not a generic gallery).

`src/lib/rbac.ts` can hide privileged controls from the UI. Backend authorization remains authoritative.

Development proxies `/health`, `/ready`, and `/api` to `API_PROXY_TARGET` (default `http://localhost:5000`). Docker Compose serves a production SPA image that proxies those paths to the `backend` service. See `docs/docker.md`.
