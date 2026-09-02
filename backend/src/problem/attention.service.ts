import { NotFoundError } from '../errors';
import { parsePagination, toPaginatedResult } from '../repositories/query';
import type { BidCrossVerificationRepository } from '../repositories/bid-cross-verification.repository';
import type { BidDocumentRepository } from '../repositories/bid-document.repository';
import type { BidReviewItemRecord, BidReviewItemRepository } from '../repositories/bid-review-item.repository';
import type { BidAttentionRecord, BidSubmissionRepository } from '../repositories/bid-submission.repository';
import type { BidVerificationRepository } from '../repositories/bid-verification.repository';
import type { TenderRequirementRepository } from '../repositories/tender-requirement.repository';
import { scoreAttention } from './attention/score';
import {
  ATTENTION_MODEL_VERSION,
  DEMO_ATTENTION_ADVISORY,
  DEMO_ATTENTION_SCORE_HINT,
  type AttentionBand,
  type AttentionFactor,
  type AttentionInput,
  type AttentionResult,
} from './attention/types';
import {
  buildOfficerAdvisory,
  classifyMakeInIndia,
  demoDigiLockerViews,
  detectInformationGaps,
  evaluateOemAuthorization,
  reviewRiskFromAttention,
  scoreCoverage,
} from './coverage';
import { evaluateRequirement, ruleForRequirement } from './intelligence/requirements';
import type { BidDocumentTypeName, TenderRequirementTypeName } from './types';
import type { VerificationSourceName, VerificationStatusName } from './verification/types';
import type { CrossVerificationStatusName } from './intelligence/types';
import type { AttentionListQuery } from './schemas';

export class BidAttentionService {
  constructor(
    private readonly bids: BidSubmissionRepository,
    private readonly reviews: BidReviewItemRepository,
    private readonly verifications: BidVerificationRepository,
    private readonly crossChecks: BidCrossVerificationRepository,
    private readonly documents: BidDocumentRepository,
    private readonly requirements: TenderRequirementRepository,
  ) {}

  async summary(query: AttentionListQuery = { page: 1, pageSize: 20 }) {
    const scored = await this.scoreMatching(query);
    const bands: Record<AttentionBand, number> = {
      low_attention: 0,
      moderate_attention: 0,
      elevated_attention: 0,
      high_attention: 0,
      critical_attention: 0,
    };
    for (const row of scored) {
      bands[row.result.band] += 1;
    }
    return {
      totalBids: scored.length,
      lowAttention: bands.low_attention,
      moderateAttention: bands.moderate_attention,
      elevatedAttention: bands.elevated_attention,
      highAttention: bands.high_attention,
      criticalAttention: bands.critical_attention,
      requiringAttention: scored.filter((row) => row.result.score > 20).length,
      openReviews: scored.reduce((total, row) => total + row.result.openIssues, 0),
      pendingClarifications: scored.reduce((total, row) => total + row.result.pendingClarifications, 0),
      modelVersion: ATTENTION_MODEL_VERSION,
      advisory: DEMO_ATTENTION_ADVISORY,
      demoLabel: 'DEMO / SYNTHETIC',
    };
  }

  async list(query: AttentionListQuery) {
    const pagination = parsePagination(query);
    const scored = this.sortRows(this.filterScored(await this.scoreMatching(query), query), query);
    const page = scored.slice(pagination.skip, pagination.skip + pagination.take);
    return toPaginatedResult(
      page.map((row) => this.toListItem(row)),
      pagination,
      scored.length,
    );
  }

  async get(bidId: string) {
    const scored = await this.scoreBid(bidId);
    return this.toDetail(scored);
  }

  async detailsForTender(tenderId: string) {
    const scored = await this.scoreMatching({ tenderId, page: 1, pageSize: 50 });
    return scored.map((row) => this.toDetail(row));
  }

  async factors(bidId: string) {
    const scored = await this.scoreBid(bidId);
    return {
      score: scored.result.score,
      unadjustedScore: scored.result.unadjustedScore,
      band: scored.result.band,
      bandLabel: scored.result.bandLabel,
      modelVersion: scored.result.modelVersion,
      factors: scored.result.factors.map((factor) => this.toFactorView(factor)),
      advisory: DEMO_ATTENTION_ADVISORY,
      scoreHint: DEMO_ATTENTION_SCORE_HINT,
    };
  }

