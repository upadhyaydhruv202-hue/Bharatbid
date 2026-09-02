import { randomUUID } from 'node:crypto';

import type { Prisma } from '@prisma/client';

import type { AuditService } from '../audit/audit.service';
import { AUDIT_ACTIONS } from '../constants';
import { NotFoundError, ValidationError } from '../errors';
import type { AuditRepository } from '../repositories/audit.repository';
import type { BidCrossVerificationRepository } from '../repositories/bid-cross-verification.repository';
import type { BidDocumentRepository } from '../repositories/bid-document.repository';
import type { BidSubmissionRepository } from '../repositories/bid-submission.repository';
import type { BidVerificationRecord } from '../repositories/bid-verification.repository';
import type { BidVerificationRepository } from '../repositories/bid-verification.repository';
import type { TenderRequirementRepository } from '../repositories/tender-requirement.repository';
import { BHARATBID_AUDIT_RESOURCES } from './types';
import { asSourceSnapshot, compareVerificationPair } from './intelligence/compare';
import { evaluateRequirement, ruleForRequirement } from './intelligence/requirements';
import {
  COMPARISON_SOURCE_PAIRS,
  CROSS_COMPARISON_LABELS,
  DEMO_CROSS_ADVISORY,
  MIXED_SOURCE_ADVISORY,
  comparisonTypeForSources,
  sourceBasis,
  type CrossComparisonTypeName,
  type CrossFieldComparison,
  type EvidenceStatusName,
  type RequirementEvaluationName,
} from './intelligence/types';
import type { CreateCrossVerificationBody } from './schemas';
import {
  activityTitle,
  type TenderActivityItem,
} from './serialize';

const IDEMPOTENCY_WINDOW_MS = 5_000;

export interface CrossVerificationView {
  id: string;
  bidSubmissionId: string;
  comparisonType: string;
  comparisonLabel: string;
  status: string;
  sourceBasis: string;
  leftVerificationId: string;
  rightVerificationId: string;
  leftSource: string;
  rightSource: string;
  leftSourceDisplayName: string;
  rightSourceDisplayName: string;
  leftSourceMode: string;
  rightSourceMode: string;
  fieldComparisons: CrossFieldComparison[];
  explanation: string;
  advisory: string;
  attemptNumber: number;
  isLatest: boolean;
  requestedAt: string;
  completedAt: string | null;
  requestedByName: string | null;
  history: Array<{ id: string; attemptNumber: number; status: string; requestedAt: string; isLatest: boolean }>;
}

export interface RequirementIntelligenceItem {
  requirementId: string;
  name: string;
  description: string | null;
  requirementType: string;
  mandatory: boolean;
  ruleKind: string;
  evidenceStatus: EvidenceStatusName;
  evaluation: RequirementEvaluationName;
  explanation: string;
  documents: Array<{ id: string; originalFilename: string; documentType: string }>;
  verification: { id: string; status: string; source: string } | null;
  crossCheck: { id: string; status: string; comparisonType: string } | null;
}

export interface ReviewItemView {
  id: string;
  kind: 'requirement' | 'cross_check';
  title: string;
  reason: string;
  requirementId?: string;
  documentId?: string;
  verificationId?: string;
  crossVerificationId?: string;
}

export class BidIntelligenceService {
  constructor(
    private readonly crossChecks: BidCrossVerificationRepository,
    private readonly verifications: BidVerificationRepository,
    private readonly documents: BidDocumentRepository,
    private readonly bids: BidSubmissionRepository,
    private readonly requirements: TenderRequirementRepository,
    private readonly audit?: AuditService | null,
    private readonly auditEvents?: AuditRepository | null,
  ) {}

  async listCrossChecks(bidId: string, latestOnly = true): Promise<CrossVerificationView[]> {
    await this.requireBid(bidId);
    const rows = await this.crossChecks.list(bidId, latestOnly);
    return Promise.all(rows.map((row) => this.toView(row)));
  }

