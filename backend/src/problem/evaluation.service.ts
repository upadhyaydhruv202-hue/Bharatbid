import { randomUUID } from 'node:crypto';

import type { AuditService } from '../audit/audit.service';
import type { NotificationService } from '../notifications';
import { notifyProcurement } from './operations/notify';
import { AUDIT_ACTIONS } from '../constants';
import { NotFoundError, ValidationError } from '../errors';
import type { AuditRepository } from '../repositories/audit.repository';
import type { BidCrossVerificationRepository } from '../repositories/bid-cross-verification.repository';
import type { BidDocumentRepository } from '../repositories/bid-document.repository';
import type { BidReviewItemRecord, BidReviewItemRepository } from '../repositories/bid-review-item.repository';
import type { BidAttentionRecord, BidSubmissionRepository } from '../repositories/bid-submission.repository';
import type { BidVerificationRepository } from '../repositories/bid-verification.repository';
import type {
  EvaluationDecisionRecord,
  EvaluationNoteRecord,
  TenderEvaluationRecord,
  TenderEvaluationRepository,
} from '../repositories/tender-evaluation.repository';
import type { TenderRequirementRepository } from '../repositories/tender-requirement.repository';
import type { TenderRepository } from '../repositories/tender.repository';
import type { BidAttentionService } from './attention.service';
import { crossCheckComparisonLabel, requirementCellStatus, verificationComparisonLabel } from './evaluation/display';
import { assertEvaluationTransition, canAddNote, canRecordDecision } from './evaluation/lifecycle';
import { assertDecisionReason, assertEvaluationNote } from './evaluation/notes';
import { evaluationChecklist, evaluationReadiness } from './evaluation/readiness';
import {
  DEFAULT_COMPARISON_BIDS,
  DEMO_DECISION_ADVISORY,
  DEMO_EVALUATION_ADVISORY,
  EVALUABLE_BID_STATUSES,
  EVALUATION_DECISION_LABELS,
  EVALUATION_READINESS_LABELS,
  EVALUATION_STATUS_LABELS,
  FINANCIAL_UNAVAILABLE,
  MAX_COMPARISON_BIDS,
  REQUIREMENT_CELL_LABELS,
  type EvaluationDecisionTypeName,
  type TenderEvaluationStatusName,
} from './evaluation/types';
import { evaluateRequirement, ruleForRequirement } from './intelligence/requirements';
import type { EvidenceStatusName, RequirementEvaluationName } from './intelligence/types';
import type { CreateEvaluationDecisionBody, CreateEvaluationNoteBody, EvaluationListQuery } from './schemas';
import { activityTitle } from './serialize';
import { BHARATBID_AUDIT_RESOURCES, type BidDocumentTypeName, type TenderRequirementTypeName } from './types';
import type { VerificationSourceName, VerificationStatusName } from './verification/types';
import type { CrossVerificationStatusName } from './intelligence/types';

const OPEN_REVIEW_STATUSES = new Set(['open', 'in_review', 'clarification_requested']);

export class BidEvaluationService {
  constructor(
    private readonly evaluations: TenderEvaluationRepository,
    private readonly tenders: TenderRepository,
    private readonly bids: BidSubmissionRepository,
    private readonly requirements: TenderRequirementRepository,
    private readonly documents: BidDocumentRepository,
    private readonly verifications: BidVerificationRepository,
    private readonly crossChecks: BidCrossVerificationRepository,
    private readonly reviews: BidReviewItemRepository,
    private readonly attention: BidAttentionService,
    private readonly audit?: AuditService | null,
    private readonly auditEvents?: AuditRepository | null,
    private readonly notifications?: NotificationService | null,
  ) {}

  async list(query: EvaluationListQuery) {
    const result = await this.evaluations.listTenders(query);
    const tenderIds = result.items.map((item) => item.id);
    const snapshots = await this.tenderSnapshots(tenderIds);
    return {
      items: result.items.map((item) => {
        const snapshot = snapshots.get(item.id);
        return {
          tenderId: item.id,
          evaluationId: item.evaluation?.id ?? null,
          referenceNumber: item.referenceNumber,
          title: item.title,
          organizationName: item.organizationName,
          departmentName: item.departmentName,
          category: item.category,
          status: item.status,
          closingDate: item.closingDate.toISOString(),
          submittedBids: item._count.bids,
          underEvaluation: snapshot?.underEvaluation ?? 0,
          reviewRequired: snapshot?.reviewRequired ?? 0,
          evidenceGaps: snapshot?.evidenceGaps ?? 0,
          verificationIssues: snapshot?.verificationIssues ?? 0,
          evaluationStatus: item.evaluation?.status ?? 'not_started',
          lastEvaluationActivity: snapshot?.lastActivity ?? item.evaluation?.updatedAt.toISOString() ?? null,
          demoLabel: 'DEMO / SYNTHETIC',
        };
      }),
      meta: result.meta,
      advisory: DEMO_EVALUATION_ADVISORY,
    };
  }

