import { randomUUID } from 'node:crypto';

import type { AuditService } from '../audit/audit.service';
import { AUDIT_ACTIONS } from '../constants';
import { ConflictError, NotFoundError, ValidationError } from '../errors';
import type { NotificationService } from '../notifications';
import { notifyProcurement } from './operations/notify';
import type { AuditRepository } from '../repositories/audit.repository';
import type { BidReviewItemRecord, BidReviewItemRepository } from '../repositories/bid-review-item.repository';
import type { BidSubmissionRepository } from '../repositories/bid-submission.repository';
import { BHARATBID_AUDIT_RESOURCES } from './types';
import type { BidIntelligenceService } from './intelligence.service';
import { candidatesFromIntelligence } from './review/candidates';
import { assertReviewTransition, nextStatusForAssessment } from './review/lifecycle';
import { assertClarificationMessage, assertOfficerNote } from './review/notes';
import {
  DEMO_CLARIFICATION_ADVISORY,
  DEMO_REVIEW_ADVISORY,
  REVIEW_ISSUE_LABELS,
  type ReviewIssueTypeName,
} from './review/types';
import type { CreateReviewAssessmentBody, CreateReviewClarificationBody, ReviewListQuery } from './schemas';
import { activityTitle, type TenderActivityItem } from './serialize';

export class BidReviewService {
  constructor(
    private readonly reviews: BidReviewItemRepository,
    private readonly bids: BidSubmissionRepository,
    private readonly intelligence: BidIntelligenceService,
    private readonly audit?: AuditService | null,
    private readonly auditEvents?: AuditRepository | null,
    private readonly notifications?: NotificationService | null,
  ) {}

  async list(query: ReviewListQuery) {
    const result = await this.reviews.list(query);
    return {
      items: result.items.map((row) => this.toListItem(row)),
      meta: result.meta,
    };
  }

  async summary(tenderId?: string) {
    const { statusGroups, issueGroups, openClarifications } = await this.reviews.summarize(
      tenderId ? { tenderId } : {},
    );
    const statuses: Record<string, number> = {
      open: 0,
      in_review: 0,
      clarification_requested: 0,
      assessed: 0,
      closed: 0,
    };
    for (const group of statusGroups) {
      statuses[group.status] = group._count._all;
    }
    const issues: Record<string, number> = {};
    for (const type of Object.keys(REVIEW_ISSUE_LABELS) as ReviewIssueTypeName[]) {
      issues[type] = 0;
    }
    for (const group of issueGroups) {
      issues[group.issueType] = group._count._all;
    }
    return {
      statuses,
      issues,
      openClarifications,
      advisory: DEMO_REVIEW_ADVISORY,
    };
  }

  async listForBid(bidId: string, actorId?: string) {
    await this.syncBid(bidId, actorId);
    const rows = await this.reviews.listByBid(bidId);
    return {
      items: rows.map((row) => this.toListItem(row)),
      summary: this.bidSummary(rows),
      advisory: DEMO_REVIEW_ADVISORY,
    };
  }

  async get(id: string, actorId?: string) {
    const row = await this.require(id);
    await this.audit?.record({
      actorId,
      action: AUDIT_ACTIONS.REVIEW_OPENED,
      resource: BHARATBID_AUDIT_RESOURCES.BID,
      resourceId: row.bidSubmissionId,
      metadata: { reviewItemId: row.id, issueType: row.issueType, actor: 'officer' },
      status: 'succeeded',
    });
    return this.toDetail(row);
  }

  async getForBid(bidId: string, id: string, actorId?: string) {
    const row = await this.require(id);
    if (row.bidSubmissionId !== bidId) {
      throw new NotFoundError('Review item not found');
    }
    return this.get(id, actorId);
  }

  async listAssessments(id: string) {
    return this.toDetail(await this.require(id)).assessments;
  }

  async listClarifications(id: string) {
    return this.toDetail(await this.require(id)).clarifications;
  }

  async start(id: string, actorId: string) {
    const row = await this.require(id);
    assertReviewTransition(row.status, 'in_review', 'start');
    await this.reviews.updateStatus(row.id, {
      status: 'in_review',
      openedAt: row.openedAt ?? new Date(),
      openedById: row.openedById ?? actorId,
    });
    await this.audit?.record({
      actorId,
      action: AUDIT_ACTIONS.REVIEW_STARTED,
      resource: BHARATBID_AUDIT_RESOURCES.BID,
      resourceId: row.bidSubmissionId,
      metadata: { reviewItemId: row.id, actor: 'officer' },
      status: 'succeeded',
    });
    await this.notify(
      actorId,
      'Review started',
      'Officer review is in progress. DEMO / SYNTHETIC — this is not an award or rejection.',
      `/bharatbid/review/${row.id}`,
      row.id,
    );
    return this.toDetail(await this.require(id));
  }

