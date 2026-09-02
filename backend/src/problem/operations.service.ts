import { randomUUID } from 'node:crypto';

import type { AuditService } from '../audit/audit.service';
import { AUDIT_ACTIONS } from '../constants';
import { ExternalServiceError, NotFoundError, ValidationError } from '../errors';
import { renderPdfDocument } from '../integrations/pdf/pdf.renderer';
import type { StorageService } from '../integrations/storage/storage.service';
import type { AuditRepository } from '../repositories/audit.repository';
import type { BidSubmissionRepository } from '../repositories/bid-submission.repository';
import type { BidderRepository } from '../repositories/bidder.repository';
import type { TenderEvaluationRepository } from '../repositories/tender-evaluation.repository';
import type { TenderRepository } from '../repositories/tender.repository';
import { parsePagination, toPaginatedResult } from '../repositories/query';
import type { BidAttentionService } from './attention.service';
import type { BidEvaluationService } from './evaluation.service';
import { EVALUABLE_BID_STATUSES } from './evaluation/types';
import {
  actorKindForAction,
  activityHeadline,
  hrefForActivity,
  PROCUREMENT_AUDIT_ACTIONS,
  type ProcurementActorKind,
} from './operations/activity';
import { buildEvaluationReportSpec, REPORT_KIND_TITLES, type ReportKind } from './operations/report';
import type { BidReviewService } from './review.service';
import type { ActivityQuery, DashboardQuery, SearchQuery } from './schemas';
import type { TenderService } from './tender.service';
import { BHARATBID_AUDIT_RESOURCES } from './types';

export class BidOperationsService {
  constructor(
    private readonly tenders: TenderService,
    private readonly tenderRepo: TenderRepository,
    private readonly bidderRepo: BidderRepository,
    private readonly bidRepo: BidSubmissionRepository,
    private readonly reviews: BidReviewService,
    private readonly attention: BidAttentionService,
    private readonly evaluations: BidEvaluationService,
    private readonly evaluationRepo: TenderEvaluationRepository,
    private readonly auditEvents: AuditRepository,
    private readonly storage: StorageService,
    private readonly audit?: AuditService | null,
    private readonly options: { demoMode: boolean; nodeEnv: string } = { demoMode: true, nodeEnv: 'development' },
  ) {}

  async dashboard(query: DashboardQuery = {}) {
    const tenderId = query.tenderId;
    const attentionQuery = { tenderId, page: 1, pageSize: 20 };
    const [tenderStats, submittedBids, reviewSummary, snapshot, evaluationCounts, evaluableTenders, evaluationRecords, recent] =
      await Promise.all([
        this.tenders.overview(),
        this.bidRepo.countByStatuses([...EVALUABLE_BID_STATUSES], tenderId),
        this.reviews.summary(tenderId),
        this.attention.commandSnapshot(attentionQuery),
        this.evaluationRepo.countByStatus(tenderId),
        this.evaluationRepo.countEvaluableTenders(tenderId),
        this.evaluationRepo.countEvaluations(tenderId),
        this.listActivity({ page: 1, pageSize: 10, tenderId }),
      ]);

    const reviewStatuses = reviewSummary.statuses;
    const notStartedWithoutRecord = Math.max(0, evaluableTenders - evaluationRecords);
    const evaluations = {
      notStarted: (evaluationCounts.not_started ?? 0) + notStartedWithoutRecord,
      inProgress: evaluationCounts.in_progress ?? 0,
      readyForDecision: evaluationCounts.ready_for_decision ?? 0,
      decisionRecorded: evaluationCounts.decision_recorded ?? 0,
    };
    const activeTenders = tenderId ? 1 : tenderStats.openTenderCount + tenderStats.underEvaluationCount;

    return {
      generatedAt: new Date().toISOString(),
      environment: this.options.nodeEnv,
      demoMode: this.options.demoMode,
      demoLabel: 'DEMO / SYNTHETIC',
      advisory:
        'Operational view of existing tenders, evidence, verification, reviews and evaluations. This is not a ranking, award, or government certification.',
      kpis: {
        activeTenders,
        submittedBids,
        openReviews: (reviewStatuses.open ?? 0) + (reviewStatuses.in_review ?? 0),
        pendingClarifications: reviewSummary.openClarifications,
        evidenceGaps: snapshot.evidence.missing,
        verificationIssues:
          snapshot.verification.mismatched + snapshot.verification.notFound + snapshot.verification.error,
        evaluationsInProgress: evaluations.inProgress + evaluations.readyForDecision,
      },
      attention: {
        high: snapshot.summary.highAttention + snapshot.summary.criticalAttention,
        moderate: snapshot.summary.moderateAttention + snapshot.summary.elevatedAttention,
        low: snapshot.summary.lowAttention,
        requiringAttention: snapshot.summary.requiringAttention,
        queue: snapshot.queue,
        advisory: snapshot.summary.advisory,
      },
      evidence: snapshot.evidence,
      verification: {
        matched: snapshot.verification.matched,
        mismatched: snapshot.verification.mismatched,
        notFound: snapshot.verification.notFound,
        error: snapshot.verification.error,
        notRun: snapshot.verification.notRun,
        bySource: Object.fromEntries(
          Object.entries(snapshot.verification.bySource).map(([source, counts]) => [
            source,
            { ...counts, demoSource: true, sourceMode: 'DEMO SOURCE' },
          ]),
        ),
      },
      intelligence: snapshot.intelligence,
      reviews: {
        open: reviewStatuses.open ?? 0,
        inReview: reviewStatuses.in_review ?? 0,
        clarificationRequested: reviewStatuses.clarification_requested ?? 0,
        assessed: reviewStatuses.assessed ?? 0,
        closed: reviewStatuses.closed ?? 0,
        openClarifications: reviewSummary.openClarifications,
      },
      evaluations,
      recentActivity: recent.items,
    };
  }

