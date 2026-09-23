import type { Express } from 'express';
import request from 'supertest';
import { expect } from 'vitest';

import { openTenderSchedule } from './tender-window';

export function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export async function createOpenTenderWithRequirements(
  app: Express,
  token: string,
  tenderFields: Record<string, unknown>,
  requirements: Array<Record<string, unknown>>,
) {
  const created = await request(app)
    .post('/api/v1/tenders')
    .set(authHeader(token))
    .send({
      ...openTenderSchedule(),
      ...tenderFields,
      status: 'draft',
    });
  expect(created.status).toBe(201);
  const tenderId = created.body.data.tender.id as string;
  const createdRequirements: Array<{ id: string; name: string }> = [];
  for (const body of requirements) {
    const row = await request(app)
      .post(`/api/v1/tenders/${tenderId}/requirements`)
      .set(authHeader(token))
      .send(body);
    expect(row.status).toBe(201);
    createdRequirements.push(row.body.data.requirement);
  }
  const opened = await request(app)
    .post(`/api/v1/tenders/${tenderId}/status`)
    .set(authHeader(token))
    .send({ status: 'open' });
  expect(opened.status).toBe(200);
  return { tenderId, tender: opened.body.data.tender, requirements: createdRequirements };
}