  async close(id: string, actorId: string) {
    const row = await this.require(id);
    assertReviewTransition(row.status, 'closed', 'close');
    await this.reviews.updateStatus(row.id, {
      status: 'closed',
      closedAt: new Date(),
      closedById: actorId,
    });
    await this.audit?.record({
      actorId,
      action: AUDIT_ACTIONS.REVIEW_CLOSED,
      resource: BHARATBID_AUDIT_RESOURCES.BID,
      resourceId: row.bidSubmissionId,
      metadata: { reviewItemId: row.id, actor: 'officer' },
      status: 'succeeded',
    });
    return this.toDetail(await this.require(id));
  }

  async assess(id: string, input: CreateReviewAssessmentBody, actorId: string) {
    const row = await this.require(id);
    if (row.status === 'closed') {
      throw new ValidationError('Closed review items cannot be assessed', [
        { path: 'status', message: 'Open a new review cycle instead of editing a closed item', code: 'custom' },
      ]);
    }
    const note = assertOfficerNote(input.assessment, input.note);
    const nextStatus = nextStatusForAssessment(row.status, input.assessment);
    const previous = await this.reviews.latestAssessment(row.id);
    if (previous) {
      await this.reviews.markAssessmentsNotLatest(row.id);
    }
    const created = await this.reviews.createAssessment({
      id: randomUUID(),
      reviewItemId: row.id,
      assessment: input.assessment,
      note,
      attemptNumber: (previous?.attemptNumber ?? 0) + 1,
      assessedById: actorId,
    });
    await this.reviews.updateStatus(row.id, {
      status: nextStatus,
      openedAt: row.openedAt ?? new Date(),
      openedById: row.openedById ?? actorId,
    });
    await this.audit?.record({
      actorId,
      action: previous ? AUDIT_ACTIONS.REVIEW_ASSESSMENT_UPDATED : AUDIT_ACTIONS.REVIEW_ASSESSMENT_CREATED,
      resource: BHARATBID_AUDIT_RESOURCES.BID,
      resourceId: row.bidSubmissionId,
      metadata: {
        reviewItemId: row.id,
        assessment: input.assessment,
        attemptNumber: created.attemptNumber,
        actor: 'officer',
        previousAssessment: previous?.assessment,
      },
      oldValue: previous ? { assessment: previous.assessment, attemptNumber: previous.attemptNumber } : undefined,
      newValue: { assessment: created.assessment, attemptNumber: created.attemptNumber },
      status: 'succeeded',
    });
    return this.toDetail(await this.require(id));
  }

  async requestClarification(id: string, input: CreateReviewClarificationBody, actorId: string) {
    const row = await this.require(id);
    if (row.status === 'closed') {
      throw new ValidationError('Closed review items cannot request clarification', [
        { path: 'status', message: 'Closed items are not eligible', code: 'custom' },
      ]);
    }
    assertReviewTransition(row.status, 'clarification_requested', 'clarify');
    const existing = await this.reviews.openClarification(row.id);
    if (existing) {
      throw new ConflictError('A clarification is already requested for this review item');
    }
    const combined = [input.reason, input.requiredInformation, input.message]
      .map((part) => (typeof part === 'string' ? part.trim() : ''))
      .filter(Boolean)
      .join('\n\n');
    const message = assertClarificationMessage(combined || input.message);
    const created = await this.reviews.createClarification({
      id: randomUUID(),
      reviewItemId: row.id,
      bidSubmissionId: row.bidSubmissionId,
      message,
      requestedById: actorId,
    });
    await this.reviews.updateStatus(row.id, {
      status: 'clarification_requested',
      openedAt: row.openedAt ?? new Date(),
      openedById: row.openedById ?? actorId,
    });
    await this.audit?.record({
      actorId,
      action: AUDIT_ACTIONS.CLARIFICATION_REQUESTED,
      resource: BHARATBID_AUDIT_RESOURCES.BID,
      resourceId: row.bidSubmissionId,
      metadata: { reviewItemId: row.id, clarificationId: created.id, actor: 'officer' },
      status: 'succeeded',
    });
    await this.notify(
      actorId,
      'Clarification stored (in-app)',
      'A clarification request was recorded. No bidder email or government message was sent.',
      `/bharatbid/review/${row.id}`,
      row.id,
    );
    return this.toDetail(await this.require(id));
  }

