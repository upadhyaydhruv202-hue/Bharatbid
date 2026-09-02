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
}

export interface UpdateRequirementRecord {
  name?: string;
  description?: string | null;
  requirementType?: TenderRequirementTypeName;
  mandatory?: boolean;
  active?: boolean;
  sortOrder?: number;
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
    try {
      return await this.db.tenderRequirement.create({
        data: {
          tenderId: input.tenderId,
          name: input.name,
          description: input.description ?? null,
          requirementType: input.requirementType,
          mandatory: input.mandatory,
          active: input.active,
          sortOrder: input.sortOrder,
        },
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
