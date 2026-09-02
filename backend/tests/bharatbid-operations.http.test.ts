import pino from 'pino';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest';

import { createApp } from '../src/app';
import { loadConfig } from '../src/config';
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

function authConfig() {
  return loadConfig({
    ...AUTH_TEST_ENV,
    DATABASE_URL: process.env.DATABASE_URL,
    AUTH_DEFAULT_ROLE: ROLES.USER,
  });
}

describeDatabase('BharatBid operations HTTP', () => {
  let database!: DatabaseClient;
  let app!: ReturnType<typeof createApp>['app'];

  beforeAll(() => {
    database = createDatabaseClient({
      url: process.env.DATABASE_URL as string,
      poolMax: 5,
      poolTimeoutSeconds: 10,
    });
    app = createApp({
      config: authConfig(),
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

  async function assignRole(userId: string, role: string) {
    const roleRecord = await getTestRepositories().roles.findByNameOrThrow(role);
    await getTestRepositories().roles.assignUser(userId, roleRecord.id);
  }

  function authHeader(token: string) {
    return { Authorization: `Bearer ${token}` };
  }

  async function officerSession() {
    const session = await register(`officer-ops-${Date.now()}@example.com`);
    await assignRole(session.user.id, ROLES.PROCUREMENT_OFFICER);
    return session;
  }

  async function reviewerSession() {
    const session = await register(`reviewer-ops-${Date.now()}@example.com`);
    await assignRole(session.user.id, ROLES.REVIEWER);
    return session;
  }

  async function createSubmittedTender(token: string) {
    const tender = await request(app).post('/api/v1/tenders').set(authHeader(token)).send({
      referenceNumber: `GEM/2026/B/OPS/${Date.now()}-${Math.floor(Math.random() * 10_000)}`,
      title: 'Operations dashboard tender',
      organizationName: 'Chennai Petroleum Corporation Limited',
      departmentName: 'Contracts and Procurement',
      category: 'Goods',
      status: 'OPEN',
      issueDate: '2026-07-01',
      closingDate: '2026-09-15',
    });
    expect(tender.status).toBe(201);
    const tenderId = tender.body.data.tender.id as string;
    const bidder = await request(app).post('/api/v1/bidders').set(authHeader(token)).send({
      legalName: `Ops Bidder ${Date.now()}`,
    });
    expect(bidder.status).toBe(201);
    const bid = await request(app)
      .post(`/api/v1/tenders/${tenderId}/bids`)
      .set(authHeader(token))
      .send({ bidderId: bidder.body.data.bidder.id });
    expect(bid.status).toBe(201);
    const submitted = await request(app).post(`/api/v1/bids/${bid.body.data.bid.id}/submit`).set(authHeader(token));
    expect(submitted.status).toBe(200);
    return { tenderId, bidId: bid.body.data.bid.id as string };
  }

  it('returns aggregated dashboard KPIs for an officer and omits sensitive identifiers', async () => {
    const session = await officerSession();
    await createSubmittedTender(session.tokens.accessToken);
    const response = await request(app).get('/api/v1/bharatbid/dashboard').set(authHeader(session.tokens.accessToken));
    expect(response.status).toBe(200);
    expect(response.body.data.kpis.activeTenders).toBeGreaterThanOrEqual(1);
    expect(response.body.data.kpis.submittedBids).toBeGreaterThanOrEqual(1);
    expect(response.body.data.demoLabel).toBe('DEMO / SYNTHETIC');
    expect(JSON.stringify(response.body.data)).not.toMatch(
      /AAAPB1234C|winner identified|best bidder|government verified/i,
    );
    expect(JSON.stringify(response.body.data)).not.toMatch(/AAAPB1234C|gstin|PAN/i);
  });

  it('lets reviewers read the dashboard but not generate reports', async () => {
    const officer = await officerSession();
    const { tenderId } = await createSubmittedTender(officer.tokens.accessToken);
    const reviewer = await reviewerSession();
    const dashboard = await request(app).get('/api/v1/bharatbid/dashboard').set(authHeader(reviewer.tokens.accessToken));
    expect(dashboard.status).toBe(200);
    const report = await request(app)
      .get(`/api/v1/tenders/${tenderId}/reports/evaluation`)
      .set(authHeader(reviewer.tokens.accessToken));
    expect(report.status).toBe(403);
  });

  it('generates a DEMO evaluation report for the officer of the requested tender', async () => {
    const session = await officerSession();
    const { tenderId } = await createSubmittedTender(session.tokens.accessToken);
    const report = await request(app)
      .get(`/api/v1/tenders/${tenderId}/reports/evaluation`)
      .set(authHeader(session.tokens.accessToken));
    expect(report.status).toBe(200);
    expect(report.headers['content-type']).toMatch(/pdf/);
    expect((report.body as Buffer).length).toBeGreaterThan(100);
  });

  it('filters activity by actor type and preserves officer vs system labels', async () => {
    const session = await officerSession();
    await createSubmittedTender(session.tokens.accessToken);
    const activity = await request(app)
      .get('/api/v1/bharatbid/activity?actor=officer')
      .set(authHeader(session.tokens.accessToken));
    expect(activity.status).toBe(200);
    expect(activity.body.data.items.length).toBeGreaterThan(0);
    expect(activity.body.data.items.every((item: { actorKind: string }) => item.actorKind === 'officer')).toBe(true);
  });

  it('searches names and references without identifier fields', async () => {
    const session = await officerSession();
    await createSubmittedTender(session.tokens.accessToken);
    const result = await request(app)
      .get('/api/v1/bharatbid/search?q=Ops')
      .set(authHeader(session.tokens.accessToken));
    expect(result.status).toBe(200);
    expect(result.body.data.items.some((item: { type: string }) => item.type === 'bidder' || item.type === 'tender')).toBe(
      true,
    );
    expect(JSON.stringify(result.body.data)).not.toMatch(/"pan"|"gstin"/i);
  });
});