  async respondClarification(reviewId: string, clarificationId: string, response: string, actorId: string) {
    const row = await this.require(reviewId);
    const clarification = await this.reviews.findClarification(clarificationId);
    if (!clarification || clarification.reviewItemId !== row.id) {
      throw new NotFoundError('Clarification not found');
    }
    if (clarification.status !== 'requested') {
      throw new ValidationError('Only requested clarifications can receive a demo response', [
        { path: 'status', message: `Current status is ${clarification.status}`, code: 'custom' },
      ]);
    }
    const note = assertClarificationMessage(response);
    assertReviewTransition(row.status, 'in_review', 'respond');
    await this.reviews.updateClarification(clarification.id, {
      status: 'responded',
      response: `${note}\n\nDEMO / SYNTHETIC response. This does not represent a real bidder message.`,
      respondedById: actorId,
      respondedAt: new Date(),
    });
    await this.reviews.updateStatus(row.id, { status: 'in_review' });
    await this.audit?.record({
      actorId,
      action: AUDIT_ACTIONS.CLARIFICATION_RESPONDED,
      resource: BHARATBID_AUDIT_RESOURCES.BID,
      resourceId: row.bidSubmissionId,
      metadata: { reviewItemId: row.id, clarificationId: clarification.id, actor: 'officer', synthetic: true },
      status: 'succeeded',
    });
    await this.notify(
      clarification.requestedById,
      'DEMO clarification response recorded',
      'A synthetic in-app response was stored. No real bidder was contacted.',
      `/bharatbid/review/${row.id}`,
      row.id,
    );
    return this.toDetail(await this.require(reviewId));
  }

  async cancelClarification(reviewId: string, clarificationId: string, actorId: string) {
    const row = await this.require(reviewId);
    const clarification = await this.reviews.findClarification(clarificationId);
    if (!clarification || clarification.reviewItemId !== row.id) {
      throw new NotFoundError('Clarification not found');
    }
    if (clarification.status !== 'requested') {
      throw new ValidationError('Only requested clarifications can be cancelled', [
        { path: 'status', message: `Current status is ${clarification.status}`, code: 'custom' },
      ]);
    }
    await this.reviews.updateClarification(clarification.id, {
      status: 'cancelled',
      cancelledById: actorId,
      cancelledAt: new Date(),
    });
    await this.reviews.updateStatus(row.id, { status: 'in_review' });
    await this.audit?.record({
      actorId,
      action: AUDIT_ACTIONS.CLARIFICATION_CANCELLED,
      resource: BHARATBID_AUDIT_RESOURCES.BID,
      resourceId: row.bidSubmissionId,
      metadata: { reviewItemId: row.id, clarificationId: clarification.id, actor: 'officer' },
      status: 'succeeded',
    });
    return this.toDetail(await this.require(reviewId));
  }

  async listActivity(id: string): Promise<TenderActivityItem[]> {
    const row = await this.require(id);
    if (!this.auditEvents) {
      return [];
    }
    const events = await this.auditEvents.listByResourceId(row.bidSubmissionId, 80);
    return events
      .filter((event) => {
        const meta = event.metadata ?? event.request;
        return Boolean(meta && typeof meta === 'object' && (meta as { reviewItemId?: string }).reviewItemId === id);
      })
      .map((event) => ({
        id: event.id,
        action: event.action,
        title: activityTitle(event.action, event.metadata ?? event.request),
        actorName: event.actorName,
        timestamp: event.createdAt.toISOString(),
      }));
  }

  async syncBid(bidId: string, actorId?: string): Promise<void> {
    const bid = await this.bids.findById(bidId);
    if (!bid) {
      throw new NotFoundError('Bid submission not found');
    }
    const intelligence = await this.intelligence.requirementIntelligence(bidId);
    const candidates = candidatesFromIntelligence({
      items: intelligence.items,
      crossChecks: intelligence.items
        .flatMap((item) => (item.crossCheck ? [item.crossCheck] : []))
        .concat(
          (
            await this.intelligence.listCrossChecks(bidId, true)
          ).map((item) => ({
            id: item.id,
            status: item.status,
            comparisonType: item.comparisonType,
            comparisonLabel: item.comparisonLabel,
          })),
        ),
    });
    const seen = new Set<string>();
    const unique = candidates.filter((item) => {
      if (seen.has(item.fingerprint)) {
        return false;
      }
      seen.add(item.fingerprint);
      return true;
    });
    for (const candidate of unique) {
      const existing = await this.reviews.findByFingerprint(bidId, candidate.fingerprint);
      if (existing) {
        continue;
      }
      const created = await this.reviews.create({
        id: randomUUID(),
        bidSubmissionId: bid.id,
        tenderId: bid.tenderId,
        bidderId: bid.bidderId,
        ...candidate,
      });
      await this.audit?.record({
        actorId,
        action: AUDIT_ACTIONS.REVIEW_ITEM_CREATED,
        resource: BHARATBID_AUDIT_RESOURCES.BID,
        resourceId: bid.id,
        metadata: {
          reviewItemId: created.id,
          issueType: candidate.issueType,
          actor: 'system',
        },
        status: 'succeeded',
      });
      if (actorId) {
        await this.notify(
          actorId,
          'Review item created',
          `${candidate.title}. DEMO / SYNTHETIC — officer review is required.`,
          `/bharatbid/review/${created.id}`,
          created.id,
        );
      }
    }
  }

