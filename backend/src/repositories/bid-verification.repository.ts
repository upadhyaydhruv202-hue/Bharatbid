import { Prisma, type BidVerification } from '@prisma/client';

import { mapPrismaError } from '../lib/prisma-error';
import { parsePagination, toPaginatedResult, type PaginatedResult } from './query';
import type { DbClient } from './types';
import type {
  VerificationIdentifierOriginName,
  VerificationIdentifierTypeName,
  VerificationSourceModeName,
  VerificationSourceName,
  VerificationStatusName,
} from '../problem/verification/types';
import type { VerificationListQuery } from '../problem/schemas';

export type BidVerificationRecord = BidVerification & {
  document: { id: string; originalFilename: string; documentType: string } | null;
  requestedBy: { id: string; displayName: string } | null;
};

export interface CreateBidVerificationRecord {
  id: string;
  bidSubmissionId: string;
  bidderId: string;
  documentId?: string | null;
  groupId: string;
  attemptNumber: number;
  isLatest: boolean;
  identifierType: VerificationIdentifierTypeName;
  identifierValue: string;
  identifierOrigin: VerificationIdentifierOriginName;
  source: VerificationSourceName;
  sourceMode: VerificationSourceModeName;
  sourceDisplayName: string;
  status: VerificationStatusName;
  explanation: string;
  fieldComparisons: Prisma.InputJsonValue;
  sourceSnapshot?: Prisma.InputJsonValue | typeof Prisma.DbNull | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  requestedAt?: Date;
  completedAt?: Date | null;
  requestedById?: string | null;
}

export class BidVerificationRepository {
  constructor(private readonly db: DbClient) {}

  async create(input: CreateBidVerificationRecord): Promise<BidVerificationRecord> {
    try {
      const { sourceSnapshot, ...rest } = input;
      return await this.db.bidVerification.create({
        data: {
          ...rest,
          sourceSnapshot: sourceSnapshot ?? Prisma.DbNull,
        },
        include: verificationInclude,
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async findById(id: string): Promise<BidVerificationRecord | null> {
    try {
      return await this.db.bidVerification.findUnique({
        where: { id },
        include: verificationInclude,
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async list(bidSubmissionId: string, query: VerificationListQuery): Promise<PaginatedResult<BidVerificationRecord>> {
    const pagination = parsePagination(query);
    const where: Prisma.BidVerificationWhereInput = { bidSubmissionId };
    if (query.source) {
      where.source = query.source;
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.identifierType) {
      where.identifierType = query.identifierType;
    }
    if (query.latestOnly !== false) {
      where.isLatest = true;
    }
    try {
      const [items, totalItems] = await Promise.all([
        this.db.bidVerification.findMany({
          where,
          orderBy: { requestedAt: 'desc' },
          skip: pagination.skip,
          take: pagination.take,
          include: verificationInclude,
        }),
        this.db.bidVerification.count({ where }),
      ]);
      return toPaginatedResult(items, pagination, totalItems);
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async listByGroup(groupId: string): Promise<BidVerificationRecord[]> {
    try {
      return await this.db.bidVerification.findMany({
        where: { groupId },
        orderBy: { attemptNumber: 'desc' },
        include: verificationInclude,
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async findLatestSame(input: {
    bidSubmissionId: string;
    source: VerificationSourceName;
    identifierType: VerificationIdentifierTypeName;
    identifierValue: string;
  }): Promise<BidVerificationRecord | null> {
    try {
      return await this.db.bidVerification.findFirst({
        where: {
          bidSubmissionId: input.bidSubmissionId,
          source: input.source,
          identifierType: input.identifierType,
          identifierValue: input.identifierValue,
        },
        orderBy: { requestedAt: 'desc' },
        include: verificationInclude,
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async markGroupNotLatest(groupId: string): Promise<void> {
    try {
      await this.db.bidVerification.updateMany({
        where: { groupId, isLatest: true },
        data: { isLatest: false },
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async listLatest(bidSubmissionId: string): Promise<BidVerificationRecord[]> {
    try {
      return await this.db.bidVerification.findMany({
        where: { bidSubmissionId, isLatest: true },
        orderBy: { requestedAt: 'desc' },
        include: verificationInclude,
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async listLatestByBidIds(bidSubmissionIds: string[]): Promise<
    Array<{ id: string; bidSubmissionId: string; source: string; status: string }>
  > {
    if (bidSubmissionIds.length === 0) {
      return [];
    }
    try {
      return await this.db.bidVerification.findMany({
        where: { bidSubmissionId: { in: bidSubmissionIds }, isLatest: true },
        select: { id: true, bidSubmissionId: true, source: true, status: true },
        orderBy: { requestedAt: 'desc' },
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async summarizeLatest(tenderId?: string) {
    const where: Prisma.BidVerificationWhereInput = {
      isLatest: true,
      ...(tenderId ? { bid: { tenderId } } : {}),
    };
    try {
      const [statusGroups, sourceGroups] = await Promise.all([
        this.db.bidVerification.groupBy({
          by: ['status'],
          where,
          _count: { _all: true },
        }),
        this.db.bidVerification.groupBy({
          by: ['source', 'status'],
          where,
          _count: { _all: true },
        }),
      ]);
      const counts: Record<string, number> = {};
      for (const group of statusGroups) {
        counts[group.status] = group._count._all;
      }
      const bySource: Record<string, Record<string, number>> = {};
      for (const group of sourceGroups) {
        const bucket = bySource[group.source] ?? {};
        bucket[group.status] = group._count._all;
        bySource[group.source] = bucket;
      }
      return { counts, bySource };
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async summarize(bidSubmissionId: string) {
    try {
      const [groups, total] = await Promise.all([
        this.db.bidVerification.groupBy({
          by: ['status'],
          where: { bidSubmissionId, isLatest: true },
          _count: { _all: true },
        }),
        this.db.bidVerification.count({ where: { bidSubmissionId, isLatest: true } }),
      ]);
      const counts: Record<string, number> = {};
      for (const group of groups) {
        counts[group.status] = group._count._all;
      }
      return {
        total,
        matched: counts.matched ?? 0,
        mismatched: counts.mismatched ?? 0,
        notFound: counts.not_found ?? 0,
        errors: counts.error ?? 0,
        processing: (counts.processing ?? 0) + (counts.queued ?? 0),
      };
    } catch (error) {
      mapPrismaError(error);
    }
  }
}

const verificationInclude = {
  document: { select: { id: true, originalFilename: true, documentType: true } },
  requestedBy: { select: { id: true, displayName: true } },
} as const;
