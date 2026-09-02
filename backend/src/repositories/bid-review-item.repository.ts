import type { BidReviewItem, Prisma } from '@prisma/client';

import { mapPrismaError } from '../lib/prisma-error';
import { parsePagination, toPaginatedResult, type PaginatedResult } from './query';
import type { DbClient } from './types';
import type { ReviewListQuery } from '../problem/schemas';
import type {
  ReviewAssessmentTypeName,
  ReviewClarificationStatusName,
  ReviewIssueTypeName,
  ReviewItemStatusName,
} from '../problem/review/types';

const reviewInclude = {
  bid: { select: { id: true, submissionReference: true, status: true } },
  tender: { select: { id: true, referenceNumber: true, title: true } },
  bidder: { select: { id: true, legalName: true } },
  requirement: { select: { id: true, name: true, mandatory: true, requirementType: true } },
  document: {
    select: { id: true, originalFilename: true, documentType: true, extractionStatus: true },
  },
  verification: {
    select: {
      id: true,
      status: true,
      source: true,
      sourceDisplayName: true,
      sourceMode: true,
    },
  },
  crossVerification: {
    select: {
      id: true,
      status: true,
      comparisonType: true,
      leftSourceDisplayName: true,
      rightSourceDisplayName: true,
      sourceBasis: true,
    },
  },
  openedBy: { select: { id: true, displayName: true } },
  closedBy: { select: { id: true, displayName: true } },
  assessments: {
    orderBy: { attemptNumber: 'desc' as const },
    include: { assessedBy: { select: { id: true, displayName: true } } },
  },
  clarifications: {
    orderBy: { requestedAt: 'desc' as const },
    include: {
      requestedBy: { select: { id: true, displayName: true } },
      respondedBy: { select: { id: true, displayName: true } },
    },
  },
} satisfies Prisma.BidReviewItemInclude;

export type BidReviewItemRecord = BidReviewItem & {
  bid: { id: string; submissionReference: string; status: string };
  tender: { id: string; referenceNumber: string; title: string };
  bidder: { id: string; legalName: string };
  requirement: { id: string; name: string; mandatory: boolean; requirementType: string } | null;
  document: { id: string; originalFilename: string; documentType: string; extractionStatus: string } | null;
  verification: {
    id: string;
    status: string;
    source: string;
    sourceDisplayName: string;
    sourceMode: string;
  } | null;
  crossVerification: {
    id: string;
    status: string;
    comparisonType: string;
    leftSourceDisplayName: string;
    rightSourceDisplayName: string;
    sourceBasis: string;
  } | null;
  openedBy: { id: string; displayName: string } | null;
  closedBy: { id: string; displayName: string } | null;
  assessments: Array<{
    id: string;
    assessment: ReviewAssessmentTypeName;
    note: string;
    attemptNumber: number;
    isLatest: boolean;
    assessedAt: Date;
    assessedBy: { id: string; displayName: string };
  }>;
  clarifications: Array<{
    id: string;
    message: string;
    status: ReviewClarificationStatusName;
    requestedAt: Date;
    response: string | null;
    respondedAt: Date | null;
    synthetic: boolean;
    requestedBy: { id: string; displayName: string };
    respondedBy: { id: string; displayName: string } | null;
  }>;
};

export interface CreateReviewItemRecord {
  id: string;
  fingerprint: string;
  bidSubmissionId: string;
  tenderId: string;
  bidderId: string;
  issueType: ReviewIssueTypeName;
  title: string;
  whyCreated: string;
  whyItMatters: string;
  inspectHint: string;
  actionHint: string;
  machineFinding: string;
  machineExplanation: string;
  mandatory: boolean;
  requirementId?: string | null;
  documentId?: string | null;
  verificationId?: string | null;
  crossVerificationId?: string | null;
  status?: ReviewItemStatusName;
}

export class BidReviewItemRepository {
  constructor(private readonly db: DbClient) {}

