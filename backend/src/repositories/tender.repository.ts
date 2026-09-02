import type { Prisma, Tender, TenderRequirement } from '@prisma/client';

import { mapPrismaError } from '../lib/prisma-error';
import { parsePagination, parseSort, toPaginatedResult, type PaginatedResult } from './query';
import type { DbClient } from './types';
import type { TenderListQuery } from '../problem/schemas';
import { normalizeTenderCategory, type TenderStatusName } from '../problem/types';

export interface CreateTenderRecord {
  referenceNumber: string;
  title: string;
  description?: string | null;
  organizationName: string;
  departmentName: string;
  category: string;
  status: TenderStatusName;
  issueDate: Date;
  closingDate: Date;
  createdById?: string | null;
}

export interface UpdateTenderRecord {
  title?: string;
  description?: string | null;
  organizationName?: string;
  departmentName?: string;
  category?: string;
  issueDate?: Date;
  closingDate?: Date;
  status?: TenderStatusName;
}

export type TenderWithCounts = Tender & { _count: { bids: number; requirements: number } };
export type TenderDetailRecord = Tender & {
  requirements: TenderRequirement[];
  createdBy: { id: string; displayName: string } | null;
  _count: { bids: number; requirements: number };
};

const TENDER_SORT_FIELDS = ['closingDate', 'createdAt', 'referenceNumber', 'status'] as const;
type TenderSortField = (typeof TENDER_SORT_FIELDS)[number];

const SORT_ALIASES: Record<string, TenderSortField> = {
  closingdate: 'closingDate',
  closing_date: 'closingDate',
  createdat: 'createdAt',
  created_at: 'createdAt',
  created: 'createdAt',
  created_date: 'createdAt',
  referencenumber: 'referenceNumber',
  reference_number: 'referenceNumber',
  reference: 'referenceNumber',
  status: 'status',
};

function resolveSortField(raw?: string): string {
  if (!raw) {
    return 'closingDate';
  }
  const key = raw.replace(/-/g, '_');
  return SORT_ALIASES[key.toLowerCase()] ?? raw;
}

export class TenderRepository {
  constructor(private readonly db: DbClient) {}

  async create(input: CreateTenderRecord): Promise<Tender> {
    try {
      return await this.db.tender.create({
        data: {
          referenceNumber: input.referenceNumber,
          title: input.title,
          description: input.description ?? null,
          organizationName: input.organizationName,
          departmentName: input.departmentName,
          category: input.category,
          status: input.status,
          issueDate: input.issueDate,
          closingDate: input.closingDate,
          createdById: input.createdById ?? null,
        },
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async findById(id: string): Promise<TenderDetailRecord | null> {
    try {
      return await this.db.tender.findUnique({
        where: { id },
        include: {
          requirements: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] },
          createdBy: { select: { id: true, displayName: true } },
          _count: { select: { bids: true, requirements: true } },
        },
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async update(id: string, data: UpdateTenderRecord): Promise<Tender> {
    try {
      return await this.db.tender.update({
        where: { id },
        data,
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async list(query: TenderListQuery): Promise<PaginatedResult<TenderWithCounts>> {
    const pagination = parsePagination(query);
    const sortField = resolveSortField(query.sortBy ?? query.sort);
    const sort = parseSort(
      { sortBy: sortField, sortOrder: query.sortOrder ?? query.order },
      TENDER_SORT_FIELDS,
      'closingDate',
      'desc',
    );
    const search = query.q ?? query.search;
    const where: Prisma.TenderWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }
    if (query.category) {
      const category = normalizeTenderCategory(query.category) ?? query.category;
      where.category = { equals: category, mode: 'insensitive' };
    }
    if (search) {
      where.OR = [
        { referenceNumber: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
        { organizationName: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
      ];
    }

    try {
      const [items, totalItems] = await Promise.all([
        this.db.tender.findMany({
          where,
          orderBy: [{ [sort.field]: sort.order }, { createdAt: 'desc' }],
          skip: pagination.skip,
          take: pagination.take,
          include: { _count: { select: { bids: true, requirements: true } } },
        }),
        this.db.tender.count({ where }),
      ]);
      return toPaginatedResult(items, pagination, totalItems);
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async countByStatus(status: TenderStatusName): Promise<number> {
    try {
      return await this.db.tender.count({ where: { status } });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async countAll(): Promise<number> {
    try {
      return await this.db.tender.count();
    } catch (error) {
      mapPrismaError(error);
    }
  }
}
