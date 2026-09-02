import type { Prisma, Bidder, BidSubmission, Tender } from '@prisma/client';

import { mapPrismaError } from '../lib/prisma-error';
import { parsePagination, toPaginatedResult, type PaginatedResult } from './query';
import type { DbClient } from './types';
import { isValidGstin, isValidPan, normalizeIdentifier } from '../problem/identifiers';
import type { BidderListQuery } from '../problem/schemas';

export interface CreateBidderRecord {
  legalName: string;
  tradeName?: string | null;
  pan?: string | null;
  gstin?: string | null;
  cin?: string | null;
  udyamRegistrationNumber?: string | null;
  registeredAddress?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
}

export type BidderDetailRecord = Bidder & {
  bids: Array<BidSubmission & { tender: Pick<Tender, 'id' | 'referenceNumber' | 'title' | 'category'> }>;
};

export type BidderListRecord = Bidder & {
  tenderCount: number;
  activeBidCount: number;
  lastParticipationAt: Date | null;
};

export class BidderRepository {
  constructor(private readonly db: DbClient) {}

  async create(input: CreateBidderRecord): Promise<Bidder> {
    try {
      return await this.db.bidder.create({ data: input });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async update(id: string, data: Partial<CreateBidderRecord>): Promise<Bidder> {
    try {
      return await this.db.bidder.update({ where: { id }, data });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async findById(id: string): Promise<Bidder | null> {
    try {
      return await this.db.bidder.findUnique({ where: { id } });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async findByIdWithBids(id: string): Promise<BidderDetailRecord | null> {
    try {
      return await this.db.bidder.findUnique({
        where: { id },
        include: {
          bids: {
            orderBy: { createdAt: 'desc' },
            include: {
              tender: { select: { id: true, referenceNumber: true, title: true, category: true } },
            },
          },
        },
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async list(query: BidderListQuery): Promise<PaginatedResult<BidderListRecord>> {
    const pagination = parsePagination(query);
    const search = query.q ?? query.search;
    const where: Prisma.BidderWhereInput = {};
    const and: Prisma.BidderWhereInput[] = [];

    if (query.state) {
      and.push({ state: { equals: query.state, mode: 'insensitive' } });
    }
    if (query.city) {
      and.push({ city: { equals: query.city, mode: 'insensitive' } });
    }
    if (query.hasUdyam === true) {
      and.push({ udyamRegistrationNumber: { not: null } });
    } else if (query.hasUdyam === false) {
      and.push({ udyamRegistrationNumber: null });
    }
    if (query.completeness === 'complete') {
      and.push({
        pan: { not: null },
        gstin: { not: null },
        city: { not: null },
        state: { not: null },
        contactEmail: { not: null },
      });
    } else if (query.completeness === 'incomplete') {
      and.push({
        OR: [{ pan: null }, { gstin: null }, { city: null }, { state: null }, { contactEmail: null }],
      });
    }
    if (search) {
      const identifier = normalizeIdentifier(search);
      const searchOr: Prisma.BidderWhereInput[] = [
        { legalName: { contains: search, mode: 'insensitive' } },
        { tradeName: { contains: search, mode: 'insensitive' } },
        { contactEmail: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
        { state: { contains: search, mode: 'insensitive' } },
      ];
      if (identifier && isValidPan(identifier)) {
        searchOr.push({ pan: identifier });
      }
      if (identifier && isValidGstin(identifier)) {
        searchOr.push({ gstin: identifier });
      }
      and.push({ OR: searchOr });
    }
    if (and.length > 0) {
      where.AND = and;
    }

    try {
      const [items, totalItems] = await Promise.all([
        this.db.bidder.findMany({
          where,
          orderBy: { legalName: 'asc' },
          skip: pagination.skip,
          take: pagination.take,
        }),
        this.db.bidder.count({ where }),
      ]);
      const stats = await this.participationStats(items.map((item) => item.id));
      return toPaginatedResult(
        items.map((item) => ({
          ...item,
          tenderCount: stats[item.id]?.tenderCount ?? 0,
          activeBidCount: stats[item.id]?.activeBidCount ?? 0,
          lastParticipationAt: stats[item.id]?.lastParticipationAt ?? null,
        })),
        pagination,
        totalItems,
      );
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async countAll(): Promise<number> {
    try {
      return await this.db.bidder.count();
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async searchByName(q: string, take = 5): Promise<Array<{ id: string; legalName: string; tradeName: string | null }>> {
    try {
      return await this.db.bidder.findMany({
        where: {
          OR: [
            { legalName: { contains: q, mode: 'insensitive' } },
            { tradeName: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: { id: true, legalName: true, tradeName: true },
        orderBy: { legalName: 'asc' },
        take,
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  private async participationStats(ids: string[]) {
    const empty: Record<string, { tenderCount: number; activeBidCount: number; lastParticipationAt: Date | null }> = {};
    if (ids.length === 0) {
      return empty;
    }
    try {
      const [statusGroups, tenderPairs] = await Promise.all([
        this.db.bidSubmission.groupBy({
          by: ['bidderId', 'status'],
          where: { bidderId: { in: ids } },
          _count: { _all: true },
          _max: { submittedAt: true, createdAt: true },
        }),
        this.db.bidSubmission.groupBy({
          by: ['bidderId', 'tenderId'],
          where: { bidderId: { in: ids } },
        }),
      ]);
      for (const id of ids) {
        empty[id] = { tenderCount: 0, activeBidCount: 0, lastParticipationAt: null };
      }
      for (const pair of tenderPairs) {
        empty[pair.bidderId].tenderCount += 1;
      }
      for (const group of statusGroups) {
        const current = empty[group.bidderId];
        if (group.status !== 'withdrawn' && group.status !== 'finalized') {
          current.activeBidCount += group._count._all;
        }
        const latest = group._max.submittedAt ?? group._max.createdAt;
        if (latest && (!current.lastParticipationAt || latest > current.lastParticipationAt)) {
          current.lastParticipationAt = latest;
        }
      }
      return empty;
    } catch (error) {
      mapPrismaError(error);
    }
  }
}
