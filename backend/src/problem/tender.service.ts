import type { AuditService } from '../audit/audit.service';
import { AUDIT_ACTIONS } from '../constants';
import { ConflictError, NotFoundError, ValidationError } from '../errors';
import type { AuditRepository } from '../repositories/audit.repository';
import type { BidSubmissionRepository } from '../repositories/bid-submission.repository';
import type { TenderRequirementRepository } from '../repositories/tender-requirement.repository';
import type { TenderRepository } from '../repositories/tender.repository';
import type { PaginatedResult } from '../repositories/query';
import type {
  CreateTenderBody,
  TenderListQuery,
  UpdateTenderBody,
} from './schemas';
import {
  activityTitle,
  emptyBidSummary,
  toBidSummary,
  toTenderDetail,
  toTenderListItem,
  toTenderRequirementView,
  type TenderActivityItem,
  type TenderDetail,
  type TenderFieldLocks,
  type TenderListItem,
  type TenderRequirementView,
} from './serialize';
import { assertTenderStatusTransition, isTerminalTenderStatus, TENDER_STATUS_ACTIONS } from './transitions';
import { BHARATBID_AUDIT_RESOURCES, type TenderStatusName } from './types';

export interface TenderServiceOptions {
  tenders: TenderRepository;
  requirements: TenderRequirementRepository;
  bids?: BidSubmissionRepository;
  audit?: AuditService | null;
  auditEvents?: AuditRepository | null;
}

export class TenderService {
  constructor(private readonly options: TenderServiceOptions) {}

  async list(query: TenderListQuery): Promise<PaginatedResult<TenderListItem>> {
    const result = await this.options.tenders.list(query);
    return { items: result.items.map(toTenderListItem), meta: result.meta };
  }

  async get(id: string): Promise<TenderDetail> {
    const tender = await this.options.tenders.findById(id);
    if (!tender) {
      throw new NotFoundError('Tender not found');
    }
    const [bidCounts, submittedCount] = await Promise.all([
      this.options.bids?.countByTenderGrouped(id) ?? Promise.resolve({}),
      this.options.bids?.countNonDraftBids(id) ?? Promise.resolve(0),
    ]);
    const bidSummary = this.options.bids ? toBidSummary(bidCounts) : emptyBidSummary();
    if (!this.options.bids) {
      bidSummary.total = tender._count.bids;
    }
    return toTenderDetail(tender, {
      bidSummary,
      fieldLocks: this.fieldLocks(tender.status, tender._count.bids, submittedCount),
      allowedStatusActions: [...TENDER_STATUS_ACTIONS[tender.status]],
    });
  }

  async create(input: CreateTenderBody, actorId?: string): Promise<TenderDetail> {
    const status = input.status ?? 'draft';
    try {
      const created = await this.options.tenders.create({
        referenceNumber: input.referenceNumber.trim(),
        title: input.title.trim(),
        description: input.description?.trim() || null,
        organizationName: input.organizationName,
        departmentName: input.departmentName,
        category: input.category,
        status,
        issueDate: input.issueDate,
        closingDate: input.closingDate,
        createdById: actorId ?? null,
      });
      await this.options.audit?.record({
        actorId,
        action: AUDIT_ACTIONS.TENDER_CREATED,
        resource: BHARATBID_AUDIT_RESOURCES.TENDER,
        resourceId: created.id,
        metadata: { referenceNumber: created.referenceNumber, status: created.status },
        status: 'succeeded',
      });
      return this.get(created.id);
    } catch (error) {
      if (error instanceof ConflictError) {
        throw new ConflictError('A tender with this reference number already exists');
      }
      throw error;
    }
  }

