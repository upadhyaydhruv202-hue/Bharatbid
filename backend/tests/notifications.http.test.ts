import { randomUUID } from 'node:crypto';

import pino from 'pino';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest';

import { createApp } from '../src/app';
import { loadConfig } from '../src/config';
import { ERROR_CODES } from '../src/constants';
import { createDatabaseClient, type DatabaseClient } from '../src/lib/database';
import { ROLES } from '../src/rbac/catalog';
import { seedRbacCatalog } from '../src/rbac/seed-catalog';
import { AUTH_TEST_ENV } from './helpers/auth';
import {
  describeDatabase,
  disconnectTestPrisma,
  getTestPrisma,
  getTestRepositories,
  resetDatabase,
} from './helpers/database';

const logger = pino({ level: 'silent' });
const VALID_PASSWORD = 'correct-horse';

describeDatabase('Notification engine (database)', () => {
  let database!: DatabaseClient;
  let app!: ReturnType<typeof createApp>['app'];

  beforeAll(async () => {
    database = createDatabaseClient({
      url: process.env.DATABASE_URL as string,
      poolMax: 5,
      poolTimeoutSeconds: 10,
    });
    app = createApp({
      config: loadConfig({
        ...AUTH_TEST_ENV,
        DATABASE_URL: process.env.DATABASE_URL,
        AUTH_DEFAULT_ROLE: ROLES.USER,
        DEMO_MODE: 'true',
        FEATURE_SMS: 'true',
      }),
      logger,
      database,
    }).app;
  });

  beforeEach(async () => {
    await resetDatabase();
    await seedRbacCatalog(getTestPrisma());
  });

  afterAll(async () => {
    await database.close();
    await disconnectTestPrisma();
  });

  async function register(email: string) {
    const response = await request(app).post('/api/v1/auth/register').send({
      email,
      password: VALID_PASSWORD,
      displayName: email.split('@')[0],
    });
    expect(response.status).toBe(201);
    return response.body.data as {
      user: { id: string };
      tokens: { accessToken: string };
    };
  }

  async function asManager(email: string) {
    const session = await register(email);
    const role = await getTestRepositories().roles.findByNameOrThrow(ROLES.MANAGER);
    await getTestRepositories().roles.assignUser(session.user.id, role.id);
    return session;
  }

  function authHeader(token: string) {
    return { Authorization: `Bearer ${token}` };
  }

  it('sends an in-app notification, lists unread history, and marks it read', async () => {
    const user = await register('engine-user@example.com');
    const manager = await asManager('engine-manager@example.com');

    const sent = await request(app)
      .post('/api/v1/notifications/send')
      .set(authHeader(manager.tokens.accessToken))
      .send({
        channel: 'in_app',
        recipient: { userId: user.user.id },
        template: 'welcome',
        data: { appName: 'BharatBid', displayName: 'Ada' },
        priority: 'high',
      });
    expect(sent.status).toBe(201);
    expect(sent.body.data.delivery.status).toBe('sent');

    const unread = await request(app)
      .get('/api/v1/notifications/unread-count')
      .set(authHeader(user.tokens.accessToken));
    expect(unread.body.data.count).toBe(1);

    const listed = await request(app)
      .get('/api/v1/notifications?unreadOnly=true')
      .set(authHeader(user.tokens.accessToken));
    expect(listed.body.data.items).toHaveLength(1);

    const marked = await request(app)
      .post(`/api/v1/notifications/${listed.body.data.items[0].id}/read`)
      .set(authHeader(user.tokens.accessToken));
    expect(marked.status).toBe(200);
    expect(marked.body.data.readAt).toBeTruthy();

    const allRead = await request(app)
      .post('/api/v1/notifications/read-all')
      .set(authHeader(user.tokens.accessToken));
    expect(allRead.status).toBe(200);
  });

  it('honours a disabled marketing preference and rejects invalid recipients', async () => {
    const user = await register('prefs-user@example.com');
    const manager = await asManager('prefs-manager@example.com');

    const updated = await request(app)
      .put('/api/v1/notifications/preferences')
      .set(authHeader(user.tokens.accessToken))
      .send({
        preferences: [{ category: 'marketing', channel: 'email', enabled: false }],
      });
    expect(updated.status).toBe(200);

    const skipped = await request(app)
      .post('/api/v1/notifications/send')
      .set(authHeader(manager.tokens.accessToken))
      .send({
        channel: 'email',
        recipient: { userId: user.user.id },
        template: 'marketing',
        data: { title: 'Sale', body: '20% off' },
        idempotencyKey: `marketing:${randomUUID()}`,
      });
    expect(skipped.status).toBe(200);
    expect(skipped.body.data.skipped).toBe(true);
    expect(skipped.body.data.reason).toBe('preference_disabled');

    const invalid = await request(app)
      .post('/api/v1/notifications/send')
      .set(authHeader(manager.tokens.accessToken))
      .send({
        channel: 'sms',
        recipient: { email: 'not-a-phone@example.com' },
        template: 'generic',
        data: { title: 'Hi', body: 'There' },
      });
    expect(invalid.status).toBe(400);
    expect(invalid.body.error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
  });

  it('ignores a duplicate idempotency key', async () => {
    const user = await register('dup-user@example.com');
    const manager = await asManager('dup-manager@example.com');
    const key = `event:${randomUUID()}`;
    const body = {
      channel: 'in_app',
      recipient: { userId: user.user.id },
      template: 'generic',
      data: { title: 'Once', body: 'Only once' },
      idempotencyKey: key,
      async: false,
    };

    const first = await request(app)
      .post('/api/v1/notifications/send')
      .set(authHeader(manager.tokens.accessToken))
      .send(body);
    const second = await request(app)
      .post('/api/v1/notifications/send')
      .set(authHeader(manager.tokens.accessToken))
      .send(body);

    expect(first.status).toBe(201);
    expect(second.status).toBe(200);
    expect(second.body.data.reason).toBe('duplicate');

    const listed = await request(app)
      .get('/api/v1/notifications')
      .set(authHeader(user.tokens.accessToken));
    expect(listed.body.data.items).toHaveLength(1);
  });
});