  async getCrossCheck(bidId: string, id: string): Promise<CrossVerificationView> {
    await this.requireBid(bidId);
    const row = await this.crossChecks.findById(id);
    if (!row || row.bidSubmissionId !== bidId) {
      throw new NotFoundError('Cross-verification not found');
    }
    return this.toView(row, await this.crossChecks.listByGroup(row.groupId));
  }

  async request(bidId: string, input: CreateCrossVerificationBody, actorId?: string): Promise<CrossVerificationView[]> {
    const bid = await this.requireBid(bidId);
    const latest = await this.verifications.listLatest(bidId);
    const jobs = await this.resolveJobs(bidId, input, latest);
    if (!jobs.length) {
      throw new ValidationError('No comparable verification pair is available for this bid', [
        { path: 'comparisonType', message: 'Run GST, MCA, or Udyam checks first', code: 'custom' },
      ]);
    }
    const created: CrossVerificationView[] = [];
    for (const job of jobs) {
      created.push(await this.execute(bid.id, bid.bidderId, job.left, job.right, job.comparisonType, actorId));
    }
    const intelligence = await this.requirementIntelligence(bidId);
    await this.audit?.record({
      actorId,
      action: AUDIT_ACTIONS.REQUIREMENT_EVALUATION_COMPLETED,
      resource: BHARATBID_AUDIT_RESOURCES.BID,
      resourceId: bidId,
      metadata: {
        requirementCount: intelligence.items.length,
        reviewItemCount: intelligence.reviewItems.length,
        evidenceCoveragePercent: intelligence.summary.evidenceCoveragePercent,
      },
      status: 'succeeded',
    });
    for (const item of intelligence.reviewItems) {
      await this.audit?.record({
        actorId,
        action: AUDIT_ACTIONS.REVIEW_ITEM_CREATED,
        resource: BHARATBID_AUDIT_RESOURCES.BID,
        resourceId: bidId,
        metadata: {
          reviewItemId: item.id,
          kind: item.kind,
          requirementId: item.requirementId,
          crossVerificationId: item.crossVerificationId,
        },
        status: 'succeeded',
      });
    }
    return created;
  }

  async listActivity(bidId: string, id: string): Promise<TenderActivityItem[]> {
    await this.getCrossCheck(bidId, id);
    if (!this.auditEvents) {
      return [];
    }
    const events = await this.auditEvents.listByResourceId(bidId, 80);
    return events
      .filter((event) => {
        const meta = event.metadata ?? event.request;
        return Boolean(meta && typeof meta === 'object' && (meta as { crossVerificationId?: string }).crossVerificationId === id);
      })
      .map((event) => ({
        id: event.id,
        action: event.action,
        title: activityTitle(event.action, event.metadata ?? event.request),
        actorName: event.actorName,
        timestamp: event.createdAt.toISOString(),
      }));
  }

