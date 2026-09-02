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
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

function authConfig() {
  return loadConfig({
    ...AUTH_TEST_ENV,
    DATABASE_URL: process.env.DATABASE_URL,
    AUTH_DEFAULT_ROLE: ROLES.USER,
    DOCUMENT_MAX_BYTES: '2048',
  });
}

describeDatabase('BharatBid document evidence HTTP', () => {
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

  async function createOpenBid(token: string) {
    const tender = await request(app).post('/api/v1/tenders').set(authHeader(token)).send({
      referenceNumber: 'GEM/2026/B/DOC/001',
      title: 'Document evidence tender',
      organizationName: 'Chennai Petroleum Corporation Limited',
      departmentName: 'Contracts and Procurement',
      category: 'Goods',
      status: 'OPEN',
      issueDate: '2026-07-01',
      closingDate: '2026-09-15',
    });
    expect(tender.status).toBe(201);
    const requirement = await request(app)
      .post(`/api/v1/tenders/${tender.body.data.tender.id}/requirements`)
      .set(authHeader(token))
      .send({ name: 'GST registration', requirementType: 'statutory', mandatory: true });
    expect(requirement.status).toBe(201);
    const bidder = await request(app).post('/api/v1/bidders').set(authHeader(token)).send({
      legalName: 'Evidence Bidder Private Limited',
    });
    expect(bidder.status).toBe(201);
    const bid = await request(app)
      .post(`/api/v1/tenders/${tender.body.data.tender.id}/bids`)
      .set(authHeader(token))
      .send({ bidderId: bidder.body.data.bidder.id });
    expect(bid.status).toBe(201);
    return {
      tenderId: tender.body.data.tender.id as string,
      requirementId: requirement.body.data.requirement.id as string,
      bidId: bid.body.data.bid.id as string,
    };
  }

  function upload(token: string, bidId: string, buffer: Buffer, filename: string, fields: Record<string, string> = {}, contentType = 'text/plain') {
    return request(app)
      .post(`/api/v1/bids/${bidId}/documents`)
      .set(authHeader(token))
      .field('documentType', fields.documentType ?? 'gst_certificate')
      .field('tenderRequirementId', fields.tenderRequirementId ?? 'unmapped')
      .attach('file', buffer, { filename, contentType });
  }

  it('lets an officer upload, list, preview, version, map, and archive a document', async () => {
    const session = await officerSession();
    const { bidId, requirementId } = await createOpenBid(session.tokens.accessToken);
    const body = Buffer.from('DEMO / SYNTHETIC\nGST certificate placeholder\n', 'utf8');
    const created = await upload(session.tokens.accessToken, bidId, body, 'DEMO_GST.txt', {
      documentType: 'gst_certificate',
      tenderRequirementId: requirementId,
    });
    expect(created.status).toBe(201);
    expect(created.body.data.document.originalFilename).toBe('DEMO_GST.txt');
    expect(created.body.data.document.documentType).toBe('gst_certificate');
    expect(created.body.data.document.linked).toBe(true);
    expect(created.body.data.document.storageKey).toBeUndefined();
    expect(created.body.data.document.extractionStatus).toBe('completed');
    expect(created.body.data.document.extractedText).toContain('DEMO / SYNTHETIC');
    expect(created.body.data.document.extractionAdvisory).toMatch(/not independently verified/i);

    const listed = await request(app)
      .get(`/api/v1/bids/${bidId}/documents`)
      .set(authHeader(session.tokens.accessToken));
    expect(listed.status).toBe(200);
    expect(listed.body.data.items).toHaveLength(1);
    expect(listed.body.data.items[0].extractedText).toBeUndefined();
    expect(listed.body.data.items[0].storageKey).toBeUndefined();
    expect(listed.body.data.summary.total).toBe(1);
    expect(JSON.stringify(listed.body.data)).not.toContain('bids/');

    const downloaded = await request(app)
      .get(`/api/v1/bids/${bidId}/documents/${created.body.data.document.id}/download`)
      .set(authHeader(session.tokens.accessToken));
    expect(downloaded.status).toBe(200);
    expect(downloaded.headers['content-disposition']).toMatch(/attachment/);
    expect(downloaded.headers['cache-control']).toMatch(/private/);
    expect(downloaded.text).toContain('DEMO / SYNTHETIC');

    const versionBody = Buffer.from('DEMO / SYNTHETIC\nGST certificate replacement\n', 'utf8');
    const versioned = await request(app)
      .post(`/api/v1/bids/${bidId}/documents/${created.body.data.document.id}/version`)
      .set(authHeader(session.tokens.accessToken))
      .attach('file', versionBody, { filename: 'DEMO_GST_v2.txt', contentType: 'text/plain' });
    expect(versioned.status).toBe(201);
    expect(versioned.body.data.document.versionNumber).toBe(2);
    expect(versioned.body.data.document.isCurrent).toBe(true);

    const unmapped = await request(app)
      .post(`/api/v1/bids/${bidId}/documents/${versioned.body.data.document.id}/link-requirement`)
      .set(authHeader(session.tokens.accessToken))
      .send({ tenderRequirementId: null });
    expect(unmapped.status).toBe(200);
    expect(unmapped.body.data.document.linked).toBe(false);

    const archived = await request(app)
      .post(`/api/v1/bids/${bidId}/documents/${versioned.body.data.document.id}/archive`)
      .set(authHeader(session.tokens.accessToken));
    expect(archived.status).toBe(200);
    expect(archived.body.data.document.status).toBe('archived');

    const activity = await request(app)
      .get(`/api/v1/bids/${bidId}/activity`)
      .set(authHeader(session.tokens.accessToken));
    const actions = activity.body.data.items.map((item: { action: string }) => item.action);
    expect(actions).toEqual(expect.arrayContaining(['document.uploaded', 'document.version.created', 'document.archived']));

    const detail = await request(app).get(`/api/v1/bids/${bidId}`).set(authHeader(session.tokens.accessToken));
    expect(detail.body.data.bid.documentSummary.total).toBeGreaterThan(0);
  });

  it('forbids reviewers from uploading while allowing read and download', async () => {
    const officer = await officerSession();
    const { bidId } = await createOpenBid(officer.tokens.accessToken);
    const created = await upload(
      officer.tokens.accessToken,
      bidId,
      Buffer.from('DEMO / SYNTHETIC reviewer read\n', 'utf8'),
      'DEMO_PAN.txt',
      { documentType: 'pan' },
    );
    expect(created.status).toBe(201);

    const reviewer = await reviewerSession();
    const forbidden = await upload(
      reviewer.tokens.accessToken,
      bidId,
      Buffer.from('should not upload\n', 'utf8'),
      'denied.txt',
    );
    expect(forbidden.status).toBe(403);
    expect(forbidden.body.error.code).toBe(ERROR_CODES.AUTHORIZATION_ERROR);

    const listed = await request(app)
      .get(`/api/v1/bids/${bidId}/documents`)
      .set(authHeader(reviewer.tokens.accessToken));
    expect(listed.status).toBe(200);
    expect(listed.body.data.items).toHaveLength(1);

    const downloaded = await request(app)
      .get(`/api/v1/bids/${bidId}/documents/${created.body.data.document.id}/download`)
      .set(authHeader(reviewer.tokens.accessToken));
    expect(downloaded.status).toBe(200);
  });

  it('rejects invalid MIME types, extensions, path traversal filenames, and oversized files', async () => {
    const session = await officerSession();
    const { bidId } = await createOpenBid(session.tokens.accessToken);

    const exe = await upload(
      session.tokens.accessToken,
      bidId,
      Buffer.from('MZ'),
      'payload.exe',
      { documentType: 'other' },
      'application/octet-stream',
    );
    expect(exe.status).toBe(400);

    const traversal = await upload(
      session.tokens.accessToken,
      bidId,
      Buffer.from('DEMO / SYNTHETIC\n', 'utf8'),
      // Multer uses path.basename, so "../secret.txt" becomes "secret.txt" before validation.
      // A remaining ".." in the basename must still be rejected.
      '..secret.txt',
    );
    expect(traversal.status).toBe(400);

    const mismatch = await upload(
      session.tokens.accessToken,
      bidId,
      PNG,
      'notes.txt',
      { documentType: 'other' },
      'text/plain',
    );
    expect(mismatch.status).toBe(400);

    const oversized = await upload(
      session.tokens.accessToken,
      bidId,
      Buffer.alloc(3000, 65),
      'big.txt',
    );
    expect(oversized.status).toBe(400);
    expect(String(oversized.body.error.message)).toMatch(/2048|too large|maximum/i);
  });

  it('detects duplicate checksums without calling them verification', async () => {
    const session = await officerSession();
    const { bidId } = await createOpenBid(session.tokens.accessToken);
    const body = Buffer.from('DEMO / SYNTHETIC identical file\n', 'utf8');
    const first = await upload(session.tokens.accessToken, bidId, body, 'one.txt', { documentType: 'other' });
    expect(first.status).toBe(201);
    const duplicate = await upload(session.tokens.accessToken, bidId, body, 'two.txt', { documentType: 'other' });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error.message).toBe('An identical file already exists for this submission.');
  });

  it('requires authentication and bid access for downloads', async () => {
    const session = await officerSession();
    const { bidId } = await createOpenBid(session.tokens.accessToken);
    const created = await upload(
      session.tokens.accessToken,
      bidId,
      Buffer.from('DEMO / SYNTHETIC auth check\n', 'utf8'),
      'auth.txt',
      { documentType: 'other' },
    );
    const anonymous = await request(app).get(
      `/api/v1/bids/${bidId}/documents/${created.body.data.document.id}/download`,
    );
    expect(anonymous.status).toBe(401);

    const stranger = await register('user@example.com');
    const forbidden = await request(app)
      .get(`/api/v1/bids/${bidId}/documents/${created.body.data.document.id}/download`)
      .set(authHeader(stranger.tokens.accessToken));
    expect(forbidden.status).toBe(403);
  });
});
