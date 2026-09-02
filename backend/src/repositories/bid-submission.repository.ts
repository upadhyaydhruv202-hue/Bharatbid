import type { BidSubmission, Bidder, Prisma, Tender } from '@prisma/client';

import { mapPrismaError } from '../lib/prisma-error';
import { parsePagination, toPaginatedResult, type PaginatedResult } from './query';
import type { DbClient } from './types';
import type { BidListQuery } from '../problem/schemas';
import type { BidSubmissionStatusName } from '../problem/types';

export type BidWithRelations = BidSubmission & {
  tender: Pick<Tender, 'id' | 'referenceNumber' | 'title' | 'status'>;
  bidder: Pick<Bidder, 'id' | 'legalName'>;
};

export type BidAttentionRecord = BidSubmission & {
  tender: Pick<Tender, 'id' | 'referenceNumber' | 'title' | 'status' | 'category' | 'closingDate'>;
  bidder: Pick<Bidder, 'id' | 'legalName'>;
};

export type BidDetailRecord = BidSubmission & {
  tender: Pick<Tender, 'id' | 'referenceNumber' | 'title' | 'status' | 'category' | 'closingDate'>;
  bidder: Pick<
    Bidder,
    'id' | 'legalName' | 'tradeName' | 'city' | 'state' | 'contactName' | 'contactEmail' | 'pan' | 'gstin'
  >;
};

export class BidSubmissionRepository {
  constructor(private readonly db: DbClient) {}

  async create(input: {
    tenderId: string;
    bidderId: string;
    submissionReference: string;
    status?: BidSubmissionStatusName;
    submittedAt?: Date | null;
  }): Promise<BidSubmission> {
    try {
      return await this.db.bidSubmission.create({
        data: {
          tenderId: input.tenderId,
          bidderId: input.bidderId,
          submissionReference: input.submissionReference,
          status: input.status ?? 'draft',
          submittedAt: input.submittedAt ?? null,
        },
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async findById(id: string): Promise<BidDetailRecord | null> {
    try {
      return await this.db.bidSubmission.findUnique({
        where: { id },
        include: {
          tender: { select: { id: true, referenceNumber: true, title: true, status: true, category: true, closingDate: true } },
          bidder: {
            select: {
              id: true,
              legalName: true,
              tradeName: true,
              city: true,
              state: true,
              contactName: true,
              contactEmail: true,
              pan: true,
              gstin: true,
            },
          },
        },
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async findByTenderAndBidder(tenderId: string, bidderId: string): Promise<BidSubmission | null> {
    try {
      return await this.db.bidSubmission.findUnique({
        where: { tenderId_bidderId: { tenderId, bidderId } },
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async update(
    id: string,
    data: { status?: BidSubmissionStatusName; submittedAt?: Date | null },
  ): Promise<BidSubmission> {
    try {
      return await this.db.bidSubmission.update({ where: { id }, data });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async list(query: BidListQuery): Promise<PaginatedResult<BidWithRelations>> {
    const pagination = parsePagination(query);
    const where: Prisma.BidSubmissionWhereInput = {};
    if (query.tenderId) {
      where.tenderId = query.tenderId;
    }
    if (query.bidderId) {
      where.bidderId = query.bidderId;
    }
    if (query.status) {
      where.status = query.status;
    }
    const search = query.q ?? query.search;
    if (search) {
      where.OR = [
        { submissionReference: { contains: search, mode: 'insensitive' } },
        { tender: { title: { contains: search, mode: 'insensitive' } } },
        { tender: { referenceNumber: { contains: search, mode: 'insensitive' } } },
        { bidder: { legalName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    try {
      const [items, totalItems] = await Promise.all([
        this.db.bidSubmission.findMany({
          where,
          orderBy: [{ createdAt: 'desc' }],
          skip: pagination.skip,
          take: pagination.take,
          include: {
            tender: { select: { id: true, referenceNumber: true, title: true, status: true } },
            bidder: { select: { id: true, legalName: true } },
          },
        }),
        this.db.bidSubmission.count({ where }),
      ]);
      return toPaginatedResult(items, pagination, totalItems);
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async countAll(): Promise<number> {
    try {
      return await this.db.bidSubmission.count();
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async countByStatuses(statuses: BidSubmissionStatusName[], tenderId?: string): Promise<number> {
    try {
      return await this.db.bidSubmission.count({
        where: {
          status: { in: statuses },
          ...(tenderId ? { tenderId } : {}),
        },
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async listMatching(query: {
    tenderId?: string;
    bidderId?: string;
    status?: string;
    category?: string;
    q?: string;
    search?: string;
  }): Promise<BidAttentionRecord[]> {
    const where: Prisma.BidSubmissionWhereInput = {};
    if (query.tenderId) {
      where.tenderId = query.tenderId;
    }
    if (query.bidderId) {
      where.bidderId = query.bidderId;
    }
    if (query.status) {
      where.status = query.status as BidSubmissionStatusName;
    }
    if (query.category) {
      where.tender = { category: query.category };
    }
    const search = query.q ?? query.search;
    if (search) {
      where.OR = [
        { submissionReference: { contains: search, mode: 'insensitive' } },
        { tender: { title: { contains: search, mode: 'insensitive' } } },
        { tender: { referenceNumber: { contains: search, mode: 'insensitive' } } },
        { bidder: { legalName: { contains: search, mode: 'insensitive' } } },
      ];
    }
    try {
      return await this.db.bidSubmission.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        take: 250,
        include: {
          tender: {
            select: { id: true, referenceNumber: true, title: true, status: true, category: true, closingDate: true },
          },
          bidder: { select: { id: true, legalName: true } },
        },
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async listByIds(ids: string[]): Promise<BidAttentionRecord[]> {
    if (ids.length === 0) {
      return [];
    }
    try {
      return await this.db.bidSubmission.findMany({
        where: { id: { in: ids } },
        include: {
          tender: {
            select: { id: true, referenceNumber: true, title: true, status: true, category: true, closingDate: true },
          },
          bidder: { select: { id: true, legalName: true } },
        },
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async listEvaluableByTenderIds(tenderIds: string[]): Promise<BidAttentionRecord[]> {
    if (tenderIds.length === 0) {
      return [];
    }
    try {
      return await this.db.bidSubmission.findMany({
        where: {
          tenderId: { in: tenderIds },
          status: { in: ['submitted', 'under_review', 'finalized'] },
        },
        orderBy: [{ submissionReference: 'asc' }],
        include: {
          tender: {
            select: { id: true, referenceNumber: true, title: true, status: true, category: true, closingDate: true },
          },
          bidder: { select: { id: true, legalName: true } },
        },
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async countByTenderGrouped(tenderId: string): Promise<Partial<Record<BidSubmissionStatusName, number>>> {
    try {
      const groups = await this.db.bidSubmission.groupBy({
        by: ['status'],
        where: { tenderId },
        _count: { _all: true },
      });
      const counts: Partial<Record<BidSubmissionStatusName, number>> = {};
      for (const group of groups) {
        counts[group.status] = group._count._all;
      }
      return counts;
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async countNonDraftBids(tenderId: string): Promise<number> {
    try {
      return await this.db.bidSubmission.count({
        where: { tenderId, status: { notIn: ['draft', 'withdrawn'] } },
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async countReferencePrefix(prefix: string): Promise<number> {
    try {
      return await this.db.bidSubmission.count({
        where: { submissionReference: { startsWith: prefix } },
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }
}