  async requirementIntelligence(bidId: string): Promise<{
    items: RequirementIntelligenceItem[];
    summary: {
      total: number;
      mandatory: number;
      evidenceAvailable: number;
      evidenceMissing: number;
      reviewRequired: number;
      passCount: number;
      evidenceCoveragePercent: number | null;
    };
    reviewItems: ReviewItemView[];
    advisory: string;
  }> {
    const bid = await this.requireBid(bidId);
    const [reqs, docs, verifications, cross] = await Promise.all([
      this.requirements.listByTender(bid.tenderId),
      this.documents.listCurrent(bidId),
      this.verifications.listLatest(bidId),
      this.crossChecks.list(bidId, true),
    ]);
    const active = reqs.filter((item) => item.active);
    const items: RequirementIntelligenceItem[] = [];
    const reviewItems: ReviewItemView[] = [];

    for (const req of active) {
      const rule = ruleForRequirement(req);
      const linked = docs.filter(
        (doc) =>
          doc.tenderRequirementId === req.id ||
          (rule.documentTypes as string[]).includes(doc.documentType),
      );
      const verification = rule.verificationSource
        ? verifications.find((item) => item.source === rule.verificationSource) ?? null
        : null;
      const crossCheck =
        rule.verificationSource === 'gst'
          ? cross.find((item) => item.comparisonType === 'gst_mca' || item.comparisonType === 'gst_udyam') ?? null
          : rule.verificationSource === 'mca'
            ? cross.find((item) => item.comparisonType === 'gst_mca' || item.comparisonType === 'mca_udyam') ?? null
            : rule.verificationSource === 'udyam'
              ? cross.find((item) => item.comparisonType === 'gst_udyam' || item.comparisonType === 'mca_udyam') ?? null
              : null;
      const result = evaluateRequirement(rule, req.mandatory, {
        documents: linked,
        verification: verification
          ? {
              id: verification.id,
              status: verification.status,
              source: verification.source,
              identifierValue: verification.identifierValue,
            }
          : null,
        crossCheck: crossCheck
          ? { id: crossCheck.id, status: crossCheck.status, comparisonType: crossCheck.comparisonType }
          : null,
      });
      items.push({
        requirementId: req.id,
        name: req.name,
        description: req.description,
        requirementType: req.requirementType,
        mandatory: req.mandatory,
        ruleKind: rule.kind,
        evidenceStatus: result.evidenceStatus,
        evaluation: result.evaluation,
        explanation: result.explanation,
        documents: linked.map((doc) => ({
          id: doc.id,
          originalFilename: doc.originalFilename,
          documentType: doc.documentType,
        })),
        verification: verification
          ? { id: verification.id, status: verification.status, source: verification.source }
          : null,
        crossCheck: crossCheck
          ? { id: crossCheck.id, status: crossCheck.status, comparisonType: crossCheck.comparisonType }
          : null,
      });
      if (result.review) {
        reviewItems.push({
          id: `req:${req.id}`,
          kind: 'requirement',
          title: req.name,
          reason: result.explanation,
          requirementId: req.id,
          documentId: linked[0]?.id,
          verificationId: verification?.id,
          crossVerificationId: crossCheck?.id,
        });
      }
    }

    for (const check of cross.filter((item) => item.status === 'inconsistent')) {
      reviewItems.push({
        id: `cross:${check.id}`,
        kind: 'cross_check',
        title: CROSS_COMPARISON_LABELS[check.comparisonType],
        reason: 'A difference was detected between two source records. Officer review is recommended.',
        crossVerificationId: check.id,
      });
    }

    const mandatory = items.filter((item) => item.mandatory);
    const withEvidence = mandatory.filter((item) =>
      ['evidence_available', 'evidence_conflict', 'evidence_processing'].includes(item.evidenceStatus),
    );
    return {
      items,
      summary: {
        total: items.length,
        mandatory: mandatory.length,
        evidenceAvailable: items.filter((item) => item.evidenceStatus === 'evidence_available' || item.evidenceStatus === 'evidence_conflict').length,
        evidenceMissing: items.filter((item) => item.evidenceStatus === 'evidence_missing').length,
        reviewRequired: items.filter((item) => item.evaluation === 'review_required').length,
        passCount: items.filter((item) => item.evaluation === 'pass').length,
        evidenceCoveragePercent: mandatory.length
          ? Math.round((withEvidence.length / mandatory.length) * 100)
          : null,
      },
      reviewItems,
      advisory: DEMO_CROSS_ADVISORY,
    };
  }

  async summarize(bidId: string) {
    await this.requireBid(bidId);
    const [cross, intelligence] = await Promise.all([
      this.crossChecks.list(bidId, true),
      this.requirementIntelligence(bidId),
    ]);
    return {
      crossChecks: {
        total: cross.length,
        consistent: cross.filter((item) => item.status === 'consistent').length,
        inconsistent: cross.filter((item) => item.status === 'inconsistent').length,
        insufficient: cross.filter((item) => item.status === 'insufficient_evidence').length,
      },
      requirements: intelligence.summary,
    };
  }

