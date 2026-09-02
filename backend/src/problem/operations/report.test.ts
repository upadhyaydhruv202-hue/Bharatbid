import { describe, expect, it } from 'vitest';

import { buildEvaluationReportSpec, EVALUATION_REPORT_DISCLAIMER } from './report';

const comparison = {
  tender: {
    referenceNumber: 'GEM/2026/B/CPCL/001',
    title: 'Valves',
    organizationName: 'CPCL',
    departmentName: 'Contracts',
    category: 'Goods',
    status: 'open',
    closingDate: '2026-09-15T00:00:00.000Z',
  },
  evaluation: { statusLabel: 'In progress', startedBy: { displayName: 'Officer' }, recordedBy: null },
  overview: { submittedBids: 2, comparedBids: 2, evidenceGaps: 1, verificationIssues: 1, openReviews: 1, pendingClarifications: 0 },
  requirements: [{ name: 'GST registration', requirementType: 'statutory', mandatory: true }],
  bids: [
    {
      submissionReference: 'BID-0001',
      bidderLegalName: 'Bayfront Engineering',
      status: 'submitted',
      evidenceCoveragePercent: 80,
      verificationLabel: 'Matched (demo source)',
      crossCheckLabel: 'Consistent (demo sources)',
      attention: { bandLabel: 'Low attention', score: 8 },
      readinessLabel: 'READY',
      latestDecision: null,
      requirementCells: [{ name: 'GST registration', cellLabel: 'PASS', documents: [{ originalFilename: 'DEMO_GST.txt' }] }],
      verificationSummary: { matched: 1, mismatched: 0, notFound: 0, errors: 0, total: 1 },
      crossCheckSummary: { consistent: 1, inconsistent: 0, total: 1 },
      reviewSummary: { open: 0, inReview: 0, clarificationRequested: 0, assessed: 0, closed: 1 },
    },
  ],
  notes: [],
  decisions: [],
  demoLabel: 'DEMO / SYNTHETIC',
};

describe('evaluation report spec', () => {
  it('includes the decision-support disclaimer and DEMO label without identifiers', () => {
    const spec = buildEvaluationReportSpec(comparison, 'evaluation');
    const text = JSON.stringify(spec);
    expect(text).toContain(EVALUATION_REPORT_DISCLAIMER);
    expect(text).toContain('DEMO / SYNTHETIC DATA');
    expect(text).not.toMatch(/AAAPB1234C|winner identified|best bidder|government verified/i);
  });
});
