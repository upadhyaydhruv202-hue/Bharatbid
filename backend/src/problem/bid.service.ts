import type { AuditService } from '../audit/audit.service';
import type { NotificationService } from '../notifications';
import { notifyProcurement } from './operations/notify';
import { AUDIT_ACTIONS } from '../constants';
import { ConflictError, NotFoundError, ValidationError } from '../errors';
import type { AuditRepository } from '../repositories/audit.repository';
import type { BidSubmissionRepository } from '../repositories/bid-submission.repository';
import type { BidderRepository } from '../repositories/bidder.repository';
import type { PaginatedResult } from '../repositories/query';
import type { TenderRepository } from '../repositories/tender.repository';
import type { BidListQuery } from './schemas';
import {
  activityTitle,
  toBidDetail,
  toBidListItem,
  type BidDetail,
  type BidListItem,
  type TenderActivityItem,
} from './serialize';
import { assertBidStatusTransition, canAcceptBids } from './transitions';
import { BHARATBID_AUDIT_RESOURCES, type BidSubmissionStatusName } from './types';

export class BidSubmissionService {
  constructor(
    private readonly bids: BidSubmissionRepository,
    private readonly tenders: TenderRepository,
    private readonly bidders: BidderRepository,
    private readonly audit?: AuditService | null,
    private readonly auditEvents?: AuditRepository | null,
    private readonly notifications?: NotificationService | null,
  ) {}

  async list(query: BidListQuery): Promise<PaginatedResult<BidListItem>> {
    const result = await this.bids.list(query);
    return { items: result.items.map(toBidListItem), meta: result.meta };
  }

  async get(id: string): Promise<BidDetail> {
    const bid = await this.bids.findById(id);
    if (!bid) {
      throw new NotFoundError('Bid submission not found');
    }
    return toBidDetail(bid);
  }

  async create(
    input: { tenderId: string; bidderId: string },
    actorId?: string,
  ): Promise<BidDetail> {
    const tender = await this.tenders.findById(input.tenderId);
    if (!tender) {
      throw new NotFoundError('Tender not found');
    }
    if (!canAcceptBids(tender.status)) {
      throw new ValidationError('Bids can only be created for open tenders', [
        { path: 'tenderId', message: `Tender is ${tender.status} and is not accepting bids`, code: 'custom' },
      ]);
    }

    const bidder = await this.bidders.findById(input.bidderId);
    if (!bidder) {
      throw new NotFoundError('Bidder not found');
    }

    const duplicate = await this.bids.findByTenderAndBidder(input.tenderId, input.bidderId);
    if (duplicate) {
      throw new ConflictError('This bidder already has a submission for the selected tender');
    }

    try {
      const created = await this.bids.create({
        tenderId: input.tenderId,
        bidderId: input.bidderId,
        submissionReference: await this.nextReference(tender.referenceNumber),
      });
      await this.audit?.record({
        actorId,
        action: AUDIT_ACTIONS.BID_CREATED,
        resource: BHARATBID_AUDIT_RESOURCES.BID,
        resourceId: created.id,
        metadata: { tenderId: input.tenderId, bidderId: input.bidderId, submissionReference: created.submissionReference },
        status: 'succeeded',
      });
      return this.get(created.id);
    } catch (error) {
      if (error instanceof ConflictError) {
        throw new ConflictError('This bidder already has a submission for the selected tender');
      }
      throw error;
    }
  }

  async updateDraft(
    id: string,
    input: { status?: BidSubmissionStatusName },
    actorId?: string,
  ): Promise<BidDetail> {
    const existing = await this.requireBid(id);
    if (existing.status !== 'draft') {
      throw new ValidationError('Only draft bid submissions can be updated', [
        { path: 'status', message: 'Submitted bids cannot be edited in this slice', code: 'custom' },
      ]);
    }
    if (input.status && input.status !== existing.status) {
      assertBidStatusTransition(existing.status, input.status);
      if (input.status === 'submitted') {
        return this.submit(id, actorId);
      }
      await this.bids.update(id, { status: input.status });
      await this.audit?.record({
        actorId,
        action: AUDIT_ACTIONS.BID_STATUS_CHANGED,
        resource: BHARATBID_AUDIT_RESOURCES.BID,
        resourceId: id,
        metadata: { from: existing.status, to: input.status, submissionReference: existing.submissionReference },
        status: 'succeeded',
      });
    } else {
      await this.audit?.record({
        actorId,
        action: AUDIT_ACTIONS.BID_UPDATED,
        resource: BHARATBID_AUDIT_RESOURCES.BID,
        resourceId: id,
        metadata: { submissionReference: existing.submissionReference },
        status: 'succeeded',
      });
    }
    return this.get(id);
  }

  async submit(id: string, actorId?: string): Promise<BidDetail> {
    const existing = await this.requireBid(id);
    assertBidStatusTransition(existing.status, 'submitted');
    const tender = await this.tenders.findById(existing.tenderId);
    if (!tender) {
      throw new NotFoundError('Tender not found');
    }
    if (!canAcceptBids(tender.status)) {
      throw new ValidationError('Bids can only be submitted while the tender is open', [
        { path: 'tenderId', message: `Tender is ${tender.status} and is not accepting bids`, code: 'custom' },
      ]);
    }
    await this.bids.update(id, { status: 'submitted', submittedAt: new Date() });
    await this.audit?.record({
      actorId,
      action: AUDIT_ACTIONS.BID_SUBMITTED,
      resource: BHARATBID_AUDIT_RESOURCES.BID,
      resourceId: id,
      metadata: { tenderId: existing.tenderId, bidderId: existing.bidderId, submissionReference: existing.submissionReference },
      status: 'succeeded',
    });
    await notifyProcurement(this.notifications, {
      userId: actorId,
      title: 'New bid submitted',
      body: `${existing.submissionReference} was submitted. DEMO / SYNTHETIC.`,
      href: `/bharatbid/bids/${id}`,
      entityType: 'bid',
      entityId: id,
    });
    return this.get(id);
  }

  async listActivity(id: string): Promise<TenderActivityItem[]> {
    await this.requireBid(id);
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
    return this.bids.countAll();
  }

  private async requireBid(id: string) {
    const bid = await this.bids.findById(id);
    if (!bid) {
      throw new NotFoundError('Bid submission not found');
    }
    return bid;
  }

  private async nextReference(tenderReference: string): Promise<string> {
    const slug = tenderReference.replace(/[^A-Za-z0-9]/g, '').slice(0, 12).toUpperCase() || 'TENDER';
    const prefix = `BID-${slug}-`;
    const count = await this.bids.countReferencePrefix(prefix);
    return `${prefix}${String(count + 1).padStart(4, '0')}`;
  }
}
