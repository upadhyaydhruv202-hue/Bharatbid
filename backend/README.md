# Backend

Express API for **BharatBid** (SIH Problem Statement 26100).

Product domain lives in `src/problem/`. Shared infrastructure (auth, RBAC, Prisma, storage, documents, PDF, notifications, jobs) remains in this package because BharatBid uses it at runtime.

## Scripts

```bash
npm run dev -w backend
npm run db:migrate
npm run db:seed
npm test -w backend
npm run test:watch -w backend
npm run test:coverage -w backend
npm run test:e2e -w backend
npm run lint -w backend
npm run typecheck -w backend
npm run build -w backend
```

## Layout

See [docs/BHARATBID_ARCHITECTURE.md](../docs/BHARATBID_ARCHITECTURE.md).
