import type { BidDocument, Prisma, PrismaClient, TenderRequirement, User } from '@prisma/client';

import { mapPrismaError } from '../lib/prisma-error';
import { withTransaction } from '../lib/transaction';
import { parsePagination, toPaginatedResult, type PaginatedResult } from './query';
import type { DbClient } from './types';
import { BID_DOCUMENT_TYPE_CATEGORY } from '../problem/types';
import type { BidDocumentListQuery } from '../problem/schemas';
import type {
  BidDocumentExtractionStatusName,
  BidDocumentStatusName,
  BidDocumentTypeName,
} from '../problem/types';

export type BidDocumentRecord = BidDocument & {
  requirement: Pick<TenderRequirement, 'id' | 'name'> | null;
  uploadedBy: Pick<User, 'id' | 'displayName'> | null;
};

export interface CreateBidDocumentRecord {
  id: string;
  bidSubmissionId: string;
  tenderRequirementId?: string | null;
  groupId: string;
  versionNumber: number;
  isCurrent: boolean;
  documentType: BidDocumentTypeName;
  originalFilename: string;
  storedFilename: string;
  mimeType: string;
  extension: string;
  sizeBytes: number;
  storageKey: string;
  checksumSha256: string;
  status: BidDocumentStatusName;
  extractionStatus: BidDocumentExtractionStatusName;
  uploadedById?: string | null;
}

export class BidDocumentRepository {
  constructor(private readonly db: DbClient) {}

  async create(input: CreateBidDocumentRecord): Promise<BidDocumentRecord> {
    try {
      return await this.db.bidDocument.create({
        data: input,
        include: documentInclude,
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async findById(id: string): Promise<BidDocumentRecord | null> {
    try {
      return await this.db.bidDocument.findUnique({
        where: { id },
        include: documentInclude,
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async findCurrentByChecksum(bidSubmissionId: string, checksumSha256: string): Promise<BidDocumentRecord | null> {
    try {
      return await this.db.bidDocument.findFirst({
        where: { bidSubmissionId, checksumSha256, isCurrent: true, status: { not: 'archived' } },
        include: documentInclude,
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async list(bidSubmissionId: string, query: BidDocumentListQuery): Promise<PaginatedResult<BidDocumentRecord>> {
    const pagination = parsePagination(query);
    const where: Prisma.BidDocumentWhereInput = { bidSubmissionId };
    if (query.documentType) {
      where.documentType = query.documentType;
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.extractionStatus) {
      where.extractionStatus = query.extractionStatus;
    }
    if (query.currentOnly !== false) {
      where.isCurrent = true;
    }
    if (query.tenderRequirementId === 'unmapped') {
      where.tenderRequirementId = null;
    } else if (query.tenderRequirementId) {
      where.tenderRequirementId = query.tenderRequirementId;
    }
    if (query.category) {
      const types = (Object.entries(BID_DOCUMENT_TYPE_CATEGORY) as Array<[BidDocumentTypeName, string]>)
        .filter(([, category]) => category === query.category)
        .map(([type]) => type);
      where.documentType = { in: types };
    }

    const orderBy: Prisma.BidDocumentOrderByWithRelationInput =
      query.sort === 'oldest'
        ? { createdAt: 'asc' }
        : query.sort === 'name'
          ? { originalFilename: 'asc' }
          : query.sort === 'type'
            ? { documentType: 'asc' }
            : { createdAt: 'desc' };

    try {
      const [items, totalItems] = await Promise.all([
        this.db.bidDocument.findMany({
          where,
          orderBy,
          skip: pagination.skip,
          take: pagination.take,
          include: documentInclude,
        }),
        this.db.bidDocument.count({ where }),
      ]);
      return toPaginatedResult(items, pagination, totalItems);
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async listByGroup(groupId: string): Promise<BidDocumentRecord[]> {
    try {
      return await this.db.bidDocument.findMany({
        where: { groupId },
        orderBy: { versionNumber: 'desc' },
        include: documentInclude,
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async listCurrent(bidSubmissionId: string): Promise<BidDocumentRecord[]> {
    try {
      return await this.db.bidDocument.findMany({
        where: { bidSubmissionId, isCurrent: true, status: { not: 'archived' } },
        orderBy: { createdAt: 'desc' },
        include: documentInclude,
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async listCurrentByBidIds(bidSubmissionIds: string[]): Promise<
    Array<{
      id: string;
      bidSubmissionId: string;
      documentType: string;
      tenderRequirementId: string | null;
      extractionStatus: string;
      originalFilename: string;
      extractedText: string | null;
    }>
  > {
    if (bidSubmissionIds.length === 0) {
      return [];
    }
    try {
      return await this.db.bidDocument.findMany({
        where: { bidSubmissionId: { in: bidSubmissionIds }, isCurrent: true, status: { not: 'archived' } },
        select: {
          id: true,
          bidSubmissionId: true,
          documentType: true,
          tenderRequirementId: true,
          extractionStatus: true,
          originalFilename: true,
          extractedText: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async summarize(bidSubmissionId: string) {
    try {
      const [statusGroups, unmapped, total] = await Promise.all([
        this.db.bidDocument.groupBy({
          by: ['status'],
          where: { bidSubmissionId, isCurrent: true },
          _count: { _all: true },
        }),
        this.db.bidDocument.count({
          where: { bidSubmissionId, isCurrent: true, tenderRequirementId: null, status: { not: 'archived' } },
        }),
        this.db.bidDocument.count({ where: { bidSubmissionId, isCurrent: true } }),
      ]);
      const counts: Record<string, number> = {};
      for (const group of statusGroups) {
        counts[group.status] = group._count._all;
      }
      return {
        total,
        ready: counts.ready ?? 0,
        processing: counts.processing ?? 0,
        failed: counts.failed ?? 0,
        archived: counts.archived ?? 0,
        unmapped,
      };
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async update(
    id: string,
    data: {
      tenderRequirementId?: string | null;
      isCurrent?: boolean;
      status?: BidDocumentStatusName;
      extractionStatus?: BidDocumentExtractionStatusName;
      extractedText?: string | null;
      extractedAt?: Date | null;
      extractionEngine?: string | null;
      extractionError?: string | null;
      archivedAt?: Date | null;
    },
  ): Promise<BidDocumentRecord> {
    try {
      return await this.db.bidDocument.update({
        where: { id },
        data,
        include: documentInclude,
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async replaceCurrent(input: {
    previousId: string;
    next: CreateBidDocumentRecord;
  }): Promise<BidDocumentRecord> {
    try {
      if ('$transaction' in this.db) {
        return await withTransaction(this.db as PrismaClient, async (tx) => this.writeReplacement(tx, input));
      }
      return await this.writeReplacement(this.db, input);
    } catch (error) {
      mapPrismaError(error);
    }
  }

  private async writeReplacement(
    tx: DbClient,
    input: { previousId: string; next: CreateBidDocumentRecord },
  ): Promise<BidDocumentRecord> {
    await tx.bidDocument.update({
      where: { id: input.previousId },
      data: { isCurrent: false, status: 'archived', archivedAt: new Date() },
    });
    return tx.bidDocument.create({
      data: input.next,
      include: documentInclude,
    });
  }

  async deleteById(id: string): Promise<void> {
    try {
      await this.db.bidDocument.delete({ where: { id } });
    } catch (error) {
      mapPrismaError(error);
    }
  }
}

const documentInclude = {
  requirement: { select: { id: true, name: true } },
  uploadedBy: { select: { id: true, displayName: true } },
} as const;
