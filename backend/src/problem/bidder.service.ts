import type { AuditService } from '../audit/audit.service';
import { AUDIT_ACTIONS } from '../constants';
import { ConflictError, NotFoundError } from '../errors';
import type { AuditRepository } from '../repositories/audit.repository';
import type { BidderRepository } from '../repositories/bidder.repository';
import type { PaginatedResult } from '../repositories/query';
import { blankToNull, normalizeIdentifier } from './identifiers';
import type { BidderListQuery, CreateBidderBody, UpdateBidderBody } from './schemas';
import {
  activityTitle,
  toBidderDetail,
  toBidderListItem,
  type TenderActivityItem,
  type BidderDetail,
  type BidderListItem,
} from './serialize';
import { BHARATBID_AUDIT_RESOURCES } from './types';

const DUPLICATE_BIDDER_MESSAGE = 'An existing bidder profile appears to use this identifier.';

export class BidderService {
  constructor(
    private readonly bidders: BidderRepository,
    private readonly audit?: AuditService | null,
    private readonly auditEvents?: AuditRepository | null,
  ) {}

  async list(query: BidderListQuery): Promise<PaginatedResult<BidderListItem>> {
    const result = await this.bidders.list(query);
    return { items: result.items.map(toBidderListItem), meta: result.meta };
  }

  async get(id: string): Promise<BidderDetail> {
    const bidder = await this.bidders.findByIdWithBids(id);
    if (!bidder) {
      throw new NotFoundError('Bidder not found');
    }
    return toBidderDetail(bidder);
  }

  async create(input: CreateBidderBody, actorId?: string): Promise<BidderDetail> {
    try {
      const created = await this.bidders.create({
        legalName: input.legalName.trim(),
        ...toBidderRecord(input),
      });
      await this.audit?.record({
        actorId,
        action: AUDIT_ACTIONS.BIDDER_CREATED,
        resource: BHARATBID_AUDIT_RESOURCES.BIDDER,
        resourceId: created.id,
        metadata: { legalName: created.legalName },
        status: 'succeeded',
      });
      return this.get(created.id);
    } catch (error) {
      if (error instanceof ConflictError) {
        throw new ConflictError(DUPLICATE_BIDDER_MESSAGE);
      }
      throw error;
    }
  }

  async update(id: string, input: UpdateBidderBody, actorId?: string): Promise<BidderDetail> {
    const existing = await this.bidders.findById(id);
    if (!existing) {
      throw new NotFoundError('Bidder not found');
    }
    try {
      await this.bidders.update(id, toBidderRecord(input));
      await this.audit?.record({
        actorId,
        action: AUDIT_ACTIONS.BIDDER_UPDATED,
        resource: BHARATBID_AUDIT_RESOURCES.BIDDER,
        resourceId: id,
        metadata: { legalName: existing.legalName, fields: Object.keys(input) },
        status: 'succeeded',
      });
      return this.get(id);
    } catch (error) {
      if (error instanceof ConflictError) {
        throw new ConflictError(DUPLICATE_BIDDER_MESSAGE);
      }
      throw error;
    }
  }

  async listActivity(id: string): Promise<TenderActivityItem[]> {
    await this.get(id);
    if (!this.auditEvents) {
      return [];
    }
    const events = await this.auditEvents.listByResourceId(id, 40);
    return events.map((event) => ({
      id: event.id,
      action: event.action,
      title: activityTitle(event.action, event.metadata ?? event.request),
      actorName: event.actorName,
      timestamp: event.createdAt.toISOString(),
    }));
  }

  async countAll(): Promise<number> {
    return this.bidders.countAll();
  }
}

function toBidderRecord(input: CreateBidderBody | UpdateBidderBody) {
  return {
    ...(input.legalName !== undefined ? { legalName: input.legalName.trim() } : {}),
    tradeName: input.tradeName === undefined ? undefined : blankToNull(input.tradeName),
    pan: input.pan === undefined ? undefined : normalizeIdentifier(input.pan),
    gstin: input.gstin === undefined ? undefined : normalizeIdentifier(input.gstin),
    cin: input.cin === undefined ? undefined : normalizeIdentifier(input.cin),
    udyamRegistrationNumber:
      input.udyamRegistrationNumber === undefined ? undefined : normalizeIdentifier(input.udyamRegistrationNumber),
    registeredAddress: input.registeredAddress === undefined ? undefined : blankToNull(input.registeredAddress),
    city: input.city === undefined ? undefined : blankToNull(input.city),
    state: input.state === undefined ? undefined : blankToNull(input.state),
    pincode: input.pincode === undefined ? undefined : blankToNull(input.pincode),
    contactName: input.contactName === undefined ? undefined : blankToNull(input.contactName),
    contactEmail: input.contactEmail === undefined ? undefined : blankToNull(input.contactEmail)?.toLowerCase() ?? null,
    contactPhone: input.contactPhone === undefined ? undefined : blankToNull(input.contactPhone),
  };
}
