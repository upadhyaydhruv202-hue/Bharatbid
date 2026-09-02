import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';

import { BidIntelligencePanel } from './BidIntelligencePanel';
import type { BidAttentionDetail } from '../../services/bharatbid';

afterEach(() => {
  cleanup();
});

const intelligence: BidAttentionDetail = {
  id: 'bid2',
  submissionReference: 'BID-GEM2026BCPCL001-0002',
  tenderId: 't1',
  tenderReference: 'GEM/2026/B/CPCL/001',
  tenderTitle: 'Valves',
  tenderCategory: 'Goods',
  tenderClosingDate: null,
  bidderId: 'b3',
  bidderLegalName: 'Delta Petrochem Traders',
  status: 'submitted',
  score: 62,
  band: 'high_attention',
  bandLabel: 'High attention',
  openIssues: 2,
  pendingClarifications: 1,
  evidenceCoveragePercent: 40,
  verificationSummary: { total: 2, matched: 0, mismatched: 1, notFound: 0, errors: 0 },
  lastReviewAt: null,
  modelVersion: 'attention-v1',
  unadjustedScore: 62,
  scoreHint: 'Review-priority indicator based on available evidence, verification, cross-check and review signals.',
  advisory:
    'Decision-support only: This indicator prioritizes bids for human review using available evidence, verification, cross-check and review signals. It does not determine bidder eligibility, fraud, rejection or award.',
  demoLabel: 'DEMO / SYNTHETIC',
  factors: [
    {
      id: 'review:rev-cross',
      type: 'cross_source_inconsistency',
      category: 'cross',
      origin: 'machine',
      originLabel: 'Machine signal',
      originalPoints: 22,
      currentPoints: 22,
      description: 'GST ↔ MCA comparison reported a difference after safe normalization. This is not a fraud finding.',
      adjustmentReason: null,
      source: { kind: 'cross_check', id: 'c1', label: 'GST ↔ MCA' },
    },
    {
      id: 'review:rev-udyam',
      type: 'optional_evidence_missing',
      category: 'evidence',
      origin: 'machine',
      originLabel: 'Machine signal',
      originalPoints: 5,
      currentPoints: 5,
      description: 'Optional requirement "Udyam" has no associated evidence.',
      adjustmentReason: 'Clarification is requested. The issue stays visible and current contribution is unchanged.',
      source: { kind: 'review', id: 'rev-udyam', label: 'Udyam / MSME evidence if claimed' },
    },
  ],
  history: [],
};

describe('BidIntelligencePanel', () => {
  it('shows the score, band text, factor breakdown, and traceability links', () => {
    render(
      <MemoryRouter>
        <BidIntelligencePanel bidId="bid2" intelligence={intelligence} />
      </MemoryRouter>,
    );

    expect(screen.getByLabelText('Officer attention score 62 of 100, High attention')).toBeInTheDocument();
    expect(screen.getByText('High attention')).toBeInTheDocument();
    expect(screen.getByText('GST ↔ MCA')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /GST ↔ MCA/i })).toHaveAttribute('href', '/bharatbid/bids/bid2/cross-checks');
    expect(screen.getByRole('link', { name: /Udyam/i })).toHaveAttribute('href', '/bharatbid/review/rev-udyam');
    expect(screen.getByText('Decision-support only')).toBeInTheDocument();
    expect(screen.getAllByText('Machine signal').length).toBeGreaterThan(0);
    expect(screen.queryByText(/edit score|likely winner|1st|recommended bidder/i)).not.toBeInTheDocument();
  });
});