  private async execute(
    bidId: string,
    bidderId: string,
    left: BidVerificationRecord,
    right: BidVerificationRecord,
    comparisonType: CrossComparisonTypeName,
    actorId?: string,
  ): Promise<CrossVerificationView> {
    const recent = await this.crossChecks.findLatestSame({
      bidSubmissionId: bidId,
      comparisonType,
      leftVerificationId: left.id,
      rightVerificationId: right.id,
    });
    if (recent && Date.now() - recent.requestedAt.getTime() < IDEMPOTENCY_WINDOW_MS) {
      return this.toView(recent);
    }
    const previous = await this.crossChecks.findLatestByType(bidId, comparisonType);
    if (previous) {
      await this.crossChecks.markTypeNotLatest(bidId, comparisonType);
    }
    await this.audit?.record({
      actorId,
      action: AUDIT_ACTIONS.CROSS_VERIFICATION_REQUESTED,
      resource: BHARATBID_AUDIT_RESOURCES.BID,
      resourceId: bidId,
      metadata: { comparisonType, leftVerificationId: left.id, rightVerificationId: right.id },
      status: 'succeeded',
    });
    let compared: ReturnType<typeof compareVerificationPair>;
    try {
      compared = compareVerificationPair({
        leftStatus: left.status,
        rightStatus: right.status,
        leftSource: left.source,
        rightSource: right.source,
        leftMode: left.sourceMode,
        rightMode: right.sourceMode,
        leftDisplayName: left.sourceDisplayName,
        rightDisplayName: right.sourceDisplayName,
        leftSnapshot: asSourceSnapshot(left.sourceSnapshot),
        rightSnapshot: asSourceSnapshot(right.sourceSnapshot),
      });
    } catch {
      compared = {
        status: 'error',
        fields: [],
        sourceBasis: sourceBasis(left.sourceMode, right.sourceMode),
        explanation:
          'The cross-check could not be completed. This is not a procurement decision and does not establish bidder invalidity.',
      };
    }
    const created = await this.crossChecks.create({
      id: randomUUID(),
      bidSubmissionId: bidId,
      bidderId,
      leftVerificationId: left.id,
      rightVerificationId: right.id,
      comparisonType,
      status: compared.status,
      sourceBasis: compared.sourceBasis,
      leftSource: left.source,
      rightSource: right.source,
      leftSourceMode: left.sourceMode,
      rightSourceMode: right.sourceMode,
      leftSourceDisplayName: left.sourceDisplayName,
      rightSourceDisplayName: right.sourceDisplayName,
      fieldComparisons: compared.fields as unknown as Prisma.InputJsonValue,
      explanation: compared.explanation,
      groupId: previous?.groupId ?? randomUUID(),
      attemptNumber: (previous?.attemptNumber ?? 0) + 1,
      isLatest: true,
      requestedAt: new Date(),
      completedAt: new Date(),
      requestedById: actorId ?? null,
    });
    await this.audit?.record({
      actorId,
      action:
        compared.status === 'inconsistent'
          ? AUDIT_ACTIONS.CROSS_VERIFICATION_INCONSISTENT
          : AUDIT_ACTIONS.CROSS_VERIFICATION_COMPLETED,
      resource: BHARATBID_AUDIT_RESOURCES.BID,
      resourceId: bidId,
      metadata: {
        crossVerificationId: created.id,
        comparisonType,
        status: compared.status,
        sourceBasis: compared.sourceBasis,
      },
      status: compared.status === 'error' ? 'failed' : 'succeeded',
    });
    return this.toView(created);
  }

