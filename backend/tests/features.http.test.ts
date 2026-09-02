import pino from 'pino';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from '../src/app';
import { loadConfig } from '../src/config';

const logger = pino({ level: 'silent' });

function buildApp(env: Record<string, string> = {}) {
  return createApp({
    config: loadConfig({
      NODE_ENV: 'test',
      APP_NAME: 'BharatBid',
      ...env,
    }),
    logger,
  }).app;
}

describe('GET /api/v1/features', () => {
  it('returns enabled flags and demo mode', async () => {
    const response = await request(
      buildApp({
        DEMO_MODE: 'true',
        FEATURE_AI: 'true',
        FEATURE_SMS: 'false',
        AI_PROVIDER: 'mock',
      }),
    ).get('/api/v1/features');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.demoMode).toBe(true);
    expect(response.body.data.features.ai).toBe(true);
    expect(response.body.data.features.sms).toBe(false);
    expect(response.body.data.features.copilot).toBeUndefined();
  });

  it('returns disabled flags when they are off', async () => {
    const response = await request(
      buildApp({
        DEMO_MODE: 'false',
        FEATURE_PDF: 'false',
      }),
    ).get('/api/v1/features');

    expect(response.status).toBe(200);
    expect(response.body.data.demoMode).toBe(false);
    expect(response.body.data.features.pdf).toBe(false);
  });

  it('treats missing flags as disabled', async () => {
    const response = await request(buildApp()).get('/api/v1/features');

    expect(response.status).toBe(200);
    expect(response.body.data.features.pdf).toBe(true);
    expect(response.body.data.features.s3).toBe(false);
    expect(response.body.data.features.otp).toBe(false);
  });

  it('reports production mode when DEMO_MODE is false', async () => {
    const response = await request(buildApp({ DEMO_MODE: 'false' })).get('/api/v1/features');
    expect(response.body.data.demoMode).toBe(false);
  });
});
