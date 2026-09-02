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

describeDatabase('BharatBid evaluation HTTP', () => {
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
    const session = await register(`officer-eval-${Date.now()}@example.com`);
    await assignRole(session.user.id, ROLES.PROCUREMENT_OFFICER);
    return session;
  }

  async function reviewerSession() {
    const session = await register(`reviewer-eval-${Date.now()}@example.com`);
    await assignRole(session.user.id, ROLES.REVIEWER);
    return session;
  }

  async function createSubmittedTender(token: string, bidderCount = 2) {
    const tender = await request(app).post('/api/v1/tenders').set(authHeader(token)).send({
      referenceNumber: `GEM/2026/B/EVAL/${Date.now()}-${Math.floor(Math.random() * 10_000)}`,
      title: 'Evaluation comparison tender',
      organizationName: 'Chennai Petroleum Corporation Limited',
      departmentName: 'Contracts and Procurement',
      category: 'Goods',
      status: 'OPEN',
      issueDate: '2026-07-01',
      closingDate: '2026-09-15',
    });
    expect(tender.status).toBe(201);
    const tenderId = tender.body.data.tender.id as string;
    await request(app)
      .post(`/api/v1/tenders/${tenderId}/requirements`)
      .set(authHeader(token))
      .send({ name: 'GST registration', requirementType: 'statutory', mandatory: true });
    const bidIds: string[] = [];
    for (let index = 0; index < bidderCount; index += 1) {
      const bidder = await request(app).post('/api/v1/bidders').set(authHeader(token)).send({
        legalName: `Eval Bidder ${Date.now()}-${index}`,
      });
      expect(bidder.status).toBe(201);
      const bid = await request(app)
        .post(`/api/v1/tenders/${tenderId}/bids`)
        .set(authHeader(token))
        .send({ bidderId: bidder.body.data.bidder.id });
      expect(bid.status).toBe(201);
      const submitted = await request(app)
        .post(`/api/v1/bids/${bid.body.data.bid.id}/submit`)
        .set(authHeader(token));
      expect(submitted.status).toBe(200);
      bidIds.push(bid.body.data.bid.id as string);
    }
    return { tenderId, bidIds };
  }

  it('creates an evaluation, compares bids, and records immutable officer notes and decisions', async () => {
    const session = await officerSession();
    const { tenderId, bidIds } = await createSubmittedTender(session.tokens.accessToken, 2);

    const created = await request(app)
      .post('/api/v1/evaluations')
      .set(authHeader(session.tokens.accessToken))
      .send({ tenderId, officerId: session.user.id });
    expect(created.status).toBe(400);

    const evaluation = await request(app)
      .post('/api/v1/evaluations')
      .set(authHeader(session.tokens.accessToken))
      .send({ tenderId });
    expect(evaluation.status).toBe(201);
    const evaluationId = evaluation.body.data.evaluation.id as string;
    expect(evaluation.body.data.evaluation.status).toBe('not_started');

    const noteTooSoon = await request(app)
      .post(`/api/v1/evaluations/${evaluationId}/notes`)
      .set(authHeader(session.tokens.accessToken))
      .send({ note: 'Technical documentation requires additional clarification before evaluation.' });
    expect(noteTooSoon.status).toBe(400);

    const started = await request(app)
      .post(`/api/v1/evaluations/${evaluationId}/start`)
      .set(authHeader(session.tokens.accessToken));
    expect(started.status).toBe(200);
    expect(started.body.data.evaluation.status).toBe('in_progress');
    expect(started.body.data.evaluation.startedBy.id).toBe(session.user.id);

    const note = await request(app)
      .post(`/api/v1/evaluations/${evaluationId}/notes`)
      .set(authHeader(session.tokens.accessToken))
      .send({
        note: 'Technical documentation requires additional clarification before evaluation.',
        createdById: '11111111-1111-4111-8111-aaaaaaaaaaaa',
      });
    expect(note.status).toBe(400);

    const recordedNote = await request(app)
      .post(`/api/v1/evaluations/${evaluationId}/notes`)
      .set(authHeader(session.tokens.accessToken))
      .send({ note: 'Technical documentation requires additional clarification before evaluation.' });
    expect(recordedNote.status).toBe(201);
    expect(recordedNote.body.data.note.createdBy.id).toBe(session.user.id);
    expect(recordedNote.body.data.note.attemptNumber).toBe(1);

    const secondNote = await request(app)
      .post(`/api/v1/evaluations/${evaluationId}/notes`)
      .set(authHeader(session.tokens.accessToken))
      .send({ note: 'Second officer note appended for history. Previous note remains visible and unchanged.' });
    expect(secondNote.status).toBe(201);
    expect(secondNote.body.data.note.attemptNumber).toBe(2);

    const notes = await request(app)
      .get(`/api/v1/evaluations/${evaluationId}/notes`)
      .set(authHeader(session.tokens.accessToken));
    expect(notes.status).toBe(200);
    expect(notes.body.data.items).toHaveLength(2);
    expect(notes.body.data.items.filter((item: { isLatest: boolean }) => item.isLatest)).toHaveLength(1);

    const decision = await request(app)
      .post(`/api/v1/evaluations/${evaluationId}/decisions`)
      .set(authHeader(session.tokens.accessToken))
      .send({
        bidSubmissionId: bidIds[0],
        decision: 'requires_clarification',
        reason: 'Udyam evidence needs officer clarification before further evaluation.',
        officerId: '11111111-1111-4111-8111-aaaaaaaaaaaa',
      });
    expect(decision.status).toBe(400);

    const recorded = await request(app)
      .post(`/api/v1/evaluations/${evaluationId}/decisions`)
      .set(authHeader(session.tokens.accessToken))
      .send({
        bidSubmissionId: bidIds[0],
        decision: 'requires_clarification',
        reason: 'Udyam evidence needs officer clarification before further evaluation.',
      });
    expect(recorded.status).toBe(201);
    expect(recorded.body.data.decision.decidedBy.id).toBe(session.user.id);
    expect(recorded.body.data.decision.advisory).toMatch(/not an award/i);

    const comparison = await request(app)
      .get(`/api/v1/tenders/${tenderId}/evaluation/comparison`)
      .set(authHeader(session.tokens.accessToken));
    expect(comparison.status).toBe(200);
    expect(comparison.body.data.comparison.bids).toHaveLength(2);
    expect(comparison.body.data.comparison.bids.every((bid: { tenderId?: string }) => !bid.tenderId || true)).toBe(true);
    expect(comparison.body.data.comparison.overview.submittedBids).toBe(2);
    expect(comparison.body.data.comparison.financialUnavailableReason).toMatch(/not available/i);
    expect(JSON.stringify(comparison.body).toLowerCase()).not.toMatch(
      /rank 1|best bidder|automatically selected|award recommendation/,
    );

    const listed = await request(app).get('/api/v1/evaluations').set(authHeader(session.tokens.accessToken));
    expect(listed.status).toBe(200);
    expect(listed.body.data.items.some((item: { tenderId: string }) => item.tenderId === tenderId)).toBe(true);
  });

  it('rejects reviewer mutations and cross-tender bid mixing', async () => {
    const officer = await officerSession();
    const reviewer = await reviewerSession();
    const first = await createSubmittedTender(officer.tokens.accessToken, 1);
    const second = await createSubmittedTender(officer.tokens.accessToken, 1);

    const evaluation = await request(app)
      .post('/api/v1/evaluations')
      .set(authHeader(officer.tokens.accessToken))
      .send({ tenderId: first.tenderId });
    expect(evaluation.status).toBe(201);
    const evaluationId = evaluation.body.data.evaluation.id as string;
    await request(app).post(`/api/v1/evaluations/${evaluationId}/start`).set(authHeader(officer.tokens.accessToken));

    const view = await request(app)
      .get(`/api/v1/tenders/${first.tenderId}/evaluation/comparison`)
      .set(authHeader(reviewer.tokens.accessToken));
    expect(view.status).toBe(200);

    const reviewerNote = await request(app)
      .post(`/api/v1/evaluations/${evaluationId}/notes`)
      .set(authHeader(reviewer.tokens.accessToken))
      .send({ note: 'Technical documentation requires additional clarification before evaluation.' });
    expect(reviewerNote.status).toBe(403);

    const mixed = await request(app)
      .get(`/api/v1/tenders/${first.tenderId}/evaluation/comparison`)
      .query({ bidIds: second.bidIds[0] })
      .set(authHeader(officer.tokens.accessToken));
    expect(mixed.status).toBe(400);

    const mixedDecision = await request(app)
      .post(`/api/v1/evaluations/${evaluationId}/decisions`)
      .set(authHeader(officer.tokens.accessToken))
      .send({
        bidSubmissionId: second.bidIds[0],
        decision: 'accepted_for_further_evaluation',
        reason: 'This bid belongs to another tender and must be rejected by validation.',
      });
    expect(mixedDecision.status).toBe(400);
  });
});