  async findById(id: string): Promise<BidReviewItemRecord | null> {
    try {
      return (await this.db.bidReviewItem.findUnique({
        where: { id },
        include: reviewInclude,
      })) as BidReviewItemRecord | null;
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async findByFingerprint(bidSubmissionId: string, fingerprint: string): Promise<BidReviewItem | null> {
    try {
      return await this.db.bidReviewItem.findUnique({
        where: { bidSubmissionId_fingerprint: { bidSubmissionId, fingerprint } },
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async create(input: CreateReviewItemRecord): Promise<BidReviewItem> {
    try {
      return await this.db.bidReviewItem.create({
        data: {
          id: input.id,
          fingerprint: input.fingerprint,
          bidSubmissionId: input.bidSubmissionId,
          tenderId: input.tenderId,
          bidderId: input.bidderId,
          issueType: input.issueType,
          status: input.status ?? 'open',
          title: input.title,
          whyCreated: input.whyCreated,
          whyItMatters: input.whyItMatters,
          inspectHint: input.inspectHint,
          actionHint: input.actionHint,
          machineFinding: input.machineFinding,
          machineExplanation: input.machineExplanation,
          mandatory: input.mandatory,
          requirementId: input.requirementId ?? null,
          documentId: input.documentId ?? null,
          verificationId: input.verificationId ?? null,
          crossVerificationId: input.crossVerificationId ?? null,
        },
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async updateStatus(
    id: string,
    data: {
      status: ReviewItemStatusName;
      openedAt?: Date | null;
      openedById?: string | null;
      closedAt?: Date | null;
      closedById?: string | null;
    },
  ): Promise<void> {
    try {
      await this.db.bidReviewItem.update({ where: { id }, data });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async list(query: ReviewListQuery): Promise<PaginatedResult<BidReviewItemRecord>> {
    const pagination = parsePagination(query);
    const where = this.where(query);
    const orderBy = query.sortOrder === 'asc' ? { createdAt: 'asc' as const } : { createdAt: 'desc' as const };
    try {
      const [items, totalItems] = await Promise.all([
        this.db.bidReviewItem.findMany({
          where,
          orderBy,
          skip: pagination.skip,
          take: pagination.take,
          include: reviewInclude,
        }),
        this.db.bidReviewItem.count({ where }),
      ]);
      return toPaginatedResult(items as BidReviewItemRecord[], pagination, totalItems);
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async listByBid(bidSubmissionId: string): Promise<BidReviewItemRecord[]> {
    try {
      return (await this.db.bidReviewItem.findMany({
        where: { bidSubmissionId },
        orderBy: { createdAt: 'desc' },
        include: reviewInclude,
      })) as BidReviewItemRecord[];
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async listByBidIds(bidSubmissionIds: string[]): Promise<BidReviewItemRecord[]> {
    if (bidSubmissionIds.length === 0) {
      return [];
    }
    try {
      return (await this.db.bidReviewItem.findMany({
        where: { bidSubmissionId: { in: bidSubmissionIds } },
        orderBy: { createdAt: 'desc' },
        include: reviewInclude,
      })) as BidReviewItemRecord[];
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async summarize(where: Prisma.BidReviewItemWhereInput = {}) {
    try {
      const [statusGroups, issueGroups, openClarifications] = await Promise.all([
        this.db.bidReviewItem.groupBy({ by: ['status'], where, _count: { _all: true } }),
        this.db.bidReviewItem.groupBy({ by: ['issueType'], where, _count: { _all: true } }),
        this.db.reviewClarification.count({ where: { status: 'requested', reviewItem: where } }),
      ]);
      return { statusGroups, issueGroups, openClarifications };
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async markAssessmentsNotLatest(reviewItemId: string): Promise<void> {
    try {
      await this.db.reviewAssessment.updateMany({
        where: { reviewItemId, isLatest: true },
        data: { isLatest: false },
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async latestAssessment(reviewItemId: string) {
    try {
      return await this.db.reviewAssessment.findFirst({
        where: { reviewItemId, isLatest: true },
        orderBy: { attemptNumber: 'desc' },
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async createAssessment(input: {
    id: string;
    reviewItemId: string;
    assessment: ReviewAssessmentTypeName;
    note: string;
    attemptNumber: number;
    assessedById: string;
  }) {
    try {
      return await this.db.reviewAssessment.create({
        data: { ...input, isLatest: true },
        include: { assessedBy: { select: { id: true, displayName: true } } },
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async openClarification(reviewItemId: string) {
    try {
      return await this.db.reviewClarification.findFirst({
        where: { reviewItemId, status: 'requested' },
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async createClarification(input: {
    id: string;
    reviewItemId: string;
    bidSubmissionId: string;
    message: string;
    requestedById: string;
  }) {
    try {
      return await this.db.reviewClarification.create({
        data: { ...input, status: 'requested', synthetic: true },
        include: {
          requestedBy: { select: { id: true, displayName: true } },
          respondedBy: { select: { id: true, displayName: true } },
        },
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async updateClarification(
    id: string,
    data: {
      status?: ReviewClarificationStatusName;
      response?: string | null;
      respondedById?: string | null;
      respondedAt?: Date | null;
      cancelledById?: string | null;
      cancelledAt?: Date | null;
    },
  ) {
    try {
      return await this.db.reviewClarification.update({
        where: { id },
        data,
        include: {
          requestedBy: { select: { id: true, displayName: true } },
          respondedBy: { select: { id: true, displayName: true } },
        },
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async findClarification(id: string) {
    try {
      return await this.db.reviewClarification.findUnique({
        where: { id },
        include: {
          requestedBy: { select: { id: true, displayName: true } },
          respondedBy: { select: { id: true, displayName: true } },
        },
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  private where(query: ReviewListQuery): Prisma.BidReviewItemWhereInput {
    const where: Prisma.BidReviewItemWhereInput = {};
    if (query.tenderId) where.tenderId = query.tenderId;
    if (query.bidId) where.bidSubmissionId = query.bidId;
    if (query.bidderId) where.bidderId = query.bidderId;
    if (query.status) where.status = query.status;
    if (query.issueType) where.issueType = query.issueType;
    if (query.mandatory !== undefined) where.mandatory = query.mandatory;
    if (query.verificationState) {
      where.verification = { status: query.verificationState };
    }
    if (query.crossCheckState) {
      where.crossVerification = { status: query.crossCheckState };
    }
    const search = query.q ?? query.search;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { bid: { submissionReference: { contains: search, mode: 'insensitive' } } },
        { tender: { referenceNumber: { contains: search, mode: 'insensitive' } } },
        { tender: { title: { contains: search, mode: 'insensitive' } } },
        { bidder: { legalName: { contains: search, mode: 'insensitive' } } },
      ];
    }
    return where;
  }
}