  private async resolveJobs(
    bidId: string,
    input: CreateCrossVerificationBody,
    latest: BidVerificationRecord[],
  ): Promise<Array<{ left: BidVerificationRecord; right: BidVerificationRecord; comparisonType: CrossComparisonTypeName }>> {
    if (input.leftVerificationId && input.rightVerificationId) {
      const left = await this.verifications.findById(input.leftVerificationId);
      const right = await this.verifications.findById(input.rightVerificationId);
      if (!left || left.bidSubmissionId !== bidId || !right || right.bidSubmissionId !== bidId) {
        throw new ValidationError('Both verifications must belong to this bid', [
          { path: 'leftVerificationId', message: 'Verification not found on this bid', code: 'custom' },
        ]);
      }
      const type = comparisonTypeForSources(left.source, right.source);
      if (!type) {
        throw new ValidationError('These sources are not comparable', [
          { path: 'comparisonType', message: 'Supported pairs are GST↔MCA, GST↔Udyam, and MCA↔Udyam', code: 'custom' },
        ]);
      }
      if (input.comparisonType && input.comparisonType !== type) {
        throw new ValidationError('comparisonType does not match the selected verifications', [
          { path: 'comparisonType', message: `Expected ${type}`, code: 'custom' },
        ]);
      }
      return [{ left, right, comparisonType: type }];
    }
    const types: CrossComparisonTypeName[] = input.comparisonType
      ? [input.comparisonType]
      : [...Object.keys(COMPARISON_SOURCE_PAIRS) as CrossComparisonTypeName[]];
    const jobs = [];
    for (const type of types) {
      const pair = COMPARISON_SOURCE_PAIRS[type];
      const left = latest.find((item) => item.source === pair.left);
      const right = latest.find((item) => item.source === pair.right);
      if (left && right) {
        jobs.push({ left, right, comparisonType: type });
      }
    }
    return jobs;
  }

  private async toView(
    row: Awaited<ReturnType<BidCrossVerificationRepository['findById']>> & object,
    history: Awaited<ReturnType<BidCrossVerificationRepository['listByGroup']>> = [],
  ): Promise<CrossVerificationView> {
    if (!row) {
      throw new NotFoundError('Cross-verification not found');
    }
    return {
      id: row.id,
      bidSubmissionId: row.bidSubmissionId,
      comparisonType: row.comparisonType,
      comparisonLabel: CROSS_COMPARISON_LABELS[row.comparisonType],
      status: row.status,
      sourceBasis: row.sourceBasis,
      leftVerificationId: row.leftVerificationId,
      rightVerificationId: row.rightVerificationId,
      leftSource: row.leftSource,
      rightSource: row.rightSource,
      leftSourceDisplayName: row.leftSourceDisplayName,
      rightSourceDisplayName: row.rightSourceDisplayName,
      leftSourceMode: row.leftSourceMode,
      rightSourceMode: row.rightSourceMode,
      fieldComparisons: Array.isArray(row.fieldComparisons)
        ? (row.fieldComparisons as unknown as CrossFieldComparison[])
        : [],
      explanation: row.explanation,
      advisory: row.sourceBasis === 'mixed' ? MIXED_SOURCE_ADVISORY : DEMO_CROSS_ADVISORY,
      attemptNumber: row.attemptNumber,
      isLatest: row.isLatest,
      requestedAt: row.requestedAt.toISOString(),
      completedAt: row.completedAt ? row.completedAt.toISOString() : null,
      requestedByName: row.requestedBy?.displayName ?? null,
      history: history.map((item) => ({
        id: item.id,
        attemptNumber: item.attemptNumber,
        status: item.status,
        requestedAt: item.requestedAt.toISOString(),
        isLatest: item.isLatest,
      })),
    };
  }

  private async requireBid(bidId: string) {
    const bid = await this.bids.findById(bidId);
    if (!bid) {
      throw new NotFoundError('Bid submission not found');
    }
    return bid;
  }
}