  async update(id: string, input: UpdateTenderBody, actorId?: string): Promise<TenderDetail> {
    const existing = await this.requireTender(id);
    const submittedCount = (await this.options.bids?.countNonDraftBids(id)) ?? 0;
    const locks = this.fieldLocks(existing.status, existing._count.bids, submittedCount);

    if (locks.all) {
      throw new ValidationError('This tender can no longer be edited', [
        { path: 'status', message: `Tenders in ${existing.status} status cannot be updated`, code: 'custom' },
      ]);
    }

    if (locks.closingDate && (input.closingDate || input.issueDate)) {
      throw new ValidationError('Schedule cannot be changed after bids have been received', [
        { path: 'closingDate', message: 'Closing and issue dates are locked after bid participation', code: 'custom' },
      ]);
    }

    if (existing.status !== 'draft' && input.issueDate) {
      throw new ValidationError('Issue date can only be changed while the tender is a draft', [
        { path: 'issueDate', message: 'Issue date is locked after the tender is opened', code: 'custom' },
      ]);
    }

    const issueDate = input.issueDate ?? existing.issueDate;
    const closingDate = input.closingDate ?? existing.closingDate;
    if (closingDate < issueDate) {
      throw new ValidationError('Closing date cannot be earlier than the issue date', [
        { path: 'closingDate', message: 'Closing date cannot be earlier than the issue date', code: 'custom' },
      ]);
    }

    const changed: string[] = Object.keys(input);
    await this.options.tenders.update(id, {
      ...input,
      description: input.description === undefined ? undefined : input.description?.trim() || null,
    });
    await this.options.audit?.record({
      actorId,
      action: AUDIT_ACTIONS.TENDER_UPDATED,
      resource: BHARATBID_AUDIT_RESOURCES.TENDER,
      resourceId: id,
      metadata: { referenceNumber: existing.referenceNumber, fields: changed },
      status: 'succeeded',
    });
    return this.get(id);
  }

  async updateStatus(id: string, status: TenderStatusName, actorId?: string): Promise<TenderDetail> {
    const existing = await this.requireTender(id);
    assertTenderStatusTransition(existing.status, status);
    await this.options.tenders.update(id, { status });
    await this.options.audit?.record({
      actorId,
      action: AUDIT_ACTIONS.TENDER_STATUS_CHANGED,
      resource: BHARATBID_AUDIT_RESOURCES.TENDER,
      resourceId: id,
      metadata: { from: existing.status, to: status, referenceNumber: existing.referenceNumber },
      status: 'succeeded',
    });
    return this.get(id);
  }

  async listRequirements(tenderId: string): Promise<TenderRequirementView[]> {
    await this.requireTender(tenderId);
    const items = await this.options.requirements.listByTender(tenderId);
    return items.map(toTenderRequirementView);
  }

  async createRequirement(
    tenderId: string,
    input: {
      name: string;
      description?: string | null;
      requirementType: TenderRequirementView['requirementType'];
      mandatory?: boolean;
      active?: boolean;
      sortOrder?: number;
    },
    actorId?: string,
  ): Promise<TenderRequirementView> {
    const tender = await this.requireTender(tenderId);
    if (isTerminalTenderStatus(tender.status)) {
      throw new ValidationError('Requirements cannot be added to this tender', [
        { path: 'tenderId', message: `Tenders in ${tender.status} status cannot gain new requirements`, code: 'custom' },
      ]);
    }
    const sortOrder = input.sortOrder ?? (await this.options.requirements.nextSortOrder(tenderId));
    const created = await this.options.requirements.create({
      tenderId,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      requirementType: input.requirementType,
      mandatory: input.mandatory ?? true,
      active: input.active ?? true,
      sortOrder,
    });
    await this.options.audit?.record({
      actorId,
      action: AUDIT_ACTIONS.TENDER_REQUIREMENT_CREATED,
      resource: BHARATBID_AUDIT_RESOURCES.TENDER_REQUIREMENT,
      resourceId: tenderId,
      metadata: {
        tenderId,
        requirementId: created.id,
        name: created.name,
        requirementType: created.requirementType,
      },
      status: 'succeeded',
    });
    return toTenderRequirementView(created);
  }