  async history(bidId: string) {
    const scored = await this.scoreBid(bidId);
    return {
      modelVersion: scored.result.modelVersion,
      current: scored.result.score,
      unadjusted: scored.result.unadjustedScore,
      entries: scored.result.history,
      advisory:
        'Computed on read from current evidence, verification, cross-check and review state. Historical machine findings are not deleted when an officer assesses an item.',
    };
  }

  async summarizeForBid(bidId: string) {
    const scored = await this.scoreBid(bidId);
    return this.toSummary(scored);
  }

  async commandSnapshot(query: AttentionListQuery = { page: 1, pageSize: 20 }) {
    const scored = await this.scoreMatching(query);
    const bands: Record<AttentionBand, number> = {
      low_attention: 0,
      moderate_attention: 0,
      elevated_attention: 0,
      high_attention: 0,
      critical_attention: 0,
    };
    const evidence = {
      available: 0,
      missing: 0,
      processing: 0,
      conflicts: 0,
      reviewRequired: 0,
    };
    const verification = {
      matched: 0,
      mismatched: 0,
      notFound: 0,
      error: 0,
      notRun: 0,
      bySource: {} as Record<string, { matched: number; mismatched: number; notFound: number; error: number }>,
    };
    for (const row of scored) {
      bands[row.result.band] += 1;
      for (const status of row.evidenceStatuses) {
        if (status === 'evidence_available') evidence.available += 1;
        else if (status === 'evidence_missing') evidence.missing += 1;
        else if (status === 'evidence_processing') evidence.processing += 1;
        else if (status === 'evidence_conflict') evidence.conflicts += 1;
      }
      for (const evaluation of row.requirementEvaluations) {
        if (evaluation === 'review_required') evidence.reviewRequired += 1;
      }
      if (row.verificationSummary.total === 0) {
        verification.notRun += 1;
      }
      verification.matched += row.verificationSummary.matched;
      verification.mismatched += row.verificationSummary.mismatched;
      verification.notFound += row.verificationSummary.notFound;
      verification.error += row.verificationSummary.errors;
      for (const item of row.verificationSources) {
        const bucket = verification.bySource[item.source] ?? {
          matched: 0,
          mismatched: 0,
          notFound: 0,
          error: 0,
        };
        if (item.status === 'matched') bucket.matched += 1;
        else if (item.status === 'mismatched') bucket.mismatched += 1;
        else if (item.status === 'not_found') bucket.notFound += 1;
        else if (item.status === 'error') bucket.error += 1;
        verification.bySource[item.source] = bucket;
      }
    }
    const ranked = this.sortRows(scored, { ...query, sortBy: 'score', sortOrder: 'desc' });
    return {
      summary: {
        totalBids: scored.length,
        lowAttention: bands.low_attention,
        moderateAttention: bands.moderate_attention,
        elevatedAttention: bands.elevated_attention,
        highAttention: bands.high_attention,
        criticalAttention: bands.critical_attention,
        requiringAttention: scored.filter((row) => row.result.score > 20).length,
        openReviews: scored.reduce((total, row) => total + row.result.openIssues, 0),
        pendingClarifications: scored.reduce((total, row) => total + row.result.pendingClarifications, 0),
        modelVersion: ATTENTION_MODEL_VERSION,
        advisory: DEMO_ATTENTION_ADVISORY,
        demoLabel: 'DEMO / SYNTHETIC',
      },
      queue: ranked.slice(0, 8).map((row) => this.toQueueItem(row)),
      evidence,
      verification,
      intelligence: {
        coverageAverage: scored.length
          ? Math.round(scored.reduce((total, row) => total + row.coverage.score, 0) / scored.length)
          : null,
        reviewRisk: {
          low: scored.filter((row) => row.risk.level === 'LOW').length,
          moderate: scored.filter((row) => row.risk.level === 'MODERATE').length,
          high: scored.filter((row) => row.risk.level === 'HIGH').length,
          critical: scored.filter((row) => row.risk.level === 'CRITICAL').length,
        },
        pendingRequirements: evidence.missing,
        officerAdvisory: ranked[0]?.advisory ?? {
          text: 'Officer advisory: inspect tenders and bids from this Command Center. No bid intelligence is loaded yet.',
          bullets: [],
          disclaimer: 'Decision-support only. Officers remain responsible for qualification decisions.',
        },
      },
    };
  }

