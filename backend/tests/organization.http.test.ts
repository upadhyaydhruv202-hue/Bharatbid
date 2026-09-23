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
import { openTenderSchedule } from './helpers/tender-window';

const logger = pino({ level: 'silent' });
const VALID_PASSWORD = 'correct-horse';

function authConfig() {
  return loadConfig({
    ...AUTH_TEST_ENV,
    DATABASE_URL: process.env.DATABASE_URL,
    AUTH_DEFAULT_ROLE: ROLES.USER,
  });
}

describeDatabase('Organization tenancy HTTP', () => {
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

  async function officer(email: string) {
    const response = await request(app).post('/api/v1/auth/register').send({
      email,
      password: VALID_PASSWORD,
      displayName: email.split('@')[0],
    });
    expect(response.status).toBe(201);
    const userId = response.body.data.user.id as string;
    const role = await getTestRepositories().roles.findByNameOrThrow(ROLES.PROCUREMENT_OFFICER);
    await getTestRepositories().roles.assignUser(userId, role.id);
    return {
      userId,
      token: response.body.data.tokens.accessToken as string,
    };
  }

  it('isolates tenders, bidders, bids, and reports across organizations', async () => {
    const alpha = await officer('alpha-officer@example.com');
    const beta = await officer('beta-officer@example.com');

    const tender = await request(app)
      .post('/api/v1/tenders')
      .set({ Authorization: `Bearer ${alpha.token}` })
      .send({
        referenceNumber: 'GEM/2026/B/ORG/A',
        title: 'Org A valves',
        organizationName: 'Org A',
        departmentName: 'Contracts',
        category: 'Goods',
        status: 'OPEN',
        ...openTenderSchedule(),
      });
    expect(tender.status).toBe(201);
    const tenderId = tender.body.data.tender.id as string;

    const bidder = await request(app)
      .post('/api/v1/bidders')
      .set({ Authorization: `Bearer ${alpha.token}` })
      .send({ legalName: 'Org A Bidder' });
    expect(bidder.status).toBe(201);
    const bidderId = bidder.body.data.bidder.id as string;

    const bid = await request(app)
      .post(`/api/v1/tenders/${tenderId}/bids`)
      .set({ Authorization: `Bearer ${alpha.token}` })
      .send({ bidderId });
    expect(bid.status).toBe(201);
    const bidId = bid.body.data.bid.id as string;

    const betaList = await request(app).get('/api/v1/tenders').set({ Authorization: `Bearer ${beta.token}` });
    expect(betaList.status).toBe(200);
    expect(betaList.body.data.items).toHaveLength(0);

    const betaTender = await request(app).get(`/api/v1/tenders/${tenderId}`).set({ Authorization: `Bearer ${beta.token}` });
    expect(betaTender.status).toBe(404);

    const betaBidder = await request(app).get(`/api/v1/bidders/${bidderId}`).set({ Authorization: `Bearer ${beta.token}` });
    expect(betaBidder.status).toBe(404);

    const betaBid = await request(app).get(`/api/v1/bids/${bidId}`).set({ Authorization: `Bearer ${beta.token}` });
    expect(betaBid.status).toBe(404);

    const betaReport = await request(app)
      .get(`/api/v1/tenders/${tenderId}/reports/evaluation`)
      .set({ Authorization: `Bearer ${beta.token}` });
    expect([403, 404]).toContain(betaReport.status);

    const alphaList = await request(app).get('/api/v1/tenders').set({ Authorization: `Bearer ${alpha.token}` });
    expect(alphaList.body.data.items).toHaveLength(1);

    const uploaded = await request(app)
      .post(`/api/v1/bids/${bidId}/documents`)
      .set({ Authorization: `Bearer ${alpha.token}` })
      .field('documentType', 'gst_certificate')
      .field('tenderRequirementId', 'unmapped')
      .attach('file', Buffer.from('DEMO GST', 'utf8'), { filename: 'gst.txt', contentType: 'text/plain' });
    expect(uploaded.status).toBe(201);
    const documentId = uploaded.body.data.document.id as string;

    const verification = await request(app)
      .post(`/api/v1/bids/${bidId}/verifications`)
      .set({ Authorization: `Bearer ${alpha.token}` })
      .send({ source: 'gst', identifierType: 'gstin', identifier: '33AAAPB1234C1Z5' });
    expect(verification.status).toBe(201);
    const verificationId = verification.body.data.verification.id as string;

    expect(
      (
        await request(app)
          .get(`/api/v1/bids/${bidId}/documents/${documentId}`)
          .set({ Authorization: `Bearer ${beta.token}` })
      ).status,
    ).toBe(404);
    expect(
      (
        await request(app)
          .get(`/api/v1/bids/${bidId}/verifications/${verificationId}`)
          .set({ Authorization: `Bearer ${beta.token}` })
      ).status,
    ).toBe(404);

    expect(
      (await request(app).get(`/api/v1/bids/${bidId}/reviews`).set({ Authorization: `Bearer ${beta.token}` })).status,
    ).toBe(404);
    const betaEvaluations = await request(app)
      .get('/api/v1/evaluations')
      .query({ tenderId })
      .set({ Authorization: `Bearer ${beta.token}` });
    expect(betaEvaluations.status).toBe(200);
    expect(betaEvaluations.body.data.items ?? []).toHaveLength(0);
  });
});