  async create(tenderId: string, actorId: string) {
    await this.requireTender(tenderId);
    const evaluable = await this.bids.listEvaluableByTenderIds([tenderId]);
    if (evaluable.length === 0) {
      throw new ValidationError('This tender has no submitted bids to evaluate', [
        { path: 'tenderId', message: 'Evaluation requires at least one submitted bid', code: 'custom' },
      ]);
    }
    const existing = await this.evaluations.findByTenderId(tenderId);
    if (existing) {
      return this.toEvaluationView(existing);
    }
    const created = await this.evaluations.create(tenderId);
    await this.audit?.record({
      actorId,
      action: AUDIT_ACTIONS.EVALUATION_CREATED,
      resource: BHARATBID_AUDIT_RESOURCES.EVALUATION,
      resourceId: created.id,
      metadata: { tenderId, status: created.status, actor: 'officer' },
      status: 'succeeded',
    });
    return this.toEvaluationView(created);
  }

  async get(id: string) {
    return this.toEvaluationView(await this.require(id));
  }

  async getByTender(tenderId: string) {
    await this.requireTender(tenderId);
    const row = await this.evaluations.findByTenderId(tenderId);
    if (!row) {
      return {
        evaluation: null,
        advisory: DEMO_EVALUATION_ADVISORY,
        demoLabel: 'DEMO / SYNTHETIC',
      };
    }
    return { evaluation: this.toEvaluationView(row), advisory: DEMO_EVALUATION_ADVISORY, demoLabel: 'DEMO / SYNTHETIC' };
  }

  async start(id: string, actorId: string) {
    const row = await this.require(id);
    assertEvaluationTransition(row.status, 'in_progress', 'start');
    const updated = await this.evaluations.updateStatus(id, {
      status: 'in_progress',
      startedAt: new Date(),
      startedById: actorId,
    });
    await this.auditStatus(actorId, updated, row.status, 'in_progress', AUDIT_ACTIONS.EVALUATION_STARTED);
    await notifyProcurement(this.notifications, {
      userId: actorId,
      title: 'Evaluation requires attention',
      body: 'Officer evaluation started. DEMO / SYNTHETIC — this is not an award.',
      href: `/bharatbid/evaluation/${updated.tenderId}`,
      entityType: 'evaluation',
      entityId: updated.id,
    });
    return this.toEvaluationView(updated);
  }

  async markReady(id: string, actorId: string) {
    const row = await this.require(id);
    assertEvaluationTransition(row.status, 'ready_for_decision', 'ready');
    const updated = await this.evaluations.updateStatus(id, {
      status: 'ready_for_decision',
      readyAt: new Date(),
      readyById: actorId,
    });
    await this.auditStatus(actorId, updated, row.status, 'ready_for_decision', AUDIT_ACTIONS.EVALUATION_STATUS_CHANGED);
    return this.toEvaluationView(updated);
  }

  async recordComplete(id: string, actorId: string) {
    const row = await this.require(id);
    assertEvaluationTransition(row.status, 'decision_recorded', 'record');
    const decisions = await this.evaluations.listDecisions(id);
    if (!decisions.some((item) => item.isLatest)) {
      throw new ValidationError('Record at least one officer decision before closing the evaluation', [
        { path: 'status', message: 'An officer decision-support record is required', code: 'custom' },
      ]);
    }
    const updated = await this.evaluations.updateStatus(id, {
      status: 'decision_recorded',
      recordedAt: new Date(),
      recordedById: actorId,
    });
    await this.auditStatus(actorId, updated, row.status, 'decision_recorded', AUDIT_ACTIONS.EVALUATION_STATUS_CHANGED);
    return this.toEvaluationView(updated);
  }

