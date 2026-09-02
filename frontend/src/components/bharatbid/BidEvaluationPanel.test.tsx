import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';

import { BidEvaluationPanel } from './BidEvaluationPanel';
import type { BidEvaluationSummary } from '../../services/bharatbid';

afterEach(() => {
  cleanup();
});

const summary: BidEvaluationSummary = {
  bidId: 'b1',
  tenderId: 't1',
  evaluation: {
    id: 'e1',
    tenderId: 't1',
    status: 'in_progress',
    statusLabel: 'In progress',
    startedAt: '2026-08-30T16:10:00.000Z',
    startedBy: { id: 'u1', displayName: 'Demo Officer' },
    readyAt: null,
    readyBy: null,
    recordedAt: null,
    recordedBy: null,
    lastUpdated: '2026-08-30T16:18:00.000Z',
    lastUpdatedBy: { id: 'u1', displayName: 'Demo Officer' },
    tender: {
      id: 't1',
      referenceNumber: 'GEM/2026/B/CPCL/001',
      title: 'Valves',
      category: 'Goods',
      status: 'open',
      closingDate: '2026-09-15T18:30:00.000Z',
    },
    advisory: 'Decision support only.',
    demoLabel: 'DEMO / SYNTHETIC',
  },
  readiness: 'review_required',
  readinessLabel: 'REVIEW_REQUIRED',
  latestDecision: null,
  notes: [
    {
      id: 'n1',
      evaluationId: 'e1',
      bidSubmissionId: 'b1',
      bidReference: 'BID-A',
      note: 'Technical documentation requires additional clarification before evaluation.',
      attemptNumber: 1,
      isLatest: true,
      createdBy: { id: 'u1', displayName: 'Demo Officer' },
      createdAt: '2026-08-30T16:18:00.000Z',
    },
  ],
  decisions: [],
  comparisonPath: '/bharatbid/evaluation/t1',
  advisory: 'This workspace supports human procurement evaluation using available evidence and system findings.',
  decisionAdvisory: 'Officer-entered decision-support record. This is not an award.',
  demoLabel: 'DEMO / SYNTHETIC',
};

describe('BidEvaluationPanel', () => {
  it('shows evaluation status, readiness, notes, and a comparison link', () => {
    render(
      <MemoryRouter>
        <BidEvaluationPanel summary={summary} canWrite />
      </MemoryRouter>,
    );

    expect(screen.getByText('In progress')).toBeInTheDocument();
    expect(screen.getByText('Review required')).toBeInTheDocument();
    expect(screen.getByText(/Technical documentation requires additional/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open tender comparison' })).toHaveAttribute(
      'href',
      '/bharatbid/evaluation/t1',
    );
  });
});
