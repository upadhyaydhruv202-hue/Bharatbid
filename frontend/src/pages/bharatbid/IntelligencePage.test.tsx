import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AuthProvider } from '../../auth/AuthProvider';
import { TEST_SESSION } from '../../test/session';
import { ToastProvider } from '../../ui';
import { IntelligencePage } from './IntelligencePage';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
});

const item = {
  id: 'bid2',
  submissionReference: 'BID-GEM2026BCPCL001-0002',
  tenderId: 't1',
  tenderReference: 'GEM/2026/B/CPCL/001',
  tenderTitle: 'Valves',
  tenderCategory: 'Goods',
  tenderClosingDate: '2026-09-15T00:00:00.000Z',
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
  lastReviewAt: '2026-08-30T12:00:00.000Z',
  modelVersion: 'attention-v1',
};

function jsonResponse(data: unknown, meta: Record<string, unknown> = {}): Response {
  return {
    ok: true,
    status: 200,
    json: async () => ({ success: true, data, meta }),
  } as Response;
}

describe('IntelligencePage', () => {
  it('renders summary cards, the priority table, and the decision-support disclaimer', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo) => {
        const url = String(input);
        if (url.includes('/intelligence/summary')) {
          return jsonResponse({
            summary: {
              totalBids: 15,
              lowAttention: 4,
              moderateAttention: 5,
              elevatedAttention: 3,
              highAttention: 2,
              criticalAttention: 1,
              requiringAttention: 11,
              openReviews: 3,
              pendingClarifications: 1,
              modelVersion: 'attention-v1',
              advisory:
                'Decision-support only: This indicator prioritizes bids for human review using available evidence, verification, cross-check and review signals. It does not determine bidder eligibility, fraud, rejection or award.',
              demoLabel: 'DEMO / SYNTHETIC',
            },
          });
        }
        if (url.includes('/intelligence/bids')) {
          return jsonResponse(
            { items: [item] },
            { page: 1, pageSize: 10, totalItems: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
          );
        }
        return jsonResponse(
          { items: [] },
          { page: 1, pageSize: 100, totalItems: 0, totalPages: 0, hasNextPage: false, hasPreviousPage: false },
        );
      }),
    );

    render(
      <MemoryRouter initialEntries={['/bharatbid/intelligence']}>
        <AuthProvider
          initialSession={{
            ...TEST_SESSION,
            user: { ...TEST_SESSION.user, permissions: ['bids.read'] },
          }}
        >
          <ToastProvider>
            <IntelligencePage />
          </ToastProvider>
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Delta Petrochem Traders')).toBeInTheDocument();
    expect(screen.getByText('62 / 100')).toBeInTheDocument();
    expect(screen.getAllByText('High attention').length).toBeGreaterThan(0);
    expect(screen.getByLabelText('Attention band')).toBeInTheDocument();
    expect(screen.getByText('Decision-support only')).toBeInTheDocument();
    expect(screen.queryByText(/edit score|set score|override score|likely winner|award probability/i)).not.toBeInTheDocument();
  });

  it('shows an empty table and an error state', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo) => {
        const url = String(input);
        if (url.includes('/intelligence/summary')) {
          return jsonResponse({
            summary: {
              ...{
                totalBids: 0,
                lowAttention: 0,
                moderateAttention: 0,
                elevatedAttention: 0,
                highAttention: 0,
                criticalAttention: 0,
                requiringAttention: 0,
                openReviews: 0,
                pendingClarifications: 0,
                modelVersion: 'attention-v1',
                advisory: 'Decision-support only.',
                demoLabel: 'DEMO / SYNTHETIC',
              },
            },
          });
        }
        if (url.includes('/intelligence/bids')) {
          return {
            ok: false,
            status: 500,
            json: async () => ({
              success: false,
              error: { code: 'INTERNAL', message: 'Attention intelligence could not be loaded. Please try again.' },
            }),
          } as Response;
        }
        return jsonResponse(
          { items: [] },
          { page: 1, pageSize: 100, totalItems: 0, totalPages: 0, hasNextPage: false, hasPreviousPage: false },
        );
      }),
    );

    render(
      <MemoryRouter>
        <AuthProvider initialSession={{ ...TEST_SESSION, user: { ...TEST_SESSION.user, permissions: ['bids.read'] } }}>
          <ToastProvider>
            <IntelligencePage />
          </ToastProvider>
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Attention intelligence could not be loaded. Please try again.')).toBeInTheDocument();
  });
});