  async updateRequirement(
    tenderId: string,
    requirementId: string,
    input: {
      name?: string;
      description?: string | null;
      requirementType?: TenderRequirementView['requirementType'];
      mandatory?: boolean;
      active?: boolean;
      sortOrder?: number;
    },
    actorId?: string,
  ): Promise<TenderRequirementView> {
    const tender = await this.requireTender(tenderId);
    if (isTerminalTenderStatus(tender.status)) {
      throw new ValidationError('Requirements cannot be updated on this tender', [
        { path: 'tenderId', message: `Tenders in ${tender.status} status cannot change requirements`, code: 'custom' },
      ]);
    }
    const existing = await this.options.requirements.findById(requirementId);
    if (!existing || existing.tenderId !== tenderId) {
      throw new NotFoundError('Tender requirement not found');
    }
    const submittedCount = (await this.options.bids?.countNonDraftBids(tenderId)) ?? 0;
    const locks = this.fieldLocks(tender.status, tender._count.bids, submittedCount);
    if (locks.requirementCore && (input.requirementType !== undefined || input.mandatory !== undefined)) {
      throw new ValidationError('Mandatory flag and type are locked after bids have been submitted', [
        { path: 'mandatory', message: 'Core requirement configuration cannot change after bid submission', code: 'custom' },
      ]);
    }
    const updated = await this.options.requirements.update(requirementId, {
      ...input,
      description: input.description === undefined ? undefined : input.description?.trim() || null,
    });
    const action =
      input.active === true
        ? AUDIT_ACTIONS.TENDER_REQUIREMENT_ACTIVATED
        : input.active === false
          ? AUDIT_ACTIONS.TENDER_REQUIREMENT_DEACTIVATED
          : AUDIT_ACTIONS.TENDER_REQUIREMENT_UPDATED;
    await this.options.audit?.record({
      actorId,
      action,
      resource: BHARATBID_AUDIT_RESOURCES.TENDER_REQUIREMENT,
      resourceId: tenderId,
      metadata: { tenderId, requirementId, active: updated.active, fields: Object.keys(input) },
      status: 'succeeded',
    });
    return toTenderRequirementView(updated);
  }

  async setRequirementActive(
    tenderId: string,
    requirementId: string,
    active: boolean,
    actorId?: string,
  ): Promise<TenderRequirementView> {
    return this.updateRequirement(tenderId, requirementId, { active }, actorId);
  }

  async reorderRequirement(
    tenderId: string,
    requirementId: string,
    direction: 'up' | 'down',
    actorId?: string,
  ): Promise<TenderRequirementView[]> {
    const tender = await this.requireTender(tenderId);
    if (isTerminalTenderStatus(tender.status)) {
      throw new ValidationError('Requirements cannot be reordered on this tender', [
        { path: 'tenderId', message: `Tenders in ${tender.status} status cannot reorder requirements`, code: 'custom' },
      ]);
    }
    const items = await this.options.requirements.listByTender(tenderId);
    const index = items.findIndex((item) => item.id === requirementId);
    if (index < 0) {
      throw new NotFoundError('Tender requirement not found');
    }
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= items.length) {
      return items.map(toTenderRequirementView);
    }
    const current = items[index];
    const neighbor = items[swapIndex];
    await this.options.requirements.update(current.id, { sortOrder: neighbor.sortOrder });
    await this.options.requirements.update(neighbor.id, { sortOrder: current.sortOrder });
    await this.options.audit?.record({
      actorId,
      action: AUDIT_ACTIONS.TENDER_REQUIREMENT_REORDERED,
      resource: BHARATBID_AUDIT_RESOURCES.TENDER_REQUIREMENT,
      resourceId: tenderId,
      metadata: { tenderId, requirementId, direction },
      status: 'succeeded',
    });
    const reordered = await this.options.requirements.listByTender(tenderId);
    return reordered.map(toTenderRequirementView);
  }

  async listActivity(tenderId: string): Promise<TenderActivityItem[]> {
    await this.requireTender(tenderId);
    if (!this.options.auditEvents) {
      return [];
    }
    const events = await this.options.auditEvents.listByResourceId(tenderId, 40);
    return events.map((event) => ({
      id: event.id,
      action: event.action,
      title: activityTitle(event.action, event.metadata ?? event.request),
      actorName: event.actorName,
      timestamp: event.createdAt.toISOString(),
    }));
  }

  async overview(): Promise<{
    tenderCount: number;
    openTenderCount: number;
    underEvaluationCount: number;
  }> {
    const [tenderCount, openTenderCount, underEvaluationCount] = await Promise.all([
      this.options.tenders.countAll(),
      this.options.tenders.countByStatus('open'),
      this.options.tenders.countByStatus('under_evaluation'),
    ]);
    return { tenderCount, openTenderCount, underEvaluationCount };
  }

  private fieldLocks(status: TenderStatusName, bidCount: number, submittedCount: number): TenderFieldLocks {
    return {
      all: isTerminalTenderStatus(status),
      closingDate: status !== 'draft' && bidCount > 0,
      requirementCore: status !== 'draft' && submittedCount > 0,
    };
  }

  private async requireTender(id: string) {
    const tender = await this.options.tenders.findById(id);
    if (!tender) {
      throw new NotFoundError('Tender not found');
    }
    return tender;
  }
}
