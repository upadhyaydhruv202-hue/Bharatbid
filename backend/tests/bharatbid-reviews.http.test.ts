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
const NOTE =
  'GST legal name uses an abbreviated company suffix while MCA contains the expanded legal name. Identity is consistent based on supporting evidence.';

function authConfig() {
  return loadConfig({
    ...AUTH_TEST_ENV,
    DATABASE_URL: process.env.DATABASE_URL,
    AUTH_DEFAULT_ROLE: ROLES.USER,
  });
}

describeDatabase('BharatBid officer review HTTP', () => {
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
    const session = await register('officer-review@example.com');
    await assignRole(session.user.id, ROLES.PROCUREMENT_OFFICER);
    return session;
  }

  async function reviewerSession() {
    const session = await register('reviewer-review@example.com');
    await assignRole(session.user.id, ROLES.REVIEWER);
    return session;
  }

  async function createBid(token: string) {
    const tender = await request(app).post('/api/v1/tenders').set(authHeader(token)).send({
      referenceNumber: `GEM/2026/B/REV/${Date.now()}-${Math.floor(Math.random() * 10_000)}`,
      title: 'Officer review tender',
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
    await request(app)
      .post(`/api/v1/tenders/${tender.body.data.tender.id}/requirements`)
      .set(authHeader(token))
      .send({ name: 'Technical capability statement', requirementType: 'technical', mandatory: true });
    const bidder = await request(app).post('/api/v1/bidders').set(authHeader(token)).send({
      legalName: 'Harbour Crane Spares',
    });
    expect(bidder.status).toBe(201);
    const bid = await request(app)
      .post(`/api/v1/tenders/${tender.body.data.tender.id}/bids`)
      .set(authHeader(token))
      .send({ bidderId: bidder.body.data.bidder.id });
    expect(bid.status).toBe(201);
    return { bidId: bid.body.data.bid.id as string };
  }

  it('lists, filters, assesses without mutating the machine finding, and preserves assessment history', async () => {
    const session = await officerSession();
    const { bidId } = await createBid(session.tokens.accessToken);
    const synced = await request(app)
      .get(`/api/v1/bids/${bidId}/reviews`)
      .set(authHeader(session.tokens.accessToken));
    expect(synced.status).toBe(200);
    expect(synced.body.data.items.length).toBeGreaterThan(0);

    const listed = await request(app)
      .get('/api/v1/reviews')
      .query({ bidId, issueType: 'evidence_missing' })
      .set(authHeader(session.tokens.accessToken));
    expect(listed.status).toBe(200);
    const item = listed.body.data.items[0] as { id: string; machineFinding: string; status: string };
    expect(item.status).toBe('open');

    const started = await request(app)
      .post(`/api/v1/reviews/${item.id}/start`)
      .set(authHeader(session.tokens.accessToken));
    expect(started.status).toBe(200);
    expect(started.body.data.review.status).toBe('in_review');

    const trivial = await request(app)
      .post(`/api/v1/reviews/${item.id}/assessments`)
      .set(authHeader(session.tokens.accessToken))
      .send({ assessment: 'explanation_accepted', note: 'ok' });
    expect(trivial.status).toBe(400);

    const forged = await request(app)
      .post(`/api/v1/reviews/${item.id}/assessments`)
      .set(authHeader(session.tokens.accessToken))
      .send({ assessment: 'explanation_accepted', note: NOTE, officerId: session.user.id });
    expect(forged.status).toBe(400);

    const assessed = await request(app)
      .post(`/api/v1/reviews/${item.id}/assessments`)
      .set(authHeader(session.tokens.accessToken))
      .send({ assessment: 'explanation_accepted', note: NOTE });
    expect(assessed.status).toBe(201);
    expect(assessed.body.data.review.status).toBe('assessed');
    expect(assessed.body.data.review.machineFinding).toBe(item.machineFinding);
    expect(assessed.body.data.review.latestAssessment.officerName).toBeTruthy();

    const amended = await request(app)
      .post(`/api/v1/reviews/${item.id}/assessments`)
      .set(authHeader(session.tokens.accessToken))
      .send({
        assessment: 'evidence_sufficient',
        note: 'The missing GST certificate is not required for this DEMO inspection note and remains a machine finding.',
      });
    expect(amended.status).toBe(201);
    expect(amended.body.data.review.assessments).toHaveLength(2);
    expect(amended.body.data.review.machineFinding).toBe(item.machineFinding);

    const closed = await request(app)
      .post(`/api/v1/reviews/${item.id}/close`)
      .set(authHeader(session.tokens.accessToken));
    expect(closed.status).toBe(200);
    expect(closed.body.data.review.status).toBe('closed');

    const reopen = await request(app)
      .post(`/api/v1/reviews/${item.id}/assessments`)
      .set(authHeader(session.tokens.accessToken))
      .send({ assessment: 'confirmed', note: NOTE });
    expect(reopen.status).toBe(400);
  });

  it('rejects reviewer mutation and cross-bid review access', async () => {
    const officer = await officerSession();
    const reviewer = await reviewerSession();
    const first = await createBid(officer.tokens.accessToken);
    const second = await createBid(officer.tokens.accessToken);
    const reviews = await request(app)
      .get(`/api/v1/bids/${first.bidId}/reviews`)
      .set(authHeader(officer.tokens.accessToken));
    const reviewId = reviews.body.data.items[0].id as string;

    const view = await request(app).get(`/api/v1/reviews/${reviewId}`).set(authHeader(reviewer.tokens.accessToken));
    expect(view.status).toBe(200);

    const mutate = await request(app)
      .post(`/api/v1/reviews/${reviewId}/start`)
      .set(authHeader(reviewer.tokens.accessToken));
    expect(mutate.status).toBe(403);
    expect(mutate.body.error.code).toBe(ERROR_CODES.AUTHORIZATION_ERROR);

    const cross = await request(app)
      .get(`/api/v1/bids/${second.bidId}/reviews/${reviewId}`)
      .set(authHeader(officer.tokens.accessToken));
    expect(cross.status).toBe(404);
  });

  it('stores in-app clarification and writes safe audit events', async () => {
    const session = await officerSession();
    const { bidId } = await createBid(session.tokens.accessToken);
    const synced = await request(app)
      .get(`/api/v1/bids/${bidId}/reviews`)
      .set(authHeader(session.tokens.accessToken));
    const item = (synced.body.data.items.find((row: { issueType: string }) => row.issueType === 'evidence_missing') ??
      synced.body.data.items[0]) as { id: string } | undefined;
    expect(item?.id).toBeTruthy();
    const created = await request(app)
      .post(`/api/v1/reviews/${item!.id}/clarifications`)
      .set(authHeader(session.tokens.accessToken))
      .send({ message: 'Please provide supporting project completion evidence for the listed assignments.' });
    expect(created.status).toBe(201);
    expect(created.body.data.review.status).toBe('clarification_requested');
    expect(created.body.data.review.clarifications[0].synthetic).toBe(true);

    const events = await getTestPrisma().auditEvent.findMany({
      where: { resourceId: bidId },
    });
    expect(events.some((event) => event.action === 'clarification.requested')).toBe(true);
    expect(JSON.stringify(events)).not.toMatch(/33AAAPB1234C1Z5|AAAPB1234C|password|extractedText/i);
  });
});
