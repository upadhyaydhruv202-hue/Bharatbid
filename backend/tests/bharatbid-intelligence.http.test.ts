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

describeDatabase('BharatBid intelligence HTTP', () => {
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
      referenceNumber: `GEM/2026/B/INT/${Date.now()}-${Math.floor(Math.random() * 10_000)}`,
      title: 'Intelligence foundation tender',
      organizationName: 'Chennai Petroleum Corporation Limited',
      departmentName: 'Contracts and Procurement',
      category: 'Goods',
      status: 'OPEN',
      issueDate: '2026-07-01',
      closingDate: '2026-09-15',
    });
    expect(tender.status).toBe(201);
    const gstReq = await request(app)
      .post(`/api/v1/tenders/${tender.body.data.tender.id}/requirements`)
      .set(authHeader(token))
      .send({
        name: 'GST registration',
        requirementType: 'statutory',
        mandatory: true,
      });
    expect(gstReq.status).toBe(201);
    const techReq = await request(app)
      .post(`/api/v1/tenders/${tender.body.data.tender.id}/requirements`)
      .set(authHeader(token))
      .send({
        name: 'Technical capability statement',
        requirementType: 'technical',
        mandatory: true,
      });
    expect(techReq.status).toBe(201);
    const createdBidder = await request(app).post('/api/v1/bidders').set(authHeader(token)).send(bidder);
    expect(createdBidder.status).toBe(201);
    const bid = await request(app)
      .post(`/api/v1/tenders/${tender.body.data.tender.id}/bids`)
      .set(authHeader(token))
      .send({ bidderId: createdBidder.body.data.bidder.id });
    expect(bid.status).toBe(201);
    return {
      bidId: bid.body.data.bid.id as string,
      otherTenderId: tender.body.data.tender.id as string,
      gstRequirementId: gstReq.body.data.requirement.id as string,
    };
  }

  async function verify(token: string, bidId: string, source: string, identifierType: string, identifier: string) {
    const response = await request(app)
      .post(`/api/v1/bids/${bidId}/verifications`)
      .set(authHeader(token))
      .send({ source, identifierType, identifier });
    expect(response.status).toBe(201);
    return response.body.data.verification as { id: string; status: string; sourceMode: string };
  }

  it('compares GST and MCA as consistent and preserves demo source basis', async () => {
    const session = await officerSession();
    const { bidId, gstRequirementId } = await createBid(session.tokens.accessToken, {
      legalName: 'Bayfront Engineering Private Limited',
      gstin: '33AAAPB1234C1Z5',
      state: 'Tamil Nadu',
    });
    await request(app)
      .post(`/api/v1/bids/${bidId}/documents`)
      .set(authHeader(session.tokens.accessToken))
      .field('documentType', 'gst_certificate')
      .field('tenderRequirementId', gstRequirementId)
      .attach('file', Buffer.from('Legal Name: Bayfront Engineering Private Limited\nGSTIN: 33AAAPB1234C1Z5\n', 'utf8'), {
        filename: 'DEMO_GST.txt',
        contentType: 'text/plain',
      });

    const gst = await verify(session.tokens.accessToken, bidId, 'gst', 'gstin', '33AAAPB1234C1Z5');
    const mca = await verify(session.tokens.accessToken, bidId, 'mca', 'cin', 'U29120TN2014PTC095001');
    expect(gst.status).toBe('matched');
    expect(mca.status).toBe('matched');

    const created = await request(app)
      .post(`/api/v1/bids/${bidId}/cross-verifications`)
      .set(authHeader(session.tokens.accessToken))
      .send({ comparisonType: 'gst_mca' });
    expect(created.status).toBe(201);
    expect(created.body.data.items).toHaveLength(1);
    expect(created.body.data.items[0].status).toBe('consistent');
    expect(created.body.data.items[0].sourceBasis).toBe('demo');
    expect(created.body.data.items[0].advisory).toMatch(/not an official government response/i);
    expect(JSON.stringify(created.body.data)).not.toMatch(/fraud|fake|officially verified/i);

    const listed = await request(app)
      .get(`/api/v1/bids/${bidId}/cross-verifications`)
      .set(authHeader(session.tokens.accessToken));
    expect(listed.status).toBe(200);
    expect(listed.body.data.items[0].comparisonLabel).toBe('GST ↔ MCA');

    const intelligence = await request(app)
      .get(`/api/v1/bids/${bidId}/requirement-intelligence`)
      .set(authHeader(session.tokens.accessToken));
    expect(intelligence.status).toBe(200);
    const gstRow = intelligence.body.data.items.find((item: { name: string }) => item.name === 'GST registration');
    expect(gstRow.evidenceStatus).toBe('evidence_available');
    expect(gstRow.evaluation).toBe('pass');
    const techRow = intelligence.body.data.items.find(
      (item: { name: string }) => item.name === 'Technical capability statement',
    );
    expect(techRow.evidenceStatus).toBe('evidence_missing');
    expect(intelligence.body.data.summary.evidenceCoveragePercent).toBeDefined();
    expect(JSON.stringify(intelligence.body.data)).not.toMatch(/compliance score|trust score|fraud/i);

    const activity = await request(app)
      .get(`/api/v1/bids/${bidId}/activity`)
      .set(authHeader(session.tokens.accessToken));
    const actions = activity.body.data.items.map((item: { action: string }) => item.action);
    expect(actions).toEqual(
      expect.arrayContaining([
        'cross_verification.requested',
        'cross_verification.completed',
        'requirement.evaluation.completed',
      ]),
    );
    expect(JSON.stringify(activity.body.data)).not.toMatch(/33AAAPB1234C1Z5|U29120TN2014PTC095001/);
  });

  it('marks GST ↔ MCA inconsistent when source legal names differ', async () => {
    const session = await officerSession();
    const { bidId } = await createBid(session.tokens.accessToken, {
      legalName: 'Delta Petrochem Traders',
      gstin: '29AACPD3456E1Z8',
      state: 'Karnataka',
    });
    await verify(session.tokens.accessToken, bidId, 'gst', 'gstin', '29AACPD3456E1Z8');
    await verify(session.tokens.accessToken, bidId, 'mca', 'cin', 'U29120TN2014PTC095001');
    const created = await request(app)
      .post(`/api/v1/bids/${bidId}/cross-verifications`)
      .set(authHeader(session.tokens.accessToken))
      .send({});
    expect(created.status).toBe(201);
    const gstMca = created.body.data.items.find((item: { comparisonType: string }) => item.comparisonType === 'gst_mca');
    expect(gstMca.status).toBe('inconsistent');
    expect(gstMca.explanation).toMatch(/officer review/i);
    expect(gstMca.explanation.toLowerCase()).not.toMatch(/fraud detected|fraudulent|is fraud\b/);
  });

  it('uses insufficient evidence when MCA is not found', async () => {
    const session = await officerSession();
    const { bidId } = await createBid(session.tokens.accessToken, {
      legalName: 'Bayfront Engineering Private Limited',
      gstin: '33AAAPB1234C1Z5',
    });
    const gst = await verify(session.tokens.accessToken, bidId, 'gst', 'gstin', '33AAAPB1234C1Z5');
    const mca = await verify(session.tokens.accessToken, bidId, 'mca', 'cin', 'U29120TN2014PTC000999');
    expect(mca.status).toBe('not_found');
    const created = await request(app)
      .post(`/api/v1/bids/${bidId}/cross-verifications`)
      .set(authHeader(session.tokens.accessToken))
      .send({ leftVerificationId: gst.id, rightVerificationId: mca.id });
    expect(created.status).toBe(201);
    expect(created.body.data.items[0].status).toBe('insufficient_evidence');
    expect(created.body.data.items[0].explanation).toMatch(/does not by itself establish bidder invalidity/i);
  });

  it('rejects cross-bid verification ids, unknown pairs, and reviewer mutation', async () => {
    const officer = await officerSession();
    const first = await createBid(officer.tokens.accessToken, {
      legalName: 'Bayfront Engineering Private Limited',
      gstin: '33AAAPB1234C1Z5',
    });
    const second = await createBid(officer.tokens.accessToken, {
      legalName: 'Frontier Labs Consumables',
      gstin: '27AAEPF5678G1Z4',
    });
    const left = await verify(officer.tokens.accessToken, first.bidId, 'gst', 'gstin', '33AAAPB1234C1Z5');
    const right = await verify(officer.tokens.accessToken, second.bidId, 'mca', 'cin', 'U29120TN2014PTC095001');

    const crossBid = await request(app)
      .post(`/api/v1/bids/${first.bidId}/cross-verifications`)
      .set(authHeader(officer.tokens.accessToken))
      .send({ leftVerificationId: left.id, rightVerificationId: right.id });
    expect(crossBid.status).toBe(400);

    const gstOnly = await verify(officer.tokens.accessToken, first.bidId, 'gst', 'gstin', '33AAAPB1234C1Z5');
    const notComparable = await request(app)
      .post(`/api/v1/bids/${first.bidId}/cross-verifications`)
      .set(authHeader(officer.tokens.accessToken))
      .send({ leftVerificationId: left.id, rightVerificationId: gstOnly.id });
    expect(notComparable.status).toBe(400);

    const reviewer = await reviewerSession();
    const forbidden = await request(app)
      .post(`/api/v1/bids/${first.bidId}/cross-verifications`)
      .set(authHeader(reviewer.tokens.accessToken))
      .send({});
    expect(forbidden.status).toBe(403);
    expect(forbidden.body.error.code).toBe(ERROR_CODES.AUTHORIZATION_ERROR);

    const readable = await request(app)
      .get(`/api/v1/bids/${first.bidId}/requirement-intelligence`)
      .set(authHeader(reviewer.tokens.accessToken));
    expect(readable.status).toBe(200);

    const patched = await request(app)
      .patch(`/api/v1/bids/${first.bidId}/cross-verifications/${left.id}`)
      .set(authHeader(officer.tokens.accessToken))
      .send({ status: 'consistent' });
    expect(patched.status).toBe(404);
  });
});
