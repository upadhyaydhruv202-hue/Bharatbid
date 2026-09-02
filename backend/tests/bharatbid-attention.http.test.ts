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

describeDatabase('BharatBid attention intelligence HTTP', () => {
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
    const session = await register('officer-attention@example.com');
    await assignRole(session.user.id, ROLES.PROCUREMENT_OFFICER);
    return session;
  }

  async function reviewerSession() {
    const session = await register('reviewer-attention@example.com');
    await assignRole(session.user.id, ROLES.REVIEWER);
    return session;
  }

  async function createBid(token: string) {
    const tender = await request(app).post('/api/v1/tenders').set(authHeader(token)).send({
      referenceNumber: `GEM/2026/B/ATT/${Date.now()}-${Math.floor(Math.random() * 10_000)}`,
      title: 'Attention intelligence tender',
      organizationName: 'Chennai Petroleum Corporation Limited',
      departmentName: 'Contracts and Procurement',
      category: 'Goods',
      status: 'OPEN',
      issueDate: '2026-07-01',
      closingDate: '2026-09-15',
    });
    expect(tender.status).toBe(201);
    await request(app)
      .post(`/api/v1/tenders/${tender.body.data.tender.id}/requirements`)
      .set(authHeader(token))
      .send({ name: 'GST registration', requirementType: 'statutory', mandatory: true });
    const bidder = await request(app).post('/api/v1/bidders').set(authHeader(token)).send({
      legalName: 'Harbour Crane Spares',
    });
    expect(bidder.status).toBe(201);
    const bid = await request(app)
      .post(`/api/v1/tenders/${tender.body.data.tender.id}/bids`)
      .set(authHeader(token))
      .send({ bidderId: bidder.body.data.bidder.id });
    expect(bid.status).toBe(201);
    return { bidId: bid.body.data.bid.id as string, otherBidderToken: token };
  }

  it('returns a backend-calculated score that ignores frontend-supplied score fields', async () => {
    const session = await officerSession();
    const { bidId } = await createBid(session.tokens.accessToken);
    const listed = await request(app)
      .get('/api/v1/intelligence/bids')
      .query({ score: 3, factorPoints: 99, band: 'low_attention' })
      .set(authHeader(session.tokens.accessToken));
    expect(listed.status).toBe(200);

    const detail = await request(app)
      .get(`/api/v1/bids/${bidId}/intelligence`)
      .query({ score: 1 })
      .set(authHeader(session.tokens.accessToken));
    expect(detail.status).toBe(200);
    expect(detail.body.data.intelligence.score).toBeGreaterThanOrEqual(0);
    expect(detail.body.data.intelligence.score).toBeLessThanOrEqual(100);
    expect(detail.body.data.intelligence.modelVersion).toBe('attention-v1');
    expect(detail.body.data.intelligence.factors).toEqual(expect.any(Array));
    expect(JSON.stringify(detail.body).toLowerCase()).not.toMatch(/award probability|recommended bidder|fraud probability/);

    const forged = await request(app)
      .post(`/api/v1/bids/${bidId}/intelligence`)
      .set(authHeader(session.tokens.accessToken))
      .send({ score: 0, band: 'low_attention' });
    expect(forged.status).toBe(404);
  });

  it('allows reviewer read access and rejects cross-bid intelligence', async () => {
    const officer = await officerSession();
    const reviewer = await reviewerSession();
    const first = await createBid(officer.tokens.accessToken);
    const second = await createBid(officer.tokens.accessToken);

    const view = await request(app)
      .get(`/api/v1/bids/${first.bidId}/intelligence`)
      .set(authHeader(reviewer.tokens.accessToken));
    expect(view.status).toBe(200);

    const summary = await request(app)
      .get('/api/v1/intelligence/summary')
      .set(authHeader(reviewer.tokens.accessToken));
    expect(summary.status).toBe(200);
    expect(summary.body.data.summary.totalBids).toBeGreaterThan(0);

    const unauthenticated = await request(app).get(`/api/v1/bids/${first.bidId}/intelligence`);
    expect(unauthenticated.status).toBe(401);

    const cross = await request(app)
      .get(`/api/v1/bids/${second.bidId}/intelligence`)
      .set(authHeader(officer.tokens.accessToken));
    expect(cross.status).toBe(200);
    expect(cross.body.data.intelligence.id).toBe(second.bidId);
    expect(cross.body.data.intelligence.id).not.toBe(first.bidId);
  });
});