  async addNote(id: string, input: CreateEvaluationNoteBody, actorId: string) {
    const row = await this.require(id);
    if (!canAddNote(row.status)) {
      throw new ValidationError('Start the evaluation before recording notes', [
        { path: 'status', message: 'Evaluation has not started', code: 'custom' },
      ]);
    }
    const bidSubmissionId = input.bidSubmissionId ?? null;
    if (bidSubmissionId) {
      await this.requireBidOnTender(bidSubmissionId, row.tenderId);
    }
    const note = assertEvaluationNote(input.note);
    const previous = await this.evaluations.latestNote(id, bidSubmissionId);
    const created = await this.evaluations.createNote({
      id: randomUUID(),
      evaluationId: id,
      bidSubmissionId,
      note,
      attemptNumber: (previous?.attemptNumber ?? 0) + 1,
      createdById: actorId,
    });
    await this.audit?.record({
      actorId,
      action: AUDIT_ACTIONS.EVALUATION_NOTE_CREATED,
      resource: BHARATBID_AUDIT_RESOURCES.EVALUATION,
      resourceId: id,
      metadata: {
        noteId: created.id,
        bidSubmissionId,
        attemptNumber: created.attemptNumber,
        actor: 'officer',
      },
      status: 'succeeded',
    });
    return this.toNoteView(created);
  }

  async listNotes(id: string, bidSubmissionId?: string) {
    await this.require(id);
    const items = await this.evaluations.listNotes(id, bidSubmissionId);
    return { items: items.map((item) => this.toNoteView(item)), advisory: DEMO_EVALUATION_ADVISORY };
  }

  async recordDecision(id: string, input: CreateEvaluationDecisionBody, actorId: string) {
    const row = await this.require(id);
    if (!canRecordDecision(row.status)) {
      throw new ValidationError('Start the evaluation before recording a decision', [
        { path: 'status', message: 'Evaluation has not started', code: 'custom' },
      ]);
    }
    const bid = await this.requireBidOnTender(input.bidSubmissionId, row.tenderId);
    const reason = assertDecisionReason(input.reason);
    const previous = await this.evaluations.latestDecision(id, bid.id);
    const created = await this.evaluations.createDecision({
      id: randomUUID(),
      evaluationId: id,
      bidSubmissionId: bid.id,
      decision: input.decision,
      reason,
      attemptNumber: (previous?.attemptNumber ?? 0) + 1,
      decidedById: actorId,
    });
    await this.audit?.record({
      actorId,
      action: AUDIT_ACTIONS.EVALUATION_DECISION_RECORDED,
      resource: BHARATBID_AUDIT_RESOURCES.EVALUATION,
      resourceId: id,
      metadata: {
        decisionId: created.id,
        bidSubmissionId: bid.id,
        decision: created.decision,
        attemptNumber: created.attemptNumber,
        actor: 'officer',
        tenderId: row.tenderId,
      },
      oldValue: previous ? { decision: previous.decision, attemptNumber: previous.attemptNumber } : undefined,
      newValue: { decision: created.decision, attemptNumber: created.attemptNumber },
      status: 'succeeded',
    });
    await notifyProcurement(this.notifications, {
      userId: actorId,
      title: 'Officer decision recorded',
      body: 'A decision-support state was stored. DEMO / SYNTHETIC — this is not an award or rejection.',
      href: `/bharatbid/evaluation/${row.tenderId}`,
      entityType: 'evaluation',
      entityId: id,
    });
    return this.toDecisionView(created);
  }

  async listDecisions(id: string, bidSubmissionId?: string) {
    await this.require(id);
    const items = await this.evaluations.listDecisions(id, bidSubmissionId);
    return {
      items: items.map((item) => this.toDecisionView(item)),
      advisory: DEMO_DECISION_ADVISORY,
    };
  }

  async history(id: string) {
    const row = await this.require(id);
    const [notes, decisions, events] = await Promise.all([
      this.evaluations.listNotes(id),
      this.evaluations.listDecisions(id),
      this.auditEvents?.listByResourceId(id, 50) ?? Promise.resolve([]),
    ]);
    return {
      evaluation: this.toEvaluationView(row),
      notes: notes.map((item) => this.toNoteView(item)),
      decisions: decisions.map((item) => this.toDecisionView(item)),
      activity: events.map((event) => ({
        id: event.id,
        action: event.action,
        title: activityTitle(event.action, event.metadata),
        actorName: event.actorName,
        timestamp: event.createdAt.toISOString(),
      })),
      advisory: DEMO_EVALUATION_ADVISORY,
    };
  }