  async listActivity(query: ActivityQuery) {
    const pagination = parsePagination(query);
    let resourceIdIn: string[] | undefined;
    if (query.bidId) {
      resourceIdIn = [query.bidId];
    } else if (query.tenderId) {
      const [bids, evaluation] = await Promise.all([
        this.bidRepo.listMatching({ tenderId: query.tenderId }),
        this.evaluationRepo.findByTenderId(query.tenderId),
      ]);
      resourceIdIn = [
        query.tenderId,
        ...bids.map((bid) => bid.id),
        ...(evaluation ? [evaluation.id] : []),
      ];
    } else if (query.bidderId) {
      const bids = await this.bidRepo.listMatching({ bidderId: query.bidderId });
      resourceIdIn = [query.bidderId, ...bids.map((bid) => bid.id)];
    }

    const actionIn = query.eventType
      ? PROCUREMENT_AUDIT_ACTIONS.filter((action) => action === query.eventType || action.startsWith(`${query.eventType}.`))
      : [...PROCUREMENT_AUDIT_ACTIONS];

    const listed = await this.auditEvents.listProcurement({
      page: 1,
      pageSize: Math.min(pagination.page * pagination.pageSize + pagination.pageSize, 200),
      actionIn,
      resourceIdIn,
      from: query.from,
      to: query.to,
    });

    const mapped = listed.items
      .map((event) => {
        const metadata = event.metadata ?? event.request;
        const actorKind = actorKindForAction(event.action, metadata);
        return {
          id: event.id,
          timestamp: event.createdAt.toISOString(),
          action: event.action,
          title: activityHeadline(event.action, metadata),
          actorKind,
          actorLabel: actorKind === 'officer' ? 'Officer' : 'System',
          actorName: event.actorName,
          resource: event.resource ?? null,
          resourceId: event.resourceId ?? null,
          href: hrefForActivity({
            action: event.action,
            resource: event.resource,
            resourceId: event.resourceId,
            metadata,
          }),
          demoLabel: 'DEMO / SYNTHETIC',
        };
      })
      .filter((item) => !query.actor || item.actorKind === query.actor);

    const page = mapped.slice(pagination.skip, pagination.skip + pagination.take);
    return toPaginatedResult(page, pagination, mapped.length);
  }

  async search(query: SearchQuery) {
    const q = query.q.trim();
    if (q.length < 2) {
      throw new ValidationError('Search query is too short', [
        { path: 'q', message: 'Enter at least two characters', code: 'too_small' },
      ]);
    }

    const [tenders, bidders, bids] = await Promise.all([
      this.tenderRepo.list({ q, page: 1, pageSize: 5 }),
      this.bidderRepo.searchByName(q, 5),
      this.bidRepo.listMatching({ q }),
    ]);

    const items = [
      ...tenders.items.map((tender) => ({
        type: 'tender' as const,
        id: tender.id,
        label: tender.referenceNumber,
        sublabel: tender.title,
        href: `/bharatbid/tenders/${tender.id}`,
      })),
      ...bidders.map((bidder) => ({
        type: 'bidder' as const,
        id: bidder.id,
        label: bidder.legalName,
        sublabel: bidder.tradeName ?? 'Bidder',
        href: `/bharatbid/bidders/${bidder.id}`,
      })),
      ...bids.slice(0, 5).map((bid) => ({
        type: 'bid' as const,
        id: bid.id,
        label: bid.submissionReference,
        sublabel: `${bid.tender.referenceNumber} · ${bid.bidder.legalName}`,
        href: `/bharatbid/bids/${bid.id}`,
      })),
    ];

    return { q, items, demoLabel: 'DEMO / SYNTHETIC' };
  }

  async generateEvaluationReport(tenderId: string, actorId: string, kind: ReportKind = 'evaluation') {
    const tender = await this.tenderRepo.findById(tenderId);
    if (!tender) {
      throw new NotFoundError('Tender not found');
    }

    const comparison = await this.evaluations.comparison(tenderId);
    const history = comparison.evaluation
      ? await this.evaluations.history(comparison.evaluation.id).catch(() => null)
      : null;
    const spec = buildEvaluationReportSpec(
      {
        ...comparison,
        activity: history?.activity ?? [],
      },
      kind,
    );
    let body: Buffer;
    try {
      body = await renderPdfDocument(spec);
    } catch (error) {
      throw new ExternalServiceError('Report generation failed', {
        provider: 'pdf',
        cause: error instanceof Error ? error.message : 'unknown',
      });
    }

    const filename = `bharatbid-${kind}-${slug(tender.referenceNumber)}.pdf`;
    const key = `reports/${randomUUID()}/${filename}`;
    await this.storage.put({
      key,
      body,
      contentType: 'application/pdf',
    });

    await this.audit?.record({
      actorId,
      action: AUDIT_ACTIONS.EVALUATION_REPORT_GENERATED,
      resource: BHARATBID_AUDIT_RESOURCES.TENDER,
      resourceId: tenderId,
      metadata: { reportType: kind, tenderId },
      status: 'succeeded',
    });

    return {
      body,
      filename,
      contentType: 'application/pdf' as const,
      title: REPORT_KIND_TITLES[kind],
    };
  }
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'tender';
}

export type { ProcurementActorKind };
