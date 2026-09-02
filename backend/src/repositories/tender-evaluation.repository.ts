import type {
  EvaluationDecision,
  EvaluationNote,
  Prisma,
  TenderEvaluation,
} from '@prisma/client';

import { mapPrismaError } from '../lib/prisma-error';
import { parsePagination, toPaginatedResult, type PaginatedResult } from './query';
import type { DbClient } from './types';
import { EVALUABLE_BID_STATUSES, type TenderEvaluationStatusName } from '../problem/evaluation/types';
import type { EvaluationListQuery } from '../problem/schemas';
import type { BidSubmissionStatusName } from '../problem/types';

const actorSelect = { select: { id: true, displayName: true } } as const;

const evaluationInclude = {
  tender: {
    select: {
      id: true,
      referenceNumber: true,
      title: true,
      organizationName: true,
      departmentName: true,
      category: true,
      status: true,
      closingDate: true,
    },
  },
  startedBy: actorSelect,
  readyBy: actorSelect,
  recordedBy: actorSelect,
} satisfies Prisma.TenderEvaluationInclude;

const noteInclude = {
  createdBy: actorSelect,
  bid: { select: { id: true, submissionReference: true } },
} satisfies Prisma.EvaluationNoteInclude;

const decisionInclude = {
  decidedBy: actorSelect,
  bid: { select: { id: true, submissionReference: true, tenderId: true } },
} satisfies Prisma.EvaluationDecisionInclude;

export type TenderEvaluationRecord = TenderEvaluation & {
  tender: {
    id: string;
    referenceNumber: string;
    title: string;
    organizationName: string;
    departmentName: string;
    category: string;
    status: string;
    closingDate: Date;
  };
  startedBy: { id: string; displayName: string } | null;
  readyBy: { id: string; displayName: string } | null;
  recordedBy: { id: string; displayName: string } | null;
};

export type EvaluationNoteRecord = EvaluationNote & {
  createdBy: { id: string; displayName: string };
  bid: { id: string; submissionReference: string } | null;
};

export type EvaluationDecisionRecord = EvaluationDecision & {
  decidedBy: { id: string; displayName: string };
  bid: { id: string; submissionReference: string; tenderId: string };
};

export type EvaluationTenderListRecord = {
  id: string;
  referenceNumber: string;
  title: string;
  organizationName: string;
  departmentName: string;
  category: string;
  status: string;
  closingDate: Date;
  evaluation: TenderEvaluation | null;
  _count: { bids: number; requirements: number };
};

export class TenderEvaluationRepository {
  constructor(private readonly db: DbClient) {}

