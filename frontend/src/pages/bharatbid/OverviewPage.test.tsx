import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AuthProvider } from '../../auth/AuthProvider';
import { TEST_SESSION } from '../../test/session';
import { BharatBidOverviewPage } from './OverviewPage';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
});

const dashboard = {
  generatedAt: '2026-08-31T00:00:00.000Z',
  environment: 'test',
  demoMode: true,
  demoLabel: 'DEMO / SYNTHETIC',
  advisory: 'Operational view of existing tenders. This is not a ranking, award, or government certification.',
  kpis: {
    activeTenders: 2,
    submittedBids: 8,
    openReviews: 3,
    pendingClarifications: 1,
    evidenceGaps: 4,
    verificationIssues: 2,
    evaluationsInProgress: 1,
  },
  attention: {
    high: 3,
    moderate: 5,
    low: 8,
    requiringAttention: 3,
    queue: [
      {
        id: 'bid2',
        submissionReference: 'BID-GEM2026BCPCL001-0002',
        tenderId: 't1',
        tenderReference: 'GEM/2026/B/CPCL/001',
        tenderTitle: 'Valves',
        bidderLegalName: 'Delta Petrochem Traders',
        bandLabel: 'High attention',
        primaryReason: 'GST ↔ MCA inconsistency',
        currentState: 'Open review',
        href: '/bharatbid/bids/bid2/intelligence',
      },
    ],
    advisory: 'Officer Review Priority is not a ranking.',
  },
  evidence: { available: 10, missing: 4, processing: 1, conflicts: 1, reviewRequired: 2 },
  verification: {
    matched: 3,
    mismatched: 1,
    notFound: 1,
    error: 0,
    notRun: 2,
    bySource: { gst: { matched: 1, mismatched: 1, notFound: 0, error: 0, sourceMode: 'DEMO SOURCE' } },
  },
  reviews: { open: 2, inReview: 1, clarificationRequested: 1, assessed: 0, closed: 1, openClarifications: 1 },
  evaluations: { notStarted: 1, inProgress: 1, readyForDecision: 0, decisionRecorded: 0 },
  intelligence: {
    coverageAverage: 74,
    reviewRisk: { low: 8, moderate: 5, high: 3, critical: 0 },
    pendingRequirements: 4,
    officerAdvisory: {
      text: 'Officer advisory: inspect remaining evidence and DEMO source results.',
      bullets: ['4 mandatory requirement(s) still lack associated evidence.'],
      disclaimer: 'Decision-support only. Officers remain responsible for qualification decisions.',
    },
  },
  recentActivity: [
    {
      id: 'a1',
      timestamp: '2026-08-31T10:42:00.000Z',
      action: 'evaluation.started',
      title: 'Started officer evaluation',
      actorKind: 'officer',
      actorLabel: 'Officer',
      actorName: 'Demo Officer',
      href: '/bharatbid/evaluation/t1',
      demoLabel: 'DEMO / SYNTHETIC',
    },
  ],
  capabilities: { createTender: true, createBid: true, generateReport: true },
};

function jsonResponse(data: unknown, meta: Record<string, unknown> = {}): Response {
  return {
    ok: true,
    status: 200,
    json: async () => ({ success: true, data, meta }),
  } as Response;
}

describe('BharatBidOverviewPage', () => {
  it('renders command center KPIs, attention, health panels, and officer actions', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo) => {
        const url = String(input);
        if (url.includes('/bharatbid/dashboard')) {
          return jsonResponse(dashboard);
        }
        if (url.includes('/tenders')) {
          return jsonResponse(
            { items: [{ id: 't1', referenceNumber: 'GEM/2026/B/CPCL/001', title: 'Valves' }] },
            { page: 1, pageSize: 50, totalItems: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
          );
        }
        if (url.includes('/notifications')) {
          return jsonResponse({ items: [] });
        }
        return jsonResponse({});
      }),
    );

    render(
      <MemoryRouter>
        <AuthProvider
          initialSession={{
            ...TEST_SESSION,
            user: { ...TEST_SESSION.user, permissions: ['tenders.read', 'tenders.write', 'bids.read', 'bids.write', 'notifications.read'] },
          }}
        >
          <BharatBidOverviewPage />
        </AuthProvider>
      </MemoryRouter>,
    );

    expect((await screen.findAllByText('Procurement Intelligence Command Center')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('DEMO / SYNTHETIC').length).toBeGreaterThan(0);
    expect(screen.getByText('Active tenders')).toBeInTheDocument();
    expect(screen.getByText('Submitted bids')).toBeInTheDocument();
    expect(screen.getByText('Officer Review Priority')).toBeInTheDocument();
    expect(screen.getByText('Evidence health')).toBeInTheDocument();
    expect(screen.getByText('Bid intelligence')).toBeInTheDocument();
    expect(screen.getByText('Officer advisory')).toBeInTheDocument();
    expect(screen.getByText('Verification health')).toBeInTheDocument();
    expect(screen.getByText('Review workload')).toBeInTheDocument();
    expect(screen.getByText('Evaluation workload')).toBeInTheDocument();
    expect(screen.getByText('BID-GEM2026BCPCL001-0002')).toBeInTheDocument();
    expect(screen.getByText('GST ↔ MCA inconsistency')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Create tender' }).length).toBeGreaterThan(0);
    expect(screen.getByText(/not a ranking, award, or government certification/i)).toBeInTheDocument();
  });

  it('hides create tender for a reviewer', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo) => {
        const url = String(input);
        if (url.includes('/bharatbid/dashboard')) {
          return jsonResponse({ ...dashboard, capabilities: { createTender: false, createBid: false, generateReport: false } });
        }
        if (url.includes('/tenders')) {
          return jsonResponse(
            { items: [] },
            { page: 1, pageSize: 50, totalItems: 0, totalPages: 0, hasNextPage: false, hasPreviousPage: false },
          );
        }
        return jsonResponse({ items: [] });
      }),
    );

    render(
      <MemoryRouter>
        <AuthProvider
          initialSession={{
            ...TEST_SESSION,
            user: { ...TEST_SESSION.user, role: 'reviewer', roles: ['reviewer'], permissions: ['tenders.read', 'bids.read', 'notifications.read'] },
          }}
        >
          <BharatBidOverviewPage />
        </AuthProvider>
      </MemoryRouter>,
    );

    expect((await screen.findAllByText('Procurement Intelligence Command Center')).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: 'Create tender' })).not.toBeInTheDocument();
  });
});
