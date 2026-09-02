import { describe, expect, it, vi } from 'vitest';

import { BidOperationsService } from './operations.service';
import { EVALUATION_REPORT_DISCLAIMER } from './operations/report';
import { actorKindForAction, hrefForActivity } from './operations/activity';

function service() {
  const tenders = { overview: vi.fn(async () => ({ tenderCount: 5, openTenderCount: 1, underEvaluationCount: 1 })) };
  const tenderRepo = { list: vi.fn(async () => ({ items: [{ id: 't1', referenceNumber: 'GEM/1', title: 'Valves' }], meta: {} })), findById: vi.fn() };
  const bidderRepo = { searchByName: vi.fn(async () => [{ id: 'b1', legalName: 'Delta Engineering', tradeName: null }]) };
  const bidRepo = {
    countByStatuses: vi.fn(async () => 8),
    listMatching: vi.fn(async () => [
      { id: 'bid1', submissionReference: 'BID-0001', tender: { referenceNumber: 'GEM/1' }, bidder: { legalName: 'Delta Engineering' } },
    ]),
  };
  const reviews = {
    summary: vi.fn(async () => ({
      statuses: { open: 2, in_review: 1, clarification_requested: 1, assessed: 0, closed: 1 },
      openClarifications: 1,
    })),
  };
  const attention = {
    commandSnapshot: vi.fn(async () => ({
      summary: {
        totalBids: 3,
        lowAttention: 1,
        moderateAttention: 1,
        elevatedAttention: 0,
        highAttention: 1,
        criticalAttention: 0,
        requiringAttention: 1,
        openReviews: 2,
        pendingClarifications: 1,
        advisory: 'not a ranking',
      },
      queue: [
        {
          id: 'bid2',
          submissionReference: 'BID-0002',
          primaryReason: 'GST mismatch',
          href: '/bharatbid/bids/bid2/intelligence',
        },
      ],
      evidence: { available: 4, missing: 2, processing: 0, conflicts: 1, reviewRequired: 1 },
      verification: {
        matched: 2,
        mismatched: 1,
        notFound: 0,
        error: 0,
        notRun: 1,
        bySource: { gst: { matched: 1, mismatched: 1, notFound: 0, error: 0 } },
      },
      intelligence: {
        coverageAverage: 72,
        reviewRisk: { low: 1, moderate: 1, high: 1, critical: 0 },
        pendingRequirements: 2,
        officerAdvisory: {
          text: 'Officer advisory: inspect remaining evidence.',
          bullets: [],
          disclaimer: 'Decision-support only. Officers remain responsible for qualification decisions.',
        },
      },
    })),
  };
  const evaluations = { comparison: vi.fn(), history: vi.fn() };
  const evaluationRepo = {
    countByStatus: vi.fn(async () => ({ in_progress: 1, not_started: 0, ready_for_decision: 0, decision_recorded: 0 })),
    countEvaluableTenders: vi.fn(async () => 2),
    countEvaluations: vi.fn(async () => 1),
    findByTenderId: vi.fn(),
  };
  const auditEvents = {
    listProcurement: vi.fn(async () => ({
      items: [
        {
          id: 'a1',
          action: 'evaluation.started',
          createdAt: new Date('2026-08-31T10:42:00.000Z'),
          metadata: { actor: 'officer', tenderId: 't1' },
          request: {},
          resource: 'evaluation',
          resourceId: 'e1',
          actorName: 'Officer',
        },
      ],
      meta: { page: 1, pageSize: 10, totalItems: 1 },
    })),
  };
  const storage = { put: vi.fn(async () => ({ key: 'reports/x.pdf' })) };
  const audit = { record: vi.fn(async () => undefined) };

  return new BidOperationsService(
    tenders as never,
    tenderRepo as never,
    bidderRepo as never,
    bidRepo as never,
    reviews as never,
    attention as never,
    evaluations as never,
    evaluationRepo as never,
    auditEvents as never,
    storage as never,
    audit as never,
    { demoMode: true, nodeEnv: 'test' },
  );
}

describe('BidOperationsService dashboard', () => {
  it('aggregates KPIs from existing domain services without inventing scores', async () => {
    const dashboard = await service().dashboard();
    expect(dashboard.kpis.activeTenders).toBe(2);
    expect(dashboard.kpis.submittedBids).toBe(8);
    expect(dashboard.kpis.openReviews).toBe(3);
    expect(dashboard.kpis.pendingClarifications).toBe(1);
    expect(dashboard.kpis.evidenceGaps).toBe(2);
    expect(dashboard.kpis.verificationIssues).toBe(1);
    expect(dashboard.kpis.evaluationsInProgress).toBe(1);
    expect(dashboard.attention.high).toBe(1);
    expect(dashboard.demoLabel).toBe('DEMO / SYNTHETIC');
    expect(dashboard.intelligence?.coverageAverage).toBe(72);
    expect(JSON.stringify(dashboard)).not.toMatch(/AAAPB1234C|winner identified|best bidder|government verified/i);
  });
});

describe('BidOperationsService search', () => {
  it('returns typed tender, bidder, and bid hits without identifier fields', async () => {
    const result = await service().search({ q: 'Delta' });
    expect(result.items.some((item) => item.type === 'bidder' && item.label === 'Delta Engineering')).toBe(true);
    expect(JSON.stringify(result)).not.toMatch(/pan|gstin|cin|udyam/i);
  });
});

describe('activity mapping', () => {
  it('distinguishes officer and system actors and builds deep links', () => {
    expect(actorKindForAction('verification.mismatched')).toBe('system');
    expect(actorKindForAction('review.started', { actor: 'officer' })).toBe('officer');
    expect(
      hrefForActivity({
        action: 'verification.mismatched',
        resource: 'bid',
        resourceId: 'bid-1',
        metadata: { bidSubmissionId: 'bid-1' },
      }),
    ).toBe('/bharatbid/bids/bid-1/verification');
  });
});

describe('evaluation report disclaimer', () => {
  it('states that the report is decision-support only', () => {
    expect(EVALUATION_REPORT_DISCLAIMER).toMatch(/does not constitute an automatic procurement award/i);
    expect(EVALUATION_REPORT_DISCLAIMER).toMatch(/authorized procurement officers/i);
  });
});