  async comparison(tenderId: string, requestedBidIds?: string[]) {
    const tender = await this.requireTender(tenderId);
    const evaluable = await this.bids.listEvaluableByTenderIds([tenderId]);
    if (evaluable.length === 0) {
      throw new ValidationError('This tender has no submitted bids to compare', [
        { path: 'tenderId', message: 'Evaluation requires submitted bids', code: 'custom' },
      ]);
    }
    const selected = this.selectBids(evaluable, requestedBidIds);
    const evaluation = await this.evaluations.findByTenderId(tenderId);
    const [attentionRows, requirements, docs, verifications, crossChecks, reviews, notes, decisions] =
      await Promise.all([
        this.attention.detailsForTender(tenderId),
        this.requirements.listByTender(tenderId),
        this.documents.listCurrentByBidIds(selected.map((bid) => bid.id)),
        this.verifications.listLatestByBidIds(selected.map((bid) => bid.id)),
        this.crossChecks.listLatestByBidIds(selected.map((bid) => bid.id)),
        this.reviews.listByBidIds(selected.map((bid) => bid.id)),
        evaluation ? this.evaluations.listNotes(evaluation.id) : Promise.resolve([]),
        evaluation ? this.evaluations.listDecisions(evaluation.id) : Promise.resolve([]),
      ]);
    const activeRequirements = requirements.filter((item) => item.active).sort((a, b) => a.sortOrder - b.sortOrder);
    const attentionByBid = new Map(attentionRows.map((row) => [row.id, row]));
    const docsByBid = groupBy(docs, (item) => item.bidSubmissionId);
    const verificationsByBid = groupBy(verifications, (item) => item.bidSubmissionId);
    const crossByBid = groupBy(crossChecks, (item) => item.bidSubmissionId);
    const reviewsByBid = groupBy(reviews, (item) => item.bidSubmissionId);

    const bids = selected.map((bid) => {
      const bidDocs = docsByBid.get(bid.id) ?? [];
      const bidVerifications = verificationsByBid.get(bid.id) ?? [];
      const bidCross = crossByBid.get(bid.id) ?? [];
      const bidReviews = reviewsByBid.get(bid.id) ?? [];
      const attention = attentionByBid.get(bid.id);
      const cells = activeRequirements.map((requirement) =>
        this.requirementCell(requirement, bidDocs, bidVerifications, bidCross, bidReviews),
      );
      const reviewSummary = this.reviewSummary(bidReviews);
      const verificationSummary = this.verificationSummary(bidVerifications);
      const crossCheckSummary = this.crossSummary(bidCross);
      const mandatoryMissing = cells.some(
        (cell) => cell.mandatory && cell.cellStatus === 'evidence_missing',
      );
      const mandatoryConflicts = cells.some((cell) => cell.mandatory && cell.cellStatus === 'conflict');
      const unresolved = bidReviews.some(
        (item) => item.mandatory && OPEN_REVIEW_STATUSES.has(item.status),
      );
      const pendingClarifications = bidReviews.filter((item) => item.status === 'clarification_requested').length;
      const readiness = evaluationReadiness({
        pendingClarifications,
        mandatoryEvidenceMissing: mandatoryMissing,
        unresolvedBlockingReviews: unresolved,
        mandatoryConflicts,
      });
      const latestDecision = decisions.find((item) => item.bidSubmissionId === bid.id && item.isLatest) ?? null;
      return {
        id: bid.id,
        submissionReference: bid.submissionReference,
        bidderId: bid.bidderId,
        bidderLegalName: bid.bidder.legalName,
        status: bid.status,
        evidenceCoveragePercent: attention?.evidenceCoveragePercent ?? null,
        verificationSummary,
        verificationLabel: verificationComparisonLabel(verificationSummary),
        crossCheckSummary,
        crossCheckLabel: crossCheckComparisonLabel(crossCheckSummary),
        reviewSummary,
        attention: attention
          ? {
              score: attention.score,
              band: attention.band,
              bandLabel: attention.bandLabel,
              scoreHint: attention.scoreHint,
              advisory: attention.advisory,
              factors: attention.factors,
            }
          : null,
        coverageScore: attention && 'coverage' in attention ? attention.coverage.score : null,
        reviewRisk: attention && 'reviewRisk' in attention ? attention.reviewRisk.level : null,
        officerAdvisory: attention && 'officerAdvisory' in attention ? attention.officerAdvisory.text : null,
        readiness,
        readinessLabel: EVALUATION_READINESS_LABELS[readiness],
        financialAmount: null,
        financialUnavailableReason: FINANCIAL_UNAVAILABLE,
        latestDecision: latestDecision ? this.toDecisionView(latestDecision) : null,
        requirementCells: cells,
        links: {
          bid: `/bharatbid/bids/${bid.id}`,
          documents: `/bharatbid/bids/${bid.id}/documents`,
          verification: `/bharatbid/bids/${bid.id}/verification`,
          crossChecks: `/bharatbid/bids/${bid.id}/cross-checks`,
          requirements: `/bharatbid/bids/${bid.id}/requirements`,
          review: `/bharatbid/bids/${bid.id}/review`,
          intelligence: `/bharatbid/bids/${bid.id}/intelligence`,
        },
      };
    });

    const overview = {
      submittedBids: evaluable.length,
      comparedBids: bids.length,
      evidenceGaps: bids.filter((bid) => bid.requirementCells.some((cell) => cell.cellStatus === 'evidence_missing'))
        .length,
      verificationIssues: bids.filter(
        (bid) => bid.verificationSummary.mismatched + bid.verificationSummary.notFound + bid.verificationSummary.errors > 0,
      ).length,
      openReviews: bids.reduce((total, bid) => total + bid.reviewSummary.open + bid.reviewSummary.inReview, 0),
      pendingClarifications: bids.reduce((total, bid) => total + bid.reviewSummary.clarificationRequested, 0),
    };

    const checklist = evaluationChecklist({
      hasRequirements: activeRequirements.length > 0,
      evidenceInspected: bids.every((bid) => bid.evidenceCoveragePercent !== null),
      verificationInspected: bids.every((bid) => bid.verificationSummary.total > 0),
      crossChecksInspected: bids.every((bid) => bid.crossCheckSummary.total > 0),
      openReviewsResolved: overview.openReviews === 0,
      clarificationsReviewed: overview.pendingClarifications === 0,
      notesRecorded: notes.length > 0,
    });

    return {
      tender: {
        id: tender.id,
        referenceNumber: tender.referenceNumber,
        title: tender.title,
        organizationName: tender.organizationName,
        departmentName: tender.departmentName,
        category: tender.category,
        status: tender.status,
        closingDate: tender.closingDate.toISOString(),
      },
      evaluation: evaluation ? this.toEvaluationView(evaluation) : null,
      overview,
      requirements: activeRequirements.map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        requirementType: item.requirementType,
        mandatory: item.mandatory,
        active: item.active,
        sortOrder: item.sortOrder,
      })),
      availableBids: evaluable.map((bid) => ({
        id: bid.id,
        submissionReference: bid.submissionReference,
        bidderLegalName: bid.bidder.legalName,
        status: bid.status,
      })),
      bids,
      notes: notes.map((item) => this.toNoteView(item)),
      decisions: decisions.map((item) => this.toDecisionView(item)),
      checklist,
      financialUnavailableReason: FINANCIAL_UNAVAILABLE,
      advisory: DEMO_EVALUATION_ADVISORY,
      decisionAdvisory: DEMO_DECISION_ADVISORY,
      attentionDisclaimer:
        'Officer Review Priority is a review-triage indicator. It is not a bidder ranking, selection score, bid quality score, or procurement merit score.',
      demoLabel: 'DEMO / SYNTHETIC',
    };
  }

  async getForBid(bidId: string) {
    const bid = await this.bids.findById(bidId);
    if (!bid) {
      throw new NotFoundError('Bid submission not found');
    }
    const evaluation = await this.evaluations.findByTenderId(bid.tenderId);
    const [notes, decisions, comparison] = await Promise.all([
      evaluation ? this.evaluations.listNotes(evaluation.id, bidId) : Promise.resolve([]),
      evaluation ? this.evaluations.listDecisions(evaluation.id, bidId) : Promise.resolve([]),
      EVALUABLE_BID_STATUSES.includes(bid.status as (typeof EVALUABLE_BID_STATUSES)[number])
        ? this.comparison(bid.tenderId, [bidId]).catch(() => null)
        : Promise.resolve(null),
    ]);
    const compared = comparison?.bids.find((item) => item.id === bidId) ?? null;
    return {
      bidId: bid.id,
      tenderId: bid.tenderId,
      evaluation: evaluation ? this.toEvaluationView(evaluation) : null,
      readiness: compared?.readiness ?? null,
      readinessLabel: compared?.readinessLabel ?? null,
      latestDecision: compared?.latestDecision ?? (decisions[0] ? this.toDecisionView(decisions[0]) : null),
      notes: notes.map((item) => this.toNoteView(item)),
      decisions: decisions.map((item) => this.toDecisionView(item)),
      comparisonPath: `/bharatbid/evaluation/${bid.tenderId}`,
      advisory: DEMO_EVALUATION_ADVISORY,
      decisionAdvisory: DEMO_DECISION_ADVISORY,
      demoLabel: 'DEMO / SYNTHETIC',
    };
  }

  private selectBids(evaluable: BidAttentionRecord[], requestedBidIds?: string[]) {
    if (!requestedBidIds || requestedBidIds.length === 0) {
      return evaluable.slice(0, DEFAULT_COMPARISON_BIDS);
    }
    if (requestedBidIds.length > MAX_COMPARISON_BIDS) {
      throw new ValidationError('Too many bids selected for comparison', [
        { path: 'bidIds', message: `Compare at most ${MAX_COMPARISON_BIDS} bids at a time`, code: 'custom' },
      ]);
    }
    const byId = new Map(evaluable.map((bid) => [bid.id, bid]));
    const selected: BidAttentionRecord[] = [];
    for (const id of requestedBidIds) {
      const bid = byId.get(id);
      if (!bid) {
        throw new ValidationError('A selected bid does not belong to this tender', [
          { path: 'bidIds', message: 'Bids from another tender cannot be included in this evaluation', code: 'custom' },
        ]);
      }
      selected.push(bid);
    }
    return selected;
  }

  private requirementCell(
    requirement: {
      id: string;
      name: string;
      requirementType: string;
      mandatory: boolean;
    },
    documents: Array<{
      id: string;
      documentType: string;
      tenderRequirementId: string | null;
      extractionStatus: string;
      originalFilename: string;
    }>,
    verifications: Array<{ id: string; source: string; status: string }>,
    crossChecks: Array<{ id: string; comparisonType: string; status: string }>,
    reviews: BidReviewItemRecord[],
  ) {
    const rule = ruleForRequirement({
      name: requirement.name,
      requirementType: requirement.requirementType as TenderRequirementTypeName,
    });
    const linked = documents.filter(
      (doc) =>
        doc.tenderRequirementId === requirement.id || (rule.documentTypes as string[]).includes(doc.documentType),
    );
    const verification = rule.verificationSource
      ? verifications.find((item) => item.source === rule.verificationSource) ?? null
      : null;
    const crossCheck =
      rule.verificationSource === 'gst'
        ? crossChecks.find((item) => item.comparisonType === 'gst_mca' || item.comparisonType === 'gst_udyam') ?? null
        : rule.verificationSource === 'mca'
          ? crossChecks.find((item) => item.comparisonType === 'gst_mca' || item.comparisonType === 'mca_udyam') ?? null
          : rule.verificationSource === 'udyam'
            ? crossChecks.find((item) => item.comparisonType === 'gst_udyam' || item.comparisonType === 'mca_udyam') ??
              null
            : null;
    const result = evaluateRequirement(rule, requirement.mandatory, {
      documents: linked.map((doc) => ({
        id: doc.id,
        originalFilename: doc.originalFilename,
        documentType: doc.documentType as BidDocumentTypeName,
        extractionStatus: doc.extractionStatus,
        tenderRequirementId: doc.tenderRequirementId,
      })),
      verification: verification
        ? {
            id: verification.id,
            status: verification.status as VerificationStatusName,
            source: verification.source as VerificationSourceName,
            identifierValue: '',
          }
        : null,
      crossCheck: crossCheck
        ? {
            id: crossCheck.id,
            status: crossCheck.status as CrossVerificationStatusName,
            comparisonType: crossCheck.comparisonType,
          }
        : null,
    });
    const cellStatus = requirementCellStatus(
      result.evidenceStatus as EvidenceStatusName,
      result.evaluation as RequirementEvaluationName,
    );
    const relatedReviews = reviews.filter((item) => item.requirementId === requirement.id);
    return {
      requirementId: requirement.id,
      name: requirement.name,
      mandatory: requirement.mandatory,
      evidenceStatus: result.evidenceStatus,
      evaluation: result.evaluation,
      cellStatus,
      cellLabel: REQUIREMENT_CELL_LABELS[cellStatus],
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
      reviews: relatedReviews.map((item) => ({
        id: item.id,
        title: item.title,
        status: item.status,
        issueType: item.issueType,
      })),
    };
  }

  private reviewSummary(reviews: BidReviewItemRecord[]) {
    const counts = { open: 0, inReview: 0, clarificationRequested: 0, assessed: 0, closed: 0 };
    for (const item of reviews) {
      if (item.status === 'open') counts.open += 1;
      if (item.status === 'in_review') counts.inReview += 1;
      if (item.status === 'clarification_requested') counts.clarificationRequested += 1;
      if (item.status === 'assessed') counts.assessed += 1;
      if (item.status === 'closed') counts.closed += 1;
    }
    return { ...counts, total: reviews.length };
  }

  private verificationSummary(items: Array<{ status: string }>) {
    const summary = { total: items.length, matched: 0, mismatched: 0, notFound: 0, errors: 0 };
    for (const item of items) {
      if (item.status === 'matched') summary.matched += 1;
      if (item.status === 'mismatched') summary.mismatched += 1;
      if (item.status === 'not_found') summary.notFound += 1;
      if (item.status === 'error') summary.errors += 1;
    }
    return summary;
  }

  private crossSummary(items: Array<{ status: string }>) {
    const summary = { total: items.length, consistent: 0, inconsistent: 0, insufficient: 0, notComparable: 0 };
    for (const item of items) {
      if (item.status === 'consistent') summary.consistent += 1;
      if (item.status === 'inconsistent') summary.inconsistent += 1;
      if (item.status === 'insufficient_evidence') summary.insufficient += 1;
      if (item.status === 'not_comparable') summary.notComparable += 1;
    }
    return summary;
  }

  private async tenderSnapshots(tenderIds: string[]) {
    const bids = await this.bids.listEvaluableByTenderIds(tenderIds);
    const bidIds = bids.map((bid) => bid.id);
    const [reviews, verifications, documents, requirements, evaluations] = await Promise.all([
      this.reviews.listByBidIds(bidIds),
      this.verifications.listLatestByBidIds(bidIds),
      this.documents.listCurrentByBidIds(bidIds),
      this.requirements.listByTenderIds(tenderIds),
      Promise.resolve(
        await Promise.all(tenderIds.map(async (id) => [id, await this.evaluations.findByTenderId(id)] as const)),
      ),
    ]);
    const evaluationByTender = new Map(evaluations);
    const reviewsByBid = groupBy(reviews, (item) => item.bidSubmissionId);
    const verificationsByBid = groupBy(verifications, (item) => item.bidSubmissionId);
    const documentsByBid = groupBy(documents, (item) => item.bidSubmissionId);
    const requirementsByTender = groupBy(requirements, (item) => item.tenderId);
    const bidsByTender = groupBy(bids, (item) => item.tenderId);
    const snapshots = new Map<
      string,
      {
        underEvaluation: number;
        reviewRequired: number;
        evidenceGaps: number;
        verificationIssues: number;
        lastActivity: string | null;
      }
    >();
    for (const tenderId of tenderIds) {
      const tenderBids = bidsByTender.get(tenderId) ?? [];
      const evaluation = evaluationByTender.get(tenderId) ?? null;
      const underEvaluation =
        evaluation && evaluation.status !== 'not_started' ? tenderBids.length : 0;
      let reviewRequired = 0;
      let evidenceGaps = 0;
      let verificationIssues = 0;
      for (const bid of tenderBids) {
        const bidReviews = reviewsByBid.get(bid.id) ?? [];
        if (bidReviews.some((item) => OPEN_REVIEW_STATUSES.has(item.status))) {
          reviewRequired += 1;
        }
        const bidVerifications = verificationsByBid.get(bid.id) ?? [];
        if (bidVerifications.some((item) => item.status === 'mismatched' || item.status === 'not_found' || item.status === 'error')) {
          verificationIssues += 1;
        }
        const bidRequirements = (requirementsByTender.get(tenderId) ?? []).filter(
          (item) => item.active && item.mandatory,
        );
        const bidDocs = documentsByBid.get(bid.id) ?? [];
        const missing = bidRequirements.some((requirement) => {
          const rule = ruleForRequirement({
            name: requirement.name,
            requirementType: requirement.requirementType as TenderRequirementTypeName,
          });
          return !bidDocs.some(
            (doc) =>
              doc.tenderRequirementId === requirement.id ||
              (rule.documentTypes as string[]).includes(doc.documentType),
          );
        });
        if (missing) {
          evidenceGaps += 1;
        }
      }
      snapshots.set(tenderId, {
        underEvaluation,
        reviewRequired,
        evidenceGaps,
        verificationIssues,
        lastActivity: evaluation?.updatedAt.toISOString() ?? null,
      });
    }
    return snapshots;
  }

  private async require(id: string): Promise<TenderEvaluationRecord> {
    const row = await this.evaluations.findById(id);
    if (!row) {
      throw new NotFoundError('Evaluation not found');
    }
    return row;
  }

  private async requireTender(tenderId: string) {
    const tender = await this.tenders.findById(tenderId);
    if (!tender) {
      throw new NotFoundError('Tender not found');
    }
    return tender;
  }

  private async requireBidOnTender(bidId: string, tenderId: string) {
    const bid = await this.bids.findById(bidId);
    if (!bid) {
      throw new NotFoundError('Bid submission not found');
    }
    if (bid.tenderId !== tenderId) {
      throw new ValidationError('A selected bid does not belong to this tender', [
        { path: 'bidSubmissionId', message: 'Bids from another tender cannot be included in this evaluation', code: 'custom' },
      ]);
    }
    if (!EVALUABLE_BID_STATUSES.includes(bid.status as (typeof EVALUABLE_BID_STATUSES)[number])) {
      throw new ValidationError('Only submitted bids can be evaluated', [
        { path: 'bidSubmissionId', message: 'Draft or withdrawn bids are outside this evaluation', code: 'custom' },
      ]);
    }
    return bid;
  }

  private toEvaluationView(row: TenderEvaluationRecord) {
    return {
      id: row.id,
      tenderId: row.tenderId,
      status: row.status as TenderEvaluationStatusName,
      statusLabel: EVALUATION_STATUS_LABELS[row.status as TenderEvaluationStatusName],
      startedAt: row.startedAt?.toISOString() ?? null,
      startedBy: row.startedBy,
      readyAt: row.readyAt?.toISOString() ?? null,
      readyBy: row.readyBy,
      recordedAt: row.recordedAt?.toISOString() ?? null,
      recordedBy: row.recordedBy,
      lastUpdated: row.updatedAt.toISOString(),
      lastUpdatedBy: row.recordedBy ?? row.readyBy ?? row.startedBy,
      tender: {
        id: row.tender.id,
        referenceNumber: row.tender.referenceNumber,
        title: row.tender.title,
        category: row.tender.category,
        status: row.tender.status,
        closingDate: row.tender.closingDate.toISOString(),
      },
      advisory: DEMO_EVALUATION_ADVISORY,
      demoLabel: 'DEMO / SYNTHETIC',
    };
  }

  private toNoteView(row: EvaluationNoteRecord) {
    return {
      id: row.id,
      evaluationId: row.evaluationId,
      bidSubmissionId: row.bidSubmissionId,
      bidReference: row.bid?.submissionReference ?? null,
      note: row.note,
      attemptNumber: row.attemptNumber,
      isLatest: row.isLatest,
      createdBy: row.createdBy,
      createdAt: row.createdAt.toISOString(),
    };
  }

  private toDecisionView(row: EvaluationDecisionRecord) {
    return {
      id: row.id,
      evaluationId: row.evaluationId,
      bidSubmissionId: row.bidSubmissionId,
      bidReference: row.bid.submissionReference,
      decision: row.decision as EvaluationDecisionTypeName,
      decisionLabel: EVALUATION_DECISION_LABELS[row.decision as EvaluationDecisionTypeName],
      reason: row.reason,
      attemptNumber: row.attemptNumber,
      isLatest: row.isLatest,
      decidedBy: row.decidedBy,
      decidedAt: row.decidedAt.toISOString(),
      advisory: DEMO_DECISION_ADVISORY,
    };
  }

  private async auditStatus(
    actorId: string,
    row: TenderEvaluationRecord,
    from: string,
    to: string,
    action: string,
  ) {
    await this.audit?.record({
      actorId,
      action,
      resource: BHARATBID_AUDIT_RESOURCES.EVALUATION,
      resourceId: row.id,
      metadata: { tenderId: row.tenderId, from, to, actor: 'officer' },
      oldValue: { status: from },
      newValue: { status: to },
      status: 'succeeded',
    });
  }
}

function groupBy<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const group = map.get(key(item)) ?? [];
    group.push(item);
    map.set(key(item), group);
  }
  return map;
}
