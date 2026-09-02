import type { PrismaClient } from '@prisma/client';
import { describe } from 'vitest';

import { createPrismaClient } from '../../src/lib/prisma';
import { createRepositories, type Repositories } from '../../src/repositories';
import { createUser, TEST_PASSWORD_HASH } from '../factories';

export { TEST_PASSWORD_HASH };

export function hasDatabaseUrl(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export const describeDatabase = hasDatabaseUrl() ? describe : describe.skip;

let prisma: PrismaClient | undefined;

export function getTestPrisma(): PrismaClient {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is required for database tests');
  }

  if (!prisma) {
    prisma = createPrismaClient({
      url,
      poolMax: 5,
      poolTimeoutSeconds: 10,
    });
  }

  return prisma;
}

export function getTestRepositories(): Repositories {
  return createRepositories(getTestPrisma());
}

export async function resetDatabase(client: PrismaClient = getTestPrisma()): Promise<void> {
  await client.$executeRawUnsafe(`
    TRUNCATE TABLE
      audit_events,
      document_extractions,
      documents,
      stored_files,
      stored_objects,
      refresh_tokens,
      notification_preferences,
      notifications,
      notification_deliveries,
      review_assessments,
      review_clarifications,
      bid_review_items,
      evaluation_notes,
      evaluation_decisions,
      tender_evaluations,
      bid_cross_verifications,
      bid_verifications,
      bid_documents,
      bid_submissions,
      tender_requirements,
      tenders,
      bidders,
      user_roles,
      role_permissions,
      users,
      roles,
      permissions
    CASCADE
  `);
}

export async function disconnectTestPrisma(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    prisma = undefined;
  }
}

export async function createTestUser(
  overrides: {
    email?: string;
    displayName?: string;
    status?: 'active' | 'invited' | 'disabled';
  } = {},
) {
  return createUser(getTestRepositories(), overrides);
}