  private async scoreBid(bidId: string): Promise<ScoredBid> {
    const bid = await this.bids.findById(bidId);
    if (!bid) {
      throw new NotFoundError('Bid submission not found');
    }
    const [rows] = await this.scoreBids([
      {
        ...bid,
        tender: {
          id: bid.tender.id,
          referenceNumber: bid.tender.referenceNumber,
          title: bid.tender.title,
          status: bid.tender.status,
          category: bid.tender.category,
          closingDate: bid.tender.closingDate,
        },
        bidder: { id: bid.bidder.id, legalName: bid.bidder.legalName },
      },
    ]);
    if (!rows) {
      throw new NotFoundError('Bid submission not found');
    }
    return rows;
  }

  private async scoreMatching(query: AttentionListQuery): Promise<ScoredBid[]> {
    const bids = await this.bids.listMatching({
      tenderId: query.tenderId,
      bidderId: query.bidderId,
      status: query.status,
      category: query.category,
      q: query.q,
      search: query.search,
    });
    return this.scoreBids(bids);
  }

  private async scoreBids(bids: BidAttentionRecord[]): Promise<ScoredBid[]> {
    const bidIds = bids.map((bid) => bid.id);
    const tenderIds = [...new Set(bids.map((bid) => bid.tenderId))];
    const [reviews, verifications, crossChecks, documents, requirements] = await Promise.all([
      this.reviews.listByBidIds(bidIds),
      this.verifications.listLatestByBidIds(bidIds),
      this.crossChecks.listLatestByBidIds(bidIds),
      this.documents.listCurrentByBidIds(bidIds),
      this.requirements.listByTenderIds(tenderIds),
    ]);
    const reviewsByBid = groupBy(reviews, (item) => item.bidSubmissionId);
    const verificationsByBid = groupBy(verifications, (item) => item.bidSubmissionId);
    const crossByBid = groupBy(crossChecks, (item) => item.bidSubmissionId);
    const documentsByBid = groupBy(documents, (item) => item.bidSubmissionId);
    const requirementsByTender = groupBy(requirements, (item) => item.tenderId);

    return bids.map((bid) => {
      const bidReviews = reviewsByBid.get(bid.id) ?? [];
      const bidVerifications = verificationsByBid.get(bid.id) ?? [];
      const bidCross = crossByBid.get(bid.id) ?? [];
      const bidDocuments = documentsByBid.get(bid.id) ?? [];
      const bidRequirements = requirementsByTender.get(bid.tenderId) ?? [];
      const requirementSignals = this.requirementSignals(bidRequirements, bidDocuments, bidVerifications, bidCross);
      const input: AttentionInput = {
        requirements: requirementSignals,
        verifications: bidVerifications.map((item) => ({ id: item.id, source: item.source, status: item.status })),
        crossChecks: bidCross.map((item) => ({
          id: item.id,
          comparisonType: item.comparisonType,
          status: item.status,
          leftSource: item.leftSource,
          rightSource: item.rightSource,
        })),
        reviews: bidReviews.map((item) => this.reviewSignal(item)),
        documents: bidDocuments.map((item) => ({
          id: item.id,
          tenderRequirementId: item.tenderRequirementId,
          extractionStatus: item.extractionStatus,
        })),
      };
      const result = scoreAttention(input);
      const verificationSummaryValue = verificationSummary(bidVerifications);
      const debarmentRecordFound = bidVerifications.some(
        (item) => item.source === 'debarment' && item.status === 'matched',
      );
      const evidenceDocs = bidDocuments.map((item) => ({
        id: item.id,
        originalFilename: item.originalFilename,
        documentType: item.documentType,
        extractedText: 'extractedText' in item ? (item.extractedText as string | null) : null,
      }));
      const mii = classifyMakeInIndia(evidenceDocs);
      const oem = evaluateOemAuthorization(evidenceDocs, bid.tender.category);
      const gaps = detectInformationGaps({
        documents: evidenceDocs,
        legalName: bid.bidder.legalName,
        oem,
        mii,
        mandatoryMissing: requirementSignals
          .filter((item) => item.mandatory && item.evidenceStatus === 'evidence_missing')
          .map((item) => ({ id: item.id, name: item.name })),
      });
      const coverage = scoreCoverage({
        evidenceCoveragePercent: evidenceCoverage(requirementSignals),
        matchedVerifications: verificationSummaryValue.matched,
        mismatchedVerifications: verificationSummaryValue.mismatched,
        notFoundVerifications: verificationSummaryValue.notFound,
        errorVerifications: verificationSummaryValue.errors,
        consistentCrossChecks: bidCross.filter((item) => item.status === 'consistent').length,
        inconsistentCrossChecks: bidCross.filter((item) => item.status === 'inconsistent').length,
        missingMandatory: requirementSignals.filter((item) => item.mandatory && item.evidenceStatus === 'evidence_missing').length,
        openReviews: result.openIssues,
        pendingClarifications: result.pendingClarifications,
        debarmentRecordFound,
      });
      const risk = reviewRiskFromAttention(result.band, { debarmentRecordFound });
      const advisory = buildOfficerAdvisory({
        coverage,
        riskLabel: risk.label,
        attentionScore: result.score,
        pendingRequirements: requirementSignals.filter((item) => item.mandatory && item.evidenceStatus === 'evidence_missing').length,
        verificationIssues: verificationSummaryValue.mismatched + verificationSummaryValue.notFound + verificationSummaryValue.errors,
        openReviews: result.openIssues,
        gaps,
        debarmentRecordFound,
      });
      return {
        bid,
        result,
        evidenceCoveragePercent: evidenceCoverage(requirementSignals),
        verificationSummary: verificationSummaryValue,
        lastReviewAt: lastReviewAt(bidReviews),
        reviewStatuses: bidReviews.map((item) => item.status),
        hasRespondedClarification: bidReviews.some((item) => item.clarifications.some((row) => row.status === 'responded')),
        evidenceStatuses: requirementSignals.map((item) => item.evidenceStatus),
        requirementEvaluations: requirementSignals.map((item) => item.evaluation),
        verificationSources: bidVerifications.map((item) => ({ source: item.source, status: item.status })),
        coverage,
        risk,
        advisory,
        makeInIndia: mii,
        oem,
        digiLocker: demoDigiLockerViews(evidenceDocs),
        gaps,
      };
    });
  }

