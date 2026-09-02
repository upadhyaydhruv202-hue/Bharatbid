import { Prisma, type BidCrossVerification } from '@prisma/client';

import { mapPrismaError } from '../lib/prisma-error';
import type { DbClient } from './types';
import type {
  CrossComparisonTypeName,
  CrossSourceBasisName,
  CrossVerificationStatusName,
} from '../problem/intelligence/types';
import type { VerificationSourceModeName, VerificationSourceName } from '../problem/verification/types';

export type BidCrossVerificationRecord = BidCrossVerification & {
  requestedBy: { id: string; displayName: string } | null;
};

export interface CreateCrossVerificationRecord {
  id: string;
  bidSubmissionId: string;
  bidderId: string;
  leftVerificationId: string;
  rightVerificationId: string;
  comparisonType: CrossComparisonTypeName;
  status: CrossVerificationStatusName;
  sourceBasis: CrossSourceBasisName;
  leftSource: VerificationSourceName;
  rightSource: VerificationSourceName;
  leftSourceMode: VerificationSourceModeName;
  rightSourceMode: VerificationSourceModeName;
  leftSourceDisplayName: string;
  rightSourceDisplayName: string;
  fieldComparisons: Prisma.InputJsonValue;
  explanation: string;
  groupId: string;
  attemptNumber: number;
  isLatest: boolean;
  requestedAt?: Date;
  completedAt?: Date | null;
  requestedById?: string | null;
}

export class BidCrossVerificationRepository {
  constructor(private readonly db: DbClient) {}

  async create(input: CreateCrossVerificationRecord): Promise<BidCrossVerificationRecord> {
    try {
      return await this.db.bidCrossVerification.create({
        data: input,
        include: { requestedBy: { select: { id: true, displayName: true } } },
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async findById(id: string): Promise<BidCrossVerificationRecord | null> {
    try {
      return await this.db.bidCrossVerification.findUnique({
        where: { id },
        include: { requestedBy: { select: { id: true, displayName: true } } },
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async list(bidSubmissionId: string, latestOnly = true): Promise<BidCrossVerificationRecord[]> {
    try {
      return await this.db.bidCrossVerification.findMany({
        where: { bidSubmissionId, ...(latestOnly ? { isLatest: true } : {}) },
        orderBy: { requestedAt: 'desc' },
        include: { requestedBy: { select: { id: true, displayName: true } } },
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async listLatestByBidIds(bidSubmissionIds: string[]): Promise<
    Array<{
      id: string;
      bidSubmissionId: string;
      comparisonType: string;
      status: string;
      leftSource: string;
      rightSource: string;
    }>
  > {
    if (bidSubmissionIds.length === 0) {
      return [];
    }
    try {
      return await this.db.bidCrossVerification.findMany({
        where: { bidSubmissionId: { in: bidSubmissionIds }, isLatest: true },
        select: {
          id: true,
          bidSubmissionId: true,
          comparisonType: true,
          status: true,
          leftSource: true,
          rightSource: true,
        },
        orderBy: { requestedAt: 'desc' },
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async listByGroup(groupId: string): Promise<BidCrossVerificationRecord[]> {
    try {
      return await this.db.bidCrossVerification.findMany({
        where: { groupId },
        orderBy: { attemptNumber: 'desc' },
        include: { requestedBy: { select: { id: true, displayName: true } } },
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async findLatestSame(input: {
    bidSubmissionId: string;
    comparisonType: CrossComparisonTypeName;
    leftVerificationId: string;
    rightVerificationId: string;
  }): Promise<BidCrossVerificationRecord | null> {
    try {
      return await this.db.bidCrossVerification.findFirst({
        where: {
          bidSubmissionId: input.bidSubmissionId,
          comparisonType: input.comparisonType,
          OR: [
            { leftVerificationId: input.leftVerificationId, rightVerificationId: input.rightVerificationId },
            { leftVerificationId: input.rightVerificationId, rightVerificationId: input.leftVerificationId },
          ],
        },
        orderBy: { requestedAt: 'desc' },
        include: { requestedBy: { select: { id: true, displayName: true } } },
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async findLatestByType(
    bidSubmissionId: string,
    comparisonType: CrossComparisonTypeName,
  ): Promise<BidCrossVerificationRecord | null> {
    try {
      return await this.db.bidCrossVerification.findFirst({
        where: { bidSubmissionId, comparisonType, isLatest: true },
        orderBy: { requestedAt: 'desc' },
        include: { requestedBy: { select: { id: true, displayName: true } } },
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async markTypeNotLatest(bidSubmissionId: string, comparisonType: CrossComparisonTypeName): Promise<void> {
    try {
      await this.db.bidCrossVerification.updateMany({
        where: { bidSubmissionId, comparisonType, isLatest: true },
        data: { isLatest: false },
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }
}
