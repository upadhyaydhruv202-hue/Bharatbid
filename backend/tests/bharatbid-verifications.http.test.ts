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

function authConfig() {
  return loadConfig({
    ...AUTH_TEST_ENV,
    DATABASE_URL: process.env.DATABASE_URL,
    AUTH_DEFAULT_ROLE: ROLES.USER,
  });
}

describeDatabase('BharatBid verification HTTP', () => {
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
      user: { id: string; roles: string[]; permissions: string[] };
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
    const session = await register('officer@example.com');
    await assignRole(session.user.id, ROLES.PROCUREMENT_OFFICER);
    return session;
  }

  async function reviewerSession() {
    const session = await register('reviewer@example.com');
    await assignRole(session.user.id, ROLES.REVIEWER);
    return session;
  }

  async function createBid(token: string, bidder: Record<string, string>) {
    const tender = await request(app).post('/api/v1/tenders').set(authHeader(token)).send({
      referenceNumber: 'GEM/2026/B/VER/001',
      title: 'Verification foundation tender',
      organizationName: 'Chennai Petroleum Corporation Limited',
      departmentName: 'Contracts and Procurement',
      category: 'Goods',
      status: 'OPEN',
      issueDate: '2026-07-01',
      closingDate: '2026-09-15',
    });
    expect(tender.status).toBe(201);
    const createdBidder = await request(app).post('/api/v1/bidders').set(authHeader(token)).send(bidder);
    expect(createdBidder.status).toBe(201);
    const bid = await request(app)
      .post(`/api/v1/tenders/${tender.body.data.tender.id}/bids`)
      .set(authHeader(token))
      .send({ bidderId: createdBidder.body.data.bidder.id });
    expect(bid.status).toBe(201);
    return {
      bidId: bid.body.data.bid.id as string,
      bidderId: createdBidder.body.data.bidder.id as string,
    };
  }

  it('matches a demo GST record and preserves source mode and snapshot', async () => {
    const session = await officerSession();
    const { bidId } = await createBid(session.tokens.accessToken, {
      legalName: 'Bayfront Engineering Private Limited',
      gstin: '33AAAPB1234C1Z5',
      state: 'Tamil Nadu',
    });

    const created = await request(app)
      .post(`/api/v1/bids/${bidId}/verifications`)
      .set(authHeader(session.tokens.accessToken))
      .send({ source: 'gst', identifierType: 'gstin', identifier: '33AAAPB1234C1Z5' });
    expect(created.status).toBe(201);
    expect(created.body.data.verification.status).toBe('matched');
    expect(created.body.data.verification.sourceMode).toBe('demo');
    expect(created.body.data.verification.sourceDisplayName).toBe('DEMO GST Registry');
    expect(created.body.data.verification.advisory).toMatch(/not an official government response/i);
    expect(created.body.data.verification.sourceSnapshot.legalName).toBe('Bayfront Engineering Private Limited');
    expect(JSON.stringify(created.body.data)).not.toMatch(/government api|officially verified|fraud/i);

    const listed = await request(app)
      .get(`/api/v1/bids/${bidId}/verifications`)
      .set(authHeader(session.tokens.accessToken));
    expect(listed.status).toBe(200);
    expect(listed.body.data.summary.matched).toBe(1);
    expect(listed.body.data.sources.some((item: { source: string }) => item.source === 'gst')).toBe(true);

    const detail = await request(app).get(`/api/v1/bids/${bidId}`).set(authHeader(session.tokens.accessToken));
    expect(detail.body.data.bid.verificationSummary.matched).toBe(1);

    const activity = await request(app)
      .get(`/api/v1/bids/${bidId}/activity`)
      .set(authHeader(session.tokens.accessToken));
    const actions = activity.body.data.items.map((item: { action: string }) => item.action);
    expect(actions).toEqual(expect.arrayContaining(['verification.requested', 'verification.completed']));
  });

  it('records a mismatch, not-found, and adapter error as distinct statuses', async () => {
    const session = await officerSession();
    const { bidId } = await createBid(session.tokens.accessToken, {
      legalName: 'Delta Petrochem Traders',
      gstin: '29AACPD3456E1Z8',
      state: 'Karnataka',
    });

    const mismatched = await request(app)
      .post(`/api/v1/bids/${bidId}/verifications`)
      .set(authHeader(session.tokens.accessToken))
      .send({ source: 'gst', identifierType: 'gstin', identifier: '29AACPD3456E1Z8' });
    expect(mismatched.status).toBe(201);
    expect(mismatched.body.data.verification.status).toBe('mismatched');
    expect(mismatched.body.data.verification.explanation).toMatch(/officer review/i);

    const missing = await request(app)
      .post(`/api/v1/bids/${bidId}/verifications`)
      .set(authHeader(session.tokens.accessToken))
      .send({ source: 'gst', identifierType: 'gstin', identifier: '07AAAAA0000A1Z5' });
    expect(missing.status).toBe(201);
    expect(missing.body.data.verification.status).toBe('not_found');
    expect(missing.body.data.verification.explanation).toMatch(/does not by itself prove/i);

    const failed = await request(app)
      .post(`/api/v1/bids/${bidId}/verifications`)
      .set(authHeader(session.tokens.accessToken))
      .send({ source: 'gst', identifierType: 'gstin', identifier: '00ERROR1234E1Z5' });
    expect(failed.status).toBe(201);
    expect(failed.body.data.verification.status).toBe('error');
    expect(failed.body.data.verification.errorCode).toBe('SOURCE_UNAVAILABLE');

    const retried = await request(app)
      .post(`/api/v1/bids/${bidId}/verifications/${failed.body.data.verification.id}/retry`)
      .set(authHeader(session.tokens.accessToken));
    expect(retried.status).toBe(201);
    expect(retried.body.data.verification.attemptNumber).toBe(2);
    expect(retried.body.data.verification.history.length).toBeGreaterThan(1);

    const refuseRetry = await request(app)
      .post(`/api/v1/bids/${bidId}/verifications/${mismatched.body.data.verification.id}/retry`)
      .set(authHeader(session.tokens.accessToken));
    expect(refuseRetry.status).toBe(400);
  });

  it('forbids reviewers from initiating verification and rejects SSRF-style payloads', async () => {
    const officer = await officerSession();
    const { bidId } = await createBid(officer.tokens.accessToken, {
      legalName: 'Bayfront Engineering Private Limited',
      gstin: '33AAAPB1234C1Z5',
    });
    const reviewer = await reviewerSession();
    const forbidden = await request(app)
      .post(`/api/v1/bids/${bidId}/verifications`)
      .set(authHeader(reviewer.tokens.accessToken))
      .send({ source: 'gst', identifierType: 'gstin', identifier: '33AAAPB1234C1Z5' });
    expect(forbidden.status).toBe(403);
    expect(forbidden.body.error.code).toBe(ERROR_CODES.AUTHORIZATION_ERROR);

    const readable = await request(app)
      .get(`/api/v1/bids/${bidId}/verifications`)
      .set(authHeader(reviewer.tokens.accessToken));
    expect(readable.status).toBe(200);

    const ssrf = await request(app)
      .post(`/api/v1/bids/${bidId}/verifications`)
      .set(authHeader(officer.tokens.accessToken))
      .send({
        source: 'gst',
        identifierType: 'gstin',
        identifier: '33AAAPB1234C1Z5',
        url: 'http://127.0.0.1/secret',
      });
    expect(ssrf.status).toBe(400);
    expect(ssrf.body.error.code).toBe(ERROR_CODES.VALIDATION_ERROR);

    const pan = await request(app)
      .post(`/api/v1/bids/${bidId}/verifications`)
      .set(authHeader(officer.tokens.accessToken))
      .send({ source: 'gst', identifierType: 'pan', identifier: 'AAAPB1234C' });
    expect(pan.status).toBe(400);

    const gem = await request(app)
      .post(`/api/v1/bids/${bidId}/verifications`)
      .set(authHeader(officer.tokens.accessToken))
      .send({ source: 'gem', identifierType: 'gstin', identifier: '33AAAPB1234C1Z5' });
    expect(gem.status).toBe(400);
  });

  it('links a document when verification is initiated from extracted evidence', async () => {
    const session = await officerSession();
    const { bidId } = await createBid(session.tokens.accessToken, {
      legalName: 'Bayfront Engineering Private Limited',
      gstin: '33AAAPB1234C1Z5',
      state: 'Tamil Nadu',
    });
    const uploaded = await request(app)
      .post(`/api/v1/bids/${bidId}/documents`)
      .set(authHeader(session.tokens.accessToken))
      .field('documentType', 'gst_certificate')
      .attach('file', Buffer.from('Legal Name: Bayfront Engineering Private Limited\nGSTIN: 33AAAPB1234C1Z5\n', 'utf8'), {
        filename: 'gst.txt',
        contentType: 'text/plain',
      });
    expect(uploaded.status).toBe(201);

    const created = await request(app)
      .post(`/api/v1/bids/${bidId}/verifications`)
      .set(authHeader(session.tokens.accessToken))
      .send({
        source: 'gst',
        identifierType: 'gstin',
        documentId: uploaded.body.data.document.id,
      });
    expect(created.status).toBe(201);
    expect(created.body.data.verification.documentId).toBe(uploaded.body.data.document.id);
    expect(created.body.data.verification.identifierOrigin).toBe('extracted');
    expect(created.body.data.verification.identifierValue).toBe('33AAAPB1234C1Z5');
  });
});
