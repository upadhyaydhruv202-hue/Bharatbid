import { randomUUID } from 'node:crypto';

import type { TenderRequirement } from '@prisma/client';

import { mapPrismaError } from '../lib/prisma-error';
import type { DbClient } from './types';
import type { TenderRequirementTypeName } from '../problem/types';

export interface CreateRequirementRecord {
  tenderId: string;
  name: string;
  description?: string | null;
  requirementType: TenderRequirementTypeName;
  mandatory: boolean;
  active: boolean;
  sortOrder: number;
  createdById?: string | null;
}

export interface UpdateRequirementRecord {
  name?: string;
  description?: string | null;
  requirementType?: TenderRequirementTypeName;
  mandatory?: boolean;
  active?: boolean;
  sortOrder?: number;
}

export interface AmendRequirementRecord {
  name: string;
  description: string | null;
  requirementType: TenderRequirementTypeName;
  mandatory: boolean;
  changeReason: string;
  createdById?: string | null;
}

export class TenderRequirementRepository {
  constructor(private readonly db: DbClient) {}

  async listByTender(tenderId: string): Promise<TenderRequirement[]> {
    try {
      return await this.db.tenderRequirement.findMany({
        where: { tenderId },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async listByTenderIds(tenderIds: string[]): Promise<TenderRequirement[]> {
    if (tenderIds.length === 0) {
      return [];
    }
    try {
      return await this.db.tenderRequirement.findMany({
        where: { tenderId: { in: tenderIds }, active: true },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async findById(id: string): Promise<TenderRequirement | null> {
    try {
      return await this.db.tenderRequirement.findUnique({ where: { id } });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async create(input: CreateRequirementRecord): Promise<TenderRequirement> {
    const id = randomUUID();
    try {
      return await this.db.tenderRequirement.create({
        data: {
          id,
          tenderId: input.tenderId,
          name: input.name,
          description: input.description ?? null,
          requirementType: input.requirementType,
          mandatory: input.mandatory,
          active: input.active,
          sortOrder: input.sortOrder,
          createdById: input.createdById ?? null,
          groupId: id,
          version: 1,
          effectiveAt: new Date(),
        } as never,
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async amend(existing: TenderRequirement, input: AmendRequirementRecord): Promise<TenderRequirement> {
    try {
      await this.db.tenderRequirement.update({
        where: { id: existing.id },
        data: { active: false },
      });
      return await this.db.tenderRequirement.create({
        data: {
          tenderId: existing.tenderId,
          name: input.name,
          description: input.description,
          requirementType: input.requirementType,
          mandatory: input.mandatory,
          active: true,
          sortOrder: existing.sortOrder,
          createdById: input.createdById ?? null,
          groupId: (existing as TenderRequirement & { groupId?: string }).groupId ?? existing.id,
          version: ((existing as TenderRequirement & { version?: number }).version ?? 1) + 1,
          previousVersionId: existing.id,
          changeReason: input.changeReason,
          effectiveAt: new Date(),
        } as never,
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async update(id: string, data: UpdateRequirementRecord): Promise<TenderRequirement> {
    try {
      return await this.db.tenderRequirement.update({ where: { id }, data });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async nextSortOrder(tenderId: string): Promise<number> {
    try {
      const last = await this.db.tenderRequirement.findFirst({
        where: { tenderId },
        orderBy: { sortOrder: 'desc' },
        select: { sortOrder: true },
      });
      return (last?.sortOrder ?? -1) + 1;
    } catch (error) {
      mapPrismaError(error);
    }
  }
}
