# syntax=docker/dockerfile:1

FROM node:20-alpine AS deps
RUN apk add --no-cache openssl libc6-compat
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
COPY workers/package.json ./workers/
COPY database ./database
RUN npm ci --ignore-scripts \
  && npx prisma generate --schema database/prisma/schema.prisma

FROM deps AS development
COPY --chown=node:node backend ./backend
COPY --chown=node:node infra/docker ./infra/docker
RUN mkdir -p /app/backend/storage /app/backend/job-queue \
  && chown node:node /app/backend/storage /app/backend/job-queue
USER node
ENV NODE_ENV=development \
    HOST=0.0.0.0
EXPOSE 5000
ENTRYPOINT ["node", "/app/infra/docker/backend-entrypoint.cjs"]
CMD ["api"]

FROM deps AS build
COPY backend ./backend
RUN npm run build -w backend

FROM node:20-alpine AS production
RUN apk add --no-cache openssl libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
COPY workers/package.json ./workers/
COPY database ./database
RUN npm ci --omit=dev --ignore-scripts \
  && npx prisma generate --schema database/prisma/schema.prisma
COPY --from=build --chown=node:node /app/backend/dist ./backend/dist
COPY --chown=node:node infra/docker ./infra/docker
RUN mkdir -p /app/backend/storage /app/backend/job-queue \
  && chown node:node /app/backend/storage /app/backend/job-queue
USER node
ENV NODE_ENV=production \
    HOST=0.0.0.0
EXPOSE 5000
ENTRYPOINT ["node", "/app/infra/docker/backend-entrypoint.cjs"]
CMD ["api"]
