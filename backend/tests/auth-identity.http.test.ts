import pino from 'pino';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../src/app';
import { loadConfig } from '../src/config';
import { createDatabaseClient, type DatabaseClient } from '../src/lib/database';
import { FixedOtpGenerator } from '../src/otp';
import { DEMO_ORGANIZATION_ID } from '../src/problem/organization-scope';
import { seedRbacCatalog } from '../src/rbac/seed-catalog';
import { AUTH_TEST_ENV } from './helpers/auth';
import {
  describeDatabase,
  disconnectTestPrisma,
  getTestPrisma,
  resetDatabase,
} from './helpers/database';

const logger = pino({ level: 'silent' });

describeDatabase('Auth identity HTTP', () => {
  let database!: DatabaseClient;
  let app!: ReturnType<typeof createApp>['app'];

  beforeAll(() => {
    database = createDatabaseClient({
      url: process.env.DATABASE_URL as string,
      poolMax: 5,
      poolTimeoutSeconds: 10,
    });
    app = createApp({
      config: loadConfig({
        ...AUTH_TEST_ENV,
        DATABASE_URL: process.env.DATABASE_URL,
        FEATURE_OTP: 'true',
        OTP_PROVIDER: 'mock',
        OTP_RESEND_COOLDOWN: '0s',
        AUTH_DEMO_MODE: 'true',
      }),
      logger,
      database,
      otpGenerator: new FixedOtpGenerator('123456'),
    }).app;
  });

  afterAll(async () => {
    await disconnectTestPrisma();
  });

  beforeEach(async () => {
    await resetDatabase();
  });

  it('signs up with email OTP and assigns the default user role', async () => {
    const requested = await request(app).post('/api/v1/auth/email/request-otp').send({
      destination: 'new.officer@example.com',
      purpose: 'signup',
    });
    expect(requested.status).toBe(200);

    const verified = await request(app).post('/api/v1/auth/email/verify-otp').send({
      destination: 'new.officer@example.com',
      purpose: 'signup',
      code: '123456',
      displayName: 'New Member',
      organizationName: 'North Workspace',
    });
    expect(verified.status).toBe(200);
    expect(verified.body.data.user.role).toBe('user');
    expect(verified.body.data.user.roles).not.toContain('procurement_officer');
    expect(verified.body.data.tokens.accessToken).toBeTruthy();
    expect(JSON.stringify(verified.body)).not.toContain('123456');

    const me = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${verified.body.data.tokens.accessToken}`);
    expect(me.status).toBe(200);
    expect(me.body.data.user.organizations?.length).toBeGreaterThan(0);
  });

  it('does not issue a login session for an unregistered email after a matching OTP shape', async () => {
    const requested = await request(app).post('/api/v1/auth/email/request-otp').send({
      destination: 'missing@example.com',
      purpose: 'login',
    });
    expect(requested.status).toBe(200);

    const verified = await request(app).post('/api/v1/auth/email/verify-otp').send({
      destination: 'missing@example.com',
      purpose: 'login',
      code: '123456',
    });
    expect(verified.status).toBe(401);
  });

  describe('DEMO_PROVISION_NEW_USERS', () => {
    function provisioningApp() {
      return createApp({
        config: loadConfig({
          ...AUTH_TEST_ENV,
          DATABASE_URL: process.env.DATABASE_URL,
          DEMO_MODE: 'true',
          DEMO_PROVISION_NEW_USERS: 'true',
        }),
        logger,
        database,
      }).app;
    }

    async function register(target: ReturnType<typeof provisioningApp>, email: string) {
      return request(target)
        .post('/api/v1/auth/register')
        .send({ email, password: 'correct-horse', displayName: 'Demo Member' });
    }

    it('grants procurement_officer and attaches the seeded demo tenant', async () => {
      await seedRbacCatalog(getTestPrisma());
      await getTestPrisma().organization.create({
        data: { id: DEMO_ORGANIZATION_ID, slug: 'demo-cpcl', name: 'Demo Tenant' },
      });

      const response = await register(provisioningApp(), 'demo.member@example.com');
      expect(response.status).toBe(201);
      expect(response.body.data.user.roles).toContain('procurement_officer');
      expect(response.body.data.user.currentOrganizationId).toBe(DEMO_ORGANIZATION_ID);
    });

    it('still signs up (personal workspace only) when the demo tenant is not seeded', async () => {
      await seedRbacCatalog(getTestPrisma());

      const response = await register(provisioningApp(), 'early.member@example.com');
      expect(response.status).toBe(201);
      expect(response.body.data.user.currentOrganizationId).not.toBe(DEMO_ORGANIZATION_ID);
      expect(response.body.data.user.organizations?.length).toBe(1);
    });
  });
});