  async create(tenderId: string): Promise<TenderEvaluationRecord> {
    try {
      return await this.db.tenderEvaluation.create({
        data: { tenderId, status: 'not_started' },
        include: evaluationInclude,
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async findById(id: string): Promise<TenderEvaluationRecord | null> {
    try {
      return await this.db.tenderEvaluation.findUnique({
        where: { id },
        include: evaluationInclude,
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async findByTenderId(tenderId: string): Promise<TenderEvaluationRecord | null> {
    try {
      return await this.db.tenderEvaluation.findUnique({
        where: { tenderId },
        include: evaluationInclude,
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async updateStatus(
    id: string,
    data: {
      status: TenderEvaluationStatusName;
      startedAt?: Date | null;
      startedById?: string | null;
      readyAt?: Date | null;
      readyById?: string | null;
      recordedAt?: Date | null;
      recordedById?: string | null;
    },
  ): Promise<TenderEvaluationRecord> {
    try {
      return await this.db.tenderEvaluation.update({
        where: { id },
        data,
        include: evaluationInclude,
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async listTenders(query: EvaluationListQuery): Promise<PaginatedResult<EvaluationTenderListRecord>> {
    const pagination = parsePagination(query);
    const where: Prisma.TenderWhereInput = {
      bids: { some: { status: { in: [...EVALUABLE_BID_STATUSES] } } },
    };
    if (query.status) {
      where.status = query.status;
    }
    if (query.category) {
      where.category = query.category;
    }
    const search = query.q ?? query.search;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { referenceNumber: { contains: search, mode: 'insensitive' } },
        { organizationName: { contains: search, mode: 'insensitive' } },
      ];
    }
    try {
      const [items, totalItems] = await Promise.all([
        this.db.tender.findMany({
          where,
          orderBy: [{ closingDate: 'desc' }],
          skip: pagination.skip,
          take: pagination.take,
          select: {
            id: true,
            referenceNumber: true,
            title: true,
            organizationName: true,
            departmentName: true,
            category: true,
            status: true,
            closingDate: true,
            evaluation: true,
            _count: {
              select: {
                bids: { where: { status: { in: [...EVALUABLE_BID_STATUSES] } } },
                requirements: true,
              },
            },
          },
        }),
        this.db.tender.count({ where }),
      ]);
      return toPaginatedResult(items, pagination, totalItems);
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async listNotes(evaluationId: string, bidSubmissionId?: string): Promise<EvaluationNoteRecord[]> {
    try {
      return await this.db.evaluationNote.findMany({
        where: { evaluationId, ...(bidSubmissionId ? { bidSubmissionId } : {}) },
        orderBy: { createdAt: 'desc' },
        include: noteInclude,
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async latestNote(evaluationId: string, bidSubmissionId: string | null): Promise<EvaluationNote | null> {
    try {
      return await this.db.evaluationNote.findFirst({
        where: bidSubmissionId
          ? { evaluationId, bidSubmissionId, isLatest: true }
          : { evaluationId, bidSubmissionId: null, isLatest: true },
        orderBy: { attemptNumber: 'desc' },
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async createNote(input: {
    id: string;
    evaluationId: string;
    bidSubmissionId?: string | null;
    note: string;
    attemptNumber: number;
    createdById: string;
  }): Promise<EvaluationNoteRecord> {
    try {
      const bidFilter = input.bidSubmissionId
        ? { evaluationId: input.evaluationId, bidSubmissionId: input.bidSubmissionId, isLatest: true }
        : { evaluationId: input.evaluationId, bidSubmissionId: null, isLatest: true };
      await this.db.evaluationNote.updateMany({
        where: bidFilter,
        data: { isLatest: false },
      });
      return await this.db.evaluationNote.create({
        data: {
          id: input.id,
          evaluationId: input.evaluationId,
          bidSubmissionId: input.bidSubmissionId ?? null,
          note: input.note,
          attemptNumber: input.attemptNumber,
          isLatest: true,
          createdById: input.createdById,
        },
        include: noteInclude,
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async listDecisions(evaluationId: string, bidSubmissionId?: string): Promise<EvaluationDecisionRecord[]> {
    try {
      return await this.db.evaluationDecision.findMany({
        where: { evaluationId, ...(bidSubmissionId ? { bidSubmissionId } : {}) },
        orderBy: { decidedAt: 'desc' },
        include: decisionInclude,
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async countByStatus(tenderId?: string): Promise<Record<string, number>> {
    try {
      const groups = await this.db.tenderEvaluation.groupBy({
        by: ['status'],
        where: tenderId ? { tenderId } : undefined,
        _count: { _all: true },
      });
      const counts: Record<string, number> = {};
      for (const group of groups) {
        counts[group.status] = group._count._all;
      }
      return counts;
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async countEvaluableTenders(tenderId?: string): Promise<number> {
    try {
      const rows = await this.db.bidSubmission.findMany({
        where: {
          status: { in: [...EVALUABLE_BID_STATUSES] as BidSubmissionStatusName[] },
          ...(tenderId ? { tenderId } : {}),
        },
        distinct: ['tenderId'],
        select: { tenderId: true },
      });
      return rows.length;
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async countEvaluations(tenderId?: string): Promise<number> {
    try {
      return await this.db.tenderEvaluation.count({ where: tenderId ? { tenderId } : undefined });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async latestDecision(evaluationId: string, bidSubmissionId: string): Promise<EvaluationDecision | null> {
    try {
      return await this.db.evaluationDecision.findFirst({
        where: { evaluationId, bidSubmissionId, isLatest: true },
        orderBy: { attemptNumber: 'desc' },
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async createDecision(input: {
    id: string;
    evaluationId: string;
    bidSubmissionId: string;
    decision: string;
    reason: string;
    attemptNumber: number;
    decidedById: string;
  }): Promise<EvaluationDecisionRecord> {
    try {
      await this.db.evaluationDecision.updateMany({
        where: { evaluationId: input.evaluationId, bidSubmissionId: input.bidSubmissionId, isLatest: true },
        data: { isLatest: false },
      });
      return await this.db.evaluationDecision.create({
        data: {
          ...input,
          decision: input.decision as EvaluationDecision['decision'],
          isLatest: true,
        },
        include: decisionInclude,
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }
}

export const EVALUABLE_STATUSES = EVALUABLE_BID_STATUSES as unknown as BidSubmissionStatusName[];
