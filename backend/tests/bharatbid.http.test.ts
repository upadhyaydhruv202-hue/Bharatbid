import pino from 'pino';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest';

import { createApp } from '../src/app';
import { loadConfig } from '../src/config';
import { ERROR_CODES } from '../src/constants';
import { createDatabaseClient, type DatabaseClient } from '../src/lib/database';
import { PERMISSIONS, ROLES } from '../src/rbac/catalog';
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

describeDatabase('BharatBid domain HTTP', () => {
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
    const me = await request(app).get('/api/v1/auth/me').set(authHeader(session.tokens.accessToken));
    expect(me.body.data.user.permissions).toEqual(expect.arrayContaining([PERMISSIONS.TENDERS_WRITE, PERMISSIONS.BIDS_WRITE]));
    return session;
  }

  async function reviewerSession() {
    const session = await register('reviewer@example.com');
    await assignRole(session.user.id, ROLES.REVIEWER);
    return session;
  }

  const openTender = {
    referenceNumber: 'GEM/2026/B/TEST/001',
    title: 'Test tender for valves',
    organizationName: 'Chennai Petroleum Corporation Limited',
    departmentName: 'Contracts and Procurement',
    category: 'Goods',
    status: 'OPEN',
    issueDate: '2026-07-01',
    closingDate: '2026-09-15',
  };

  it('rejects unauthenticated access to tenders', async () => {
    const response = await request(app).get('/api/v1/tenders');
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe(ERROR_CODES.AUTHENTICATION_ERROR);
  });

  it('forbids a standard user from reading tenders', async () => {
    const session = await register('user@example.com');
    const response = await request(app).get('/api/v1/tenders').set(authHeader(session.tokens.accessToken));
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe(ERROR_CODES.AUTHORIZATION_ERROR);
  });

  it('lets a procurement officer create, retrieve, and update a tender', async () => {
    const session = await officerSession();
    const created = await request(app).post('/api/v1/tenders').set(authHeader(session.tokens.accessToken)).send(openTender);
    expect(created.status).toBe(201);
    expect(created.body.data.tender.referenceNumber).toBe('GEM/2026/B/TEST/001');
    expect(created.body.data.tender.status).toBe('open');

    const fetched = await request(app)
      .get(`/api/v1/tenders/${created.body.data.tender.id}`)
      .set(authHeader(session.tokens.accessToken));
    expect(fetched.status).toBe(200);
    expect(fetched.body.data.tender.title).toBe(openTender.title);

    const updated = await request(app)
      .patch(`/api/v1/tenders/${created.body.data.tender.id}`)
      .set(authHeader(session.tokens.accessToken))
      .send({ title: 'Updated valve tender' });
    expect(updated.status).toBe(200);
    expect(updated.body.data.tender.title).toBe('Updated valve tender');
  });

  it('rejects invalid tender dates and duplicate reference numbers', async () => {
    const session = await officerSession();
    const invalid = await request(app).post('/api/v1/tenders').set(authHeader(session.tokens.accessToken)).send({
      ...openTender,
      issueDate: '2026-09-20',
      closingDate: '2026-09-01',
    });
    expect(invalid.status).toBe(400);
    expect(invalid.body.error.code).toBe(ERROR_CODES.VALIDATION_ERROR);

    const first = await request(app).post('/api/v1/tenders').set(authHeader(session.tokens.accessToken)).send(openTender);
    expect(first.status).toBe(201);
    const duplicate = await request(app).post('/api/v1/tenders').set(authHeader(session.tokens.accessToken)).send(openTender);
    expect(duplicate.status).toBe(409);
  });

  it('rejects invalid tender status transitions', async () => {
    const session = await officerSession();
    const created = await request(app)
      .post('/api/v1/tenders')
      .set(authHeader(session.tokens.accessToken))
      .send({ ...openTender, status: 'draft' });
    const awarded = await request(app)
      .post(`/api/v1/tenders/${created.body.data.tender.id}/status`)
      .set(authHeader(session.tokens.accessToken))
      .send({ status: 'awarded' });
    expect(awarded.status).toBe(400);
  });

  it('lets a procurement officer create a bidder and retrieve the profile', async () => {
    const session = await officerSession();
    const created = await request(app).post('/api/v1/bidders').set(authHeader(session.tokens.accessToken)).send({
      legalName: 'Demo Valve Works',
      pan: 'aaapb1234c',
      gstin: '33AAAPB1234C1Z5',
      contactEmail: 'demo.valves@example.com',
      contactPhone: '+919840019999',
      pincode: '600032',
      city: 'Chennai',
      state: 'Tamil Nadu',
    });
    expect(created.status).toBe(201);
    expect(created.body.data.bidder.pan).toBe('AAAPB1234C');

    const list = await request(app).get('/api/v1/bidders').set(authHeader(session.tokens.accessToken));
    expect(list.status).toBe(200);
    expect(list.body.data.items[0].panMasked).toBe('AAAPB****C');
    expect(list.body.data.items[0].pan).toBeUndefined();
    expect(list.body.data.items[0].gstin).toBeUndefined();
    expect(list.body.data.items[0].gstinStatus).toBe('provided');
    expect(list.body.data.items[0].panStatus).toBe('provided');

    const fetched = await request(app)
      .get(`/api/v1/bidders/${created.body.data.bidder.id}`)
      .set(authHeader(session.tokens.accessToken));
    expect(fetched.status).toBe(200);
    expect(fetched.body.data.bidder.legalName).toBe('Demo Valve Works');
  });

  it('creates and submits a bid for an open tender and blocks duplicates', async () => {
    const session = await officerSession();
    const tender = await request(app).post('/api/v1/tenders').set(authHeader(session.tokens.accessToken)).send(openTender);
    const bidder = await request(app).post('/api/v1/bidders').set(authHeader(session.tokens.accessToken)).send({
      legalName: 'Second Bidder Co',
      pan: 'AABPC2345D',
    });

    const bid = await request(app)
      .post(`/api/v1/tenders/${tender.body.data.tender.id}/bids`)
      .set(authHeader(session.tokens.accessToken))
      .send({ bidderId: bidder.body.data.bidder.id });
    expect(bid.status).toBe(201);
    expect(bid.body.data.bid.status).toBe('draft');

    const submitted = await request(app)
      .post(`/api/v1/bids/${bid.body.data.bid.id}/submit`)
      .set(authHeader(session.tokens.accessToken));
    expect(submitted.status).toBe(200);
    expect(submitted.body.data.bid.status).toBe('submitted');
    expect(submitted.body.data.bid.submittedAt).toBeTruthy();

    const duplicate = await request(app)
      .post(`/api/v1/tenders/${tender.body.data.tender.id}/bids`)
      .set(authHeader(session.tokens.accessToken))
      .send({ bidderId: bidder.body.data.bidder.id });
    expect(duplicate.status).toBe(409);
  });

  it('returns 404 for a missing tender or bidder', async () => {
    const session = await officerSession();
    const missingTender = await request(app)
      .get('/api/v1/tenders/11111111-1111-4111-8111-000000000099')
      .set(authHeader(session.tokens.accessToken));
    expect(missingTender.status).toBe(404);

    const missingBidder = await request(app)
      .get('/api/v1/bidders/11111111-1111-4111-8111-000000000098')
      .set(authHeader(session.tokens.accessToken));
    expect(missingBidder.status).toBe(404);
  });

  it('lets a reviewer read tenders but not create them', async () => {
    const officer = await officerSession();
    await request(app).post('/api/v1/tenders').set(authHeader(officer.tokens.accessToken)).send(openTender);
    const reviewer = await reviewerSession();
    const list = await request(app).get('/api/v1/tenders').set(authHeader(reviewer.tokens.accessToken));
    expect(list.status).toBe(200);
    const create = await request(app).post('/api/v1/tenders').set(authHeader(reviewer.tokens.accessToken)).send({
      ...openTender,
      referenceNumber: 'GEM/2026/B/TEST/002',
    });
    expect(create.status).toBe(403);
  });

  it('rejects bids against a non-open tender and a missing bidder', async () => {
    const session = await officerSession();
    const draft = await request(app)
      .post('/api/v1/tenders')
      .set(authHeader(session.tokens.accessToken))
      .send({ ...openTender, status: 'draft', referenceNumber: 'GEM/2026/B/TEST/003' });
    const bidder = await request(app).post('/api/v1/bidders').set(authHeader(session.tokens.accessToken)).send({
      legalName: 'Closed Bid Attempt',
    });
    const rejected = await request(app)
      .post(`/api/v1/tenders/${draft.body.data.tender.id}/bids`)
      .set(authHeader(session.tokens.accessToken))
      .send({ bidderId: bidder.body.data.bidder.id });
    expect(rejected.status).toBe(400);

    const open = await request(app)
      .post('/api/v1/tenders')
      .set(authHeader(session.tokens.accessToken))
      .send({ ...openTender, referenceNumber: 'GEM/2026/B/TEST/004' });
    const missing = await request(app)
      .post(`/api/v1/tenders/${open.body.data.tender.id}/bids`)
      .set(authHeader(session.tokens.accessToken))
      .send({ bidderId: '11111111-1111-4111-8111-000000000097' });
    expect(missing.status).toBe(404);
  });

  it('persists tender requirements and relationship counts', async () => {
    const session = await officerSession();
    const tender = await request(app).post('/api/v1/tenders').set(authHeader(session.tokens.accessToken)).send(openTender);
    const requirement = await request(app)
      .post(`/api/v1/tenders/${tender.body.data.tender.id}/requirements`)
      .set(authHeader(session.tokens.accessToken))
      .send({ name: 'Valid GST registration', requirementType: 'STATUTORY', mandatory: true });
    expect(requirement.status).toBe(201);
    expect(requirement.body.data.requirement.requirementType).toBe('statutory');

    const bidder = await request(app).post('/api/v1/bidders').set(authHeader(session.tokens.accessToken)).send({
      legalName: 'Relationship Bidder',
    });
    await request(app)
      .post(`/api/v1/tenders/${tender.body.data.tender.id}/bids`)
      .set(authHeader(session.tokens.accessToken))
      .send({ bidderId: bidder.body.data.bidder.id });

    const detail = await request(app)
      .get(`/api/v1/tenders/${tender.body.data.tender.id}`)
      .set(authHeader(session.tokens.accessToken));
    expect(detail.body.data.tender.requirements).toHaveLength(1);
    expect(detail.body.data.tender.bidCount).toBe(1);
    expect(detail.body.data.tender.requirementCounts.active).toBe(1);
    expect(detail.body.data.tender.readiness.readyToOpen).toBe(true);
  });

  it('filters, searches, and sorts tenders', async () => {
    const session = await officerSession();
    await request(app).post('/api/v1/tenders').set(authHeader(session.tokens.accessToken)).send(openTender);
    await request(app)
      .post('/api/v1/tenders')
      .set(authHeader(session.tokens.accessToken))
      .send({
        ...openTender,
        referenceNumber: 'GEM/2026/B/TEST/ZZZ',
        title: 'IT workstation refresh',
        category: 'IT',
        status: 'draft',
      });

    const search = await request(app)
      .get('/api/v1/tenders')
      .query({ search: 'workstation', sortBy: 'referenceNumber', sortOrder: 'asc' })
      .set(authHeader(session.tokens.accessToken));
    expect(search.status).toBe(200);
    expect(search.body.data.items).toHaveLength(1);
    expect(search.body.data.items[0].title).toBe('IT workstation refresh');

    const filtered = await request(app)
      .get('/api/v1/tenders')
      .query({ status: 'open', category: 'Goods' })
      .set(authHeader(session.tokens.accessToken));
    expect(filtered.body.data.items.every((item: { status: string; category: string }) => item.status === 'open' && item.category === 'Goods')).toBe(true);
  });

  it('activates, deactivates, and reorders requirements', async () => {
    const session = await officerSession();
    const tender = await request(app)
      .post('/api/v1/tenders')
      .set(authHeader(session.tokens.accessToken))
      .send({ ...openTender, status: 'draft', referenceNumber: 'GEM/2026/B/TEST/REQ' });
    const first = await request(app)
      .post(`/api/v1/tenders/${tender.body.data.tender.id}/requirements`)
      .set(authHeader(session.tokens.accessToken))
      .send({ name: 'PAN', requirementType: 'statutory', mandatory: true });
    const second = await request(app)
      .post(`/api/v1/tenders/${tender.body.data.tender.id}/requirements`)
      .set(authHeader(session.tokens.accessToken))
      .send({ name: 'GST', requirementType: 'statutory', mandatory: true });
    expect(first.status).toBe(201);
    expect(second.status).toBe(201);

    const moved = await request(app)
      .post(`/api/v1/tenders/${tender.body.data.tender.id}/requirements/${second.body.data.requirement.id}/move`)
      .set(authHeader(session.tokens.accessToken))
      .send({ direction: 'up' });
    expect(moved.status).toBe(200);
    expect(moved.body.data.items[0].name).toBe('GST');

    const deactivated = await request(app)
      .post(
        `/api/v1/tenders/${tender.body.data.tender.id}/requirements/${first.body.data.requirement.id}/deactivate`,
      )
      .set(authHeader(session.tokens.accessToken));
    expect(deactivated.status).toBe(200);
    expect(deactivated.body.data.requirement.active).toBe(false);

    const activity = await request(app)
      .get(`/api/v1/tenders/${tender.body.data.tender.id}/activity`)
      .set(authHeader(session.tokens.accessToken));
    expect(activity.status).toBe(200);
    expect(activity.body.data.items.some((item: { action: string }) => item.action === 'tender.requirement.reordered')).toBe(true);
    expect(activity.body.data.items.some((item: { action: string }) => item.action === 'tender.requirement.deactivated')).toBe(true);
  });

  it('forbids reviewers from mutating tenders or requirements', async () => {
    const officer = await officerSession();
    const created = await request(app).post('/api/v1/tenders').set(authHeader(officer.tokens.accessToken)).send(openTender);
    const reviewer = await reviewerSession();
    const patch = await request(app)
      .patch(`/api/v1/tenders/${created.body.data.tender.id}`)
      .set(authHeader(reviewer.tokens.accessToken))
      .send({ title: 'Should not work' });
    expect(patch.status).toBe(403);
    const requirement = await request(app)
      .post(`/api/v1/tenders/${created.body.data.tender.id}/requirements`)
      .set(authHeader(reviewer.tokens.accessToken))
      .send({ name: 'PAN', requirementType: 'statutory' });
    expect(requirement.status).toBe(403);
  });

  it('searches and filters bidders without exposing list GSTIN values', async () => {
    const session = await officerSession();
    await request(app).post('/api/v1/bidders').set(authHeader(session.tokens.accessToken)).send({
      legalName: 'Bayfront Search Target',
      pan: 'AAAPB1234C',
      gstin: '33AAAPB1234C1Z5',
      city: 'Chennai',
      state: 'Tamil Nadu',
      contactEmail: 'bayfront.search@example.com',
    });
    await request(app).post('/api/v1/bidders').set(authHeader(session.tokens.accessToken)).send({
      legalName: 'Mumbai Incomplete Trader',
      city: 'Mumbai',
      state: 'Maharashtra',
    });

    const search = await request(app)
      .get('/api/v1/bidders')
      .query({ q: 'Bayfront' })
      .set(authHeader(session.tokens.accessToken));
    expect(search.status).toBe(200);
    expect(search.body.data.items).toHaveLength(1);
    expect(search.body.data.items[0].legalName).toBe('Bayfront Search Target');

    const panSearch = await request(app)
      .get('/api/v1/bidders')
      .query({ search: 'AAAPB1234C' })
      .set(authHeader(session.tokens.accessToken));
    expect(panSearch.body.data.items).toHaveLength(1);

    const filtered = await request(app)
      .get('/api/v1/bidders')
      .query({ state: 'Tamil Nadu', completeness: 'complete', hasUdyam: 'false' })
      .set(authHeader(session.tokens.accessToken));
    expect(filtered.status).toBe(200);
    expect(filtered.body.data.items.every((item: { state: string }) => item.state === 'Tamil Nadu')).toBe(true);
  });

  it('rejects duplicate bidder identifiers with a professional conflict message', async () => {
    const session = await officerSession();
    const first = await request(app).post('/api/v1/bidders').set(authHeader(session.tokens.accessToken)).send({
      legalName: 'First Profile',
      pan: 'AAAPB1234C',
    });
    expect(first.status).toBe(201);
    const duplicate = await request(app).post('/api/v1/bidders').set(authHeader(session.tokens.accessToken)).send({
      legalName: 'Second Profile',
      pan: 'AAAPB1234C',
    });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error.message).toBe('An existing bidder profile appears to use this identifier.');
  });

  it('lets officers update bidders and records bidder activity', async () => {
    const session = await officerSession();
    const created = await request(app).post('/api/v1/bidders').set(authHeader(session.tokens.accessToken)).send({
      legalName: 'Updatable Bidder',
      city: 'Chennai',
    });
    const updated = await request(app)
      .patch(`/api/v1/bidders/${created.body.data.bidder.id}`)
      .set(authHeader(session.tokens.accessToken))
      .send({ city: 'Coimbatore' });
    expect(updated.status).toBe(200);
    expect(updated.body.data.bidder.city).toBe('Coimbatore');

    const activity = await request(app)
      .get(`/api/v1/bidders/${created.body.data.bidder.id}/activity`)
      .set(authHeader(session.tokens.accessToken));
    expect(activity.status).toBe(200);
    expect(activity.body.data.items.some((item: { action: string }) => item.action === 'bidder.created')).toBe(true);
    expect(activity.body.data.items.some((item: { action: string }) => item.action === 'bidder.updated')).toBe(true);
  });

  it('locks submitted bids, searches submissions, and records bid activity', async () => {
    const session = await officerSession();
    const tender = await request(app).post('/api/v1/tenders').set(authHeader(session.tokens.accessToken)).send(openTender);
    const bidder = await request(app).post('/api/v1/bidders').set(authHeader(session.tokens.accessToken)).send({
      legalName: 'Lock Check Bidder',
    });
    const bid = await request(app)
      .post(`/api/v1/tenders/${tender.body.data.tender.id}/bids`)
      .set(authHeader(session.tokens.accessToken))
      .send({ bidderId: bidder.body.data.bidder.id });
    expect(bid.body.data.bid.fieldLocks.all).toBe(false);

    const submitted = await request(app)
      .post(`/api/v1/bids/${bid.body.data.bid.id}/submit`)
      .set(authHeader(session.tokens.accessToken));
    expect(submitted.status).toBe(200);
    expect(submitted.body.data.bid.fieldLocks.all).toBe(true);

    const locked = await request(app)
      .patch(`/api/v1/bids/${bid.body.data.bid.id}`)
      .set(authHeader(session.tokens.accessToken))
      .send({ status: 'under_review' });
    expect(locked.status).toBe(400);

    const search = await request(app)
      .get('/api/v1/bids')
      .query({ search: submitted.body.data.bid.submissionReference, tenderId: tender.body.data.tender.id })
      .set(authHeader(session.tokens.accessToken));
    expect(search.status).toBe(200);
    expect(search.body.data.items).toHaveLength(1);

    const activity = await request(app)
      .get(`/api/v1/bids/${bid.body.data.bid.id}/activity`)
      .set(authHeader(session.tokens.accessToken));
    expect(activity.body.data.items.some((item: { action: string }) => item.action === 'bid.created')).toBe(true);
    expect(activity.body.data.items.some((item: { action: string }) => item.action === 'bid.submitted')).toBe(true);
  });

  it('forbids reviewers from mutating bidders and bids', async () => {
    const officer = await officerSession();
    const tender = await request(app).post('/api/v1/tenders').set(authHeader(officer.tokens.accessToken)).send(openTender);
    const bidder = await request(app).post('/api/v1/bidders').set(authHeader(officer.tokens.accessToken)).send({
      legalName: 'Reviewer Visible Bidder',
    });
    const reviewer = await reviewerSession();
    const list = await request(app).get('/api/v1/bidders').set(authHeader(reviewer.tokens.accessToken));
    expect(list.status).toBe(200);

    const createBidder = await request(app).post('/api/v1/bidders').set(authHeader(reviewer.tokens.accessToken)).send({
      legalName: 'Should Not Create',
    });
    expect(createBidder.status).toBe(403);

    const patchBidder = await request(app)
      .patch(`/api/v1/bidders/${bidder.body.data.bidder.id}`)
      .set(authHeader(reviewer.tokens.accessToken))
      .send({ city: 'Chennai' });
    expect(patchBidder.status).toBe(403);

    const createBid = await request(app)
      .post(`/api/v1/tenders/${tender.body.data.tender.id}/bids`)
      .set(authHeader(reviewer.tokens.accessToken))
      .send({ bidderId: bidder.body.data.bidder.id });
    expect(createBid.status).toBe(403);

    const bids = await request(app).get('/api/v1/bids').set(authHeader(reviewer.tokens.accessToken));
    expect(bids.status).toBe(200);
  });

  it('rejects bids against cancelled tenders', async () => {
    const session = await officerSession();
    const draft = await request(app)
      .post('/api/v1/tenders')
      .set(authHeader(session.tokens.accessToken))
      .send({ ...openTender, status: 'draft', referenceNumber: 'GEM/2026/B/TEST/CANCEL' });
    await request(app)
      .post(`/api/v1/tenders/${draft.body.data.tender.id}/status`)
      .set(authHeader(session.tokens.accessToken))
      .send({ status: 'cancelled' });
    const bidder = await request(app).post('/api/v1/bidders').set(authHeader(session.tokens.accessToken)).send({
      legalName: 'Cancelled Tender Bidder',
    });
    const rejected = await request(app)
      .post(`/api/v1/tenders/${draft.body.data.tender.id}/bids`)
      .set(authHeader(session.tokens.accessToken))
      .send({ bidderId: bidder.body.data.bidder.id });
    expect(rejected.status).toBe(400);
  });
});
