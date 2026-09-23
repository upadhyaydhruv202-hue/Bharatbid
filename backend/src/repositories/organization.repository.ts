import { mapPrismaError } from '../lib/prisma-error';
import type { DbClient } from './types';

export type OrganizationRecord = {
  id: string;
  slug: string;
  name: string;
};

export type OrganizationMembership = OrganizationRecord & { isDefault: boolean };

export class OrganizationRepository {
  constructor(private readonly db: DbClient) {}

  async create(input: { name: string; slug: string }): Promise<OrganizationRecord> {
    try {
      return await this.db.organization.create({
        data: { name: input.name, slug: input.slug },
        select: { id: true, slug: true, name: true },
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async addMember(organizationId: string, userId: string, isDefault = true): Promise<void> {
    try {
      await this.db.organizationMember.upsert({
        where: { organizationId_userId: { organizationId, userId } },
        create: { organizationId, userId, isDefault },
        update: { isDefault },
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async attachAsDefaultOrganization(organizationId: string, userId: string): Promise<void> {
    try {
      await this.db.organizationMember.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
      await this.addMember(organizationId, userId, true);
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async listForUser(userId: string): Promise<OrganizationMembership[]> {
    try {
      const rows = await this.db.organizationMember.findMany({
        where: { userId },
        include: { organization: { select: { id: true, slug: true, name: true } } },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
      });
      return rows.map((row) => ({
        id: row.organization.id,
        slug: row.organization.slug,
        name: row.organization.name,
        isDefault: row.isDefault,
      }));
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async createPersonalWorkspace(
    userId: string,
    displayName: string,
    organizationName?: string,
  ): Promise<OrganizationMembership> {
    const slug = `org-${userId.replace(/-/g, '').slice(0, 16)}`;
    const created = await this.create({
      name: (organizationName?.trim() || `${displayName.trim() || 'Officer'} workspace`).slice(0, 160),
      slug,
    });
    await this.addMember(created.id, userId, true);
    return { ...created, isDefault: true };
  }
}