  private async require(id: string): Promise<BidReviewItemRecord> {
    const row = await this.reviews.findById(id);
    if (!row) {
      throw new NotFoundError('Review item not found');
    }
    return row;
  }

  private bidSummary(rows: BidReviewItemRecord[]) {
    return {
      total: rows.length,
      open: rows.filter((item) => item.status === 'open').length,
      inReview: rows.filter((item) => item.status === 'in_review').length,
      clarificationRequested: rows.filter((item) => item.status === 'clarification_requested').length,
      assessed: rows.filter((item) => item.status === 'assessed').length,
      closed: rows.filter((item) => item.status === 'closed').length,
      finalProcurementDecisions: 0,
    };
  }

  private toListItem(row: BidReviewItemRecord) {
    const latest = row.assessments.find((item) => item.isLatest) ?? row.assessments[0];
    const openClarification = row.clarifications.find((item) => item.status === 'requested');
    return {
      id: row.id,
      bidSubmissionId: row.bidSubmissionId,
      bidReference: row.bid.submissionReference,
      tenderId: row.tenderId,
      tenderReference: row.tender.referenceNumber,
      tenderTitle: row.tender.title,
      bidderId: row.bidderId,
      bidderLegalName: row.bidder.legalName,
      issueType: row.issueType,
      issueLabel: REVIEW_ISSUE_LABELS[row.issueType],
      status: row.status,
      title: row.title,
      machineFinding: row.machineFinding,
      mandatory: row.mandatory,
      requirementName: row.requirement?.name ?? null,
      latestAssessment: latest
        ? { assessment: latest.assessment, assessedAt: latest.assessedAt.toISOString(), officerName: latest.assessedBy.displayName }
        : null,
      openClarification: Boolean(openClarification),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private toDetail(row: BidReviewItemRecord) {
    const latest = row.assessments.find((item) => item.isLatest) ?? row.assessments[0];
    return {
      ...this.toListItem(row),
      whyCreated: row.whyCreated,
      whyItMatters: row.whyItMatters,
      inspectHint: row.inspectHint,
      actionHint: row.actionHint,
      machineExplanation: row.machineExplanation,
      advisory: DEMO_REVIEW_ADVISORY,
      requirement: row.requirement,
      document: row.document
        ? { ...row.document, extractionAdvisory: 'Machine-extracted information. Not independently verified.' }
        : null,
      verification: row.verification,
      crossVerification: row.crossVerification,
      latestAssessment: latest
        ? {
            id: latest.id,
            assessment: latest.assessment,
            note: latest.note,
            attemptNumber: latest.attemptNumber,
            assessedAt: latest.assessedAt.toISOString(),
            officerName: latest.assessedBy.displayName,
          }
        : null,
      assessments: row.assessments.map((item) => ({
        id: item.id,
        assessment: item.assessment,
        note: item.note,
        attemptNumber: item.attemptNumber,
        isLatest: item.isLatest,
        assessedAt: item.assessedAt.toISOString(),
        officerName: item.assessedBy.displayName,
      })),
      clarifications: row.clarifications.map((item) => ({
        id: item.id,
        message: item.message,
        status: item.status,
        requestedAt: item.requestedAt.toISOString(),
        requestedByName: item.requestedBy.displayName,
        response: item.response,
        respondedAt: item.respondedAt ? item.respondedAt.toISOString() : null,
        respondedByName: item.respondedBy?.displayName ?? null,
        synthetic: item.synthetic,
        advisory: DEMO_CLARIFICATION_ADVISORY,
      })),
      openedAt: row.openedAt ? row.openedAt.toISOString() : null,
      openedByName: row.openedBy?.displayName ?? null,
      closedAt: row.closedAt ? row.closedAt.toISOString() : null,
      closedByName: row.closedBy?.displayName ?? null,
    };
  }

  private async notify(userId: string, title: string, body: string, href: string, entityId: string) {
    await notifyProcurement(this.notifications, {
      userId,
      title,
      body,
      href,
      entityType: 'review',
      entityId,
    });
  }
}
