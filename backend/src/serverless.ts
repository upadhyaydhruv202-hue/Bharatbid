import type { IncomingMessage, ServerResponse } from 'node:http';

import type { Express } from 'express';

import { createApp } from './app';
import { loadConfig } from './config';
import { loadEnvFiles } from './config/env';
import { createDatabaseClient } from './lib/database';
import { createRedisClient } from './lib/redis';
import { createLogger } from './utils/logger';

/**
 * Serverless entry (Vercel). One Express app per warm function instance; Prisma and Redis clients are
 * cached on globalThis so re-invocations reuse connections instead of opening new ones per request.
 * No listen(), no signal handlers, no in-process BullMQ worker (use JOBS_MODE=inline).
 */
interface ServerlessState {
  app?: Express;
  bootError?: Error;
}

const globalState = globalThis as typeof globalThis & { __bharatbidServerless?: ServerlessState };

function state(): ServerlessState {
  globalState.__bharatbidServerless ??= {};
  return globalState.__bharatbidServerless;
}

export function getServerlessApp(): Express {
  const current = state();
  if (current.app) return current.app;

  loadEnvFiles();
  const config = loadConfig();
  const logger = createLogger(config);

  if (config.jobs.mode !== 'inline') {
    logger.warn(
      { jobsMode: config.jobs.mode },
      'Serverless runtime without JOBS_MODE=inline: queued jobs need an external worker to complete',
    );
  }

  const database = config.databaseUrl
    ? createDatabaseClient({
        url: config.databaseUrl,
        poolMax: config.databasePoolMax,
        poolTimeoutSeconds: config.databasePoolTimeoutSeconds,
      })
    : null;
  const redis = config.redisUrl ? createRedisClient(config.redisUrl) : null;

  const { app } = createApp({ config, logger, database, redis });
  current.app = app;
  return app;
}

export default function handler(req: IncomingMessage, res: ServerResponse): void {
  const current = state();
  let app: Express;
  try {
    app = getServerlessApp();
  } catch (error) {
    current.bootError = error instanceof Error ? error : new Error('Server failed to start');
    // Boot errors are config problems (missing secrets etc.); log detail server-side only.
    console.error('BharatBid API boot failed:', current.bootError.message);
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Service is not configured' },
      }),
    );
    return;
  }
  app(req as Parameters<Express>[0], res as Parameters<Express>[1]);
}