  private requirementSignals(
    requirements: Array<{
      id: string;
      name: string;
      requirementType: string;
      mandatory: boolean;
    }>,
        documents: Array<{
          id: string;
          documentType: string;
          tenderRequirementId: string | null;
          extractionStatus: string;
          originalFilename: string;
          extractedText?: string | null;
        }>,
    verifications: Array<{ id: string; source: string; status: string }>,
    crossChecks: Array<{ id: string; comparisonType: string; status: string }>,
  ): AttentionInput['requirements'] {
    return requirements.map((requirement) => {
      const rule = ruleForRequirement({
        name: requirement.name,
        requirementType: requirement.requirementType as TenderRequirementTypeName,
      });
      const linked = documents.filter(
        (doc) =>
          doc.tenderRequirementId === requirement.id ||
          (rule.documentTypes as string[]).includes(doc.documentType),
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
      const evaluation = evaluateRequirement(rule, requirement.mandatory, {
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
      return {
        id: requirement.id,
        name: requirement.name,
        mandatory: requirement.mandatory,
        evidenceStatus: evaluation.evidenceStatus,
        evaluation: evaluation.evaluation,
        verificationId: verification?.id ?? null,
        verificationSource: verification?.source ?? rule.verificationSource,
        crossVerificationId: crossCheck?.id ?? null,
        comparisonType: crossCheck?.comparisonType ?? null,
      };
    });
  }

  private reviewSignal(row: BidReviewItemRecord): AttentionInput['reviews'][number] {
    const latest = row.assessments.find((item) => item.isLatest) ?? row.assessments[0];
    const openClarification = row.clarifications.find((item) => item.status === 'requested');
    const responded = row.clarifications.find((item) => item.status === 'responded');
    return {
      id: row.id,
      issueType: row.issueType,
      status: row.status,
      title: row.title,
      mandatory: row.mandatory,
      fingerprint: row.fingerprint,
      requirementId: row.requirementId,
      verificationId: row.verificationId,
      verificationSource: row.verification?.source ?? null,
      crossVerificationId: row.crossVerificationId,
      comparisonType: row.crossVerification?.comparisonType ?? null,
      latestAssessment: latest?.assessment ?? null,
      clarificationStatus: openClarification ? 'requested' : responded ? 'responded' : null,
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private filterScored(rows: ScoredBid[], query: AttentionListQuery): ScoredBid[] {
    return rows.filter((row) => {
      if (query.band && row.result.band !== query.band) {
        return false;
      }
      if (query.reviewStatus && !row.reviewStatuses.includes(query.reviewStatus)) {
        return false;
      }
      if (query.verificationState) {
        const counts = row.verificationSummary;
        const matched =
          (query.verificationState === 'matched' && counts.matched > 0) ||
          (query.verificationState === 'mismatched' && counts.mismatched > 0) ||
          (query.verificationState === 'not_found' && counts.notFound > 0) ||
          (query.verificationState === 'error' && counts.errors > 0);
        if (!matched) {
          return false;
        }
      }
      if (query.clarificationState === 'requested' && row.result.pendingClarifications === 0) {
        return false;
      }
      if (query.clarificationState === 'none' && row.result.pendingClarifications > 0) {
        return false;
      }
      if (query.clarificationState === 'responded' && !row.hasRespondedClarification) {
        return false;
      }
      return true;
    });
  }

  private sortRows(rows: ScoredBid[], query: AttentionListQuery): ScoredBid[] {
    const direction = query.sortOrder === 'asc' ? 1 : -1;
    const sortBy = query.sortBy ?? 'score';
    return [...rows].sort((a, b) => {
      const delta = this.sortValue(a, sortBy) - this.sortValue(b, sortBy);
      if (delta !== 0) {
        return direction * Math.sign(delta);
      }
      return a.bid.submissionReference.localeCompare(b.bid.submissionReference);
    });
  }

  private sortValue(row: ScoredBid, sortBy: string): number {
    if (sortBy === 'evidence_coverage') {
      return row.evidenceCoveragePercent ?? -1;
    }
    if (sortBy === 'last_activity') {
      const stamp = row.lastReviewAt ?? row.bid.updatedAt.toISOString();
      return new Date(stamp).getTime();
    }
    if (sortBy === 'open_reviews') {
      return row.result.openIssues;
    }
    if (sortBy === 'closing_date') {
      return row.bid.tender.closingDate ? new Date(row.bid.tender.closingDate).getTime() : 0;
    }
    return row.result.score;
  }

  private toQueueItem(row: ScoredBid) {
    const primary = [...row.result.factors]
      .filter((factor) => factor.currentPoints > 0)
      .sort((left, right) => right.currentPoints - left.currentPoints)[0];
    const currentState = currentReviewState(row.reviewStatuses);
    return {
      ...this.toListItem(row),
      primaryReason: primary?.description ?? 'No outstanding attention factors',
      currentState,
      href: `/bharatbid/bids/${row.bid.id}/intelligence`,
    };
  }

  private toListItem(row: ScoredBid) {
    return {
      id: row.bid.id,
      submissionReference: row.bid.submissionReference,
      tenderId: row.bid.tenderId,
      tenderReference: row.bid.tender.referenceNumber,
      tenderTitle: row.bid.tender.title,
      tenderCategory: row.bid.tender.category,
      tenderClosingDate: row.bid.tender.closingDate?.toISOString() ?? null,
      bidderId: row.bid.bidderId,
      bidderLegalName: row.bid.bidder.legalName,
      status: row.bid.status,
      score: row.result.score,
      band: row.result.band,
      bandLabel: row.result.bandLabel,
      openIssues: row.result.openIssues,
      pendingClarifications: row.result.pendingClarifications,
      evidenceCoveragePercent: row.evidenceCoveragePercent,
      verificationSummary: row.verificationSummary,
      lastReviewAt: row.lastReviewAt,
      modelVersion: row.result.modelVersion,
    };
  }

  private toDetail(row: ScoredBid) {
    return {
      ...this.toListItem(row),
      unadjustedScore: row.result.unadjustedScore,
      scoreHint: DEMO_ATTENTION_SCORE_HINT,
      advisory: DEMO_ATTENTION_ADVISORY,
      demoLabel: 'DEMO / SYNTHETIC',
      factors: row.result.factors.map((factor) => this.toFactorView(factor)),
      history: row.result.history,
      coverage: row.coverage,
      reviewRisk: row.risk,
      officerAdvisory: row.advisory,
      makeInIndia: row.makeInIndia,
      oemAuthorization: row.oem,
      digiLockerDemo: row.digiLocker,
      informationGaps: row.gaps,
    };
  }

  private toSummary(row: ScoredBid) {
    return {
      score: row.result.score,
      band: row.result.band,
      bandLabel: row.result.bandLabel,
      openIssues: row.result.openIssues,
      pendingClarifications: row.result.pendingClarifications,
      evidenceCoveragePercent: row.evidenceCoveragePercent,
      modelVersion: row.result.modelVersion,
      scoreHint: DEMO_ATTENTION_SCORE_HINT,
      coverageScore: row.coverage.score,
      reviewRisk: row.risk.level,
      officerAdvisory: row.advisory.text,
    };
  }

  private toFactorView(factor: AttentionFactor) {
    return {
      id: factor.id,
      type: factor.type,
      category: factor.category,
      origin: factor.origin,
      originLabel: factor.origin === 'machine' ? 'Machine signal' : 'Human signal',
      originalPoints: factor.originalPoints,
      currentPoints: factor.currentPoints,
      description: factor.description,
      adjustmentReason: factor.adjustmentReason,
      source: factor.source,
    };
  }
}

interface ScoredBid {
  bid: BidAttentionRecord;
  result: AttentionResult;
  evidenceCoveragePercent: number | null;
  verificationSummary: { total: number; matched: number; mismatched: number; notFound: number; errors: number };
  lastReviewAt: string | null;
  reviewStatuses: string[];
  hasRespondedClarification: boolean;
  evidenceStatuses: string[];
  requirementEvaluations: string[];
  verificationSources: Array<{ source: string; status: string }>;
  coverage: ReturnType<typeof scoreCoverage>;
  risk: ReturnType<typeof reviewRiskFromAttention>;
  advisory: ReturnType<typeof buildOfficerAdvisory>;
  makeInIndia: ReturnType<typeof classifyMakeInIndia>;
  oem: ReturnType<typeof evaluateOemAuthorization>;
  digiLocker: ReturnType<typeof demoDigiLockerViews>;
  gaps: ReturnType<typeof detectInformationGaps>;
}

function currentReviewState(statuses: string[]): string {
  if (statuses.includes('clarification_requested')) {
    return 'Clarification requested';
  }
  if (statuses.includes('open') || statuses.includes('in_review')) {
    return 'Open review';
  }
  if (statuses.includes('assessed')) {
    return 'Assessed';
  }
  if (statuses.includes('closed') && statuses.every((status) => status === 'closed')) {
    return 'Reviews closed';
  }
  return 'No open review';
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

function evidenceCoverage(requirements: AttentionInput['requirements']): number | null {
  const mandatory = requirements.filter((item) => item.mandatory);
  if (mandatory.length === 0) {
    return null;
  }
  const withEvidence = mandatory.filter((item) =>
    ['evidence_available', 'evidence_conflict', 'evidence_processing'].includes(item.evidenceStatus),
  );
  return Math.round((withEvidence.length / mandatory.length) * 100);
}

function verificationSummary(items: Array<{ status: string }>) {
  return {
    total: items.length,
    matched: items.filter((item) => item.status === 'matched').length,
    mismatched: items.filter((item) => item.status === 'mismatched').length,
    notFound: items.filter((item) => item.status === 'not_found').length,
    errors: items.filter((item) => item.status === 'error').length,
  };
}

function lastReviewAt(rows: BidReviewItemRecord[]): string | null {
  if (rows.length === 0) {
    return null;
  }
  return rows.reduce((latest, row) => (row.updatedAt > latest ? row.updatedAt : latest), rows[0].updatedAt).toISOString();
}

export { ATTENTION_MODEL_VERSION, DEMO_ATTENTION_ADVISORY };
