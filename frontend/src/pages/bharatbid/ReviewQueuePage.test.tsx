import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AuthProvider } from '../../auth/AuthProvider';
import { TEST_SESSION } from '../../test/session';
import { ToastProvider } from '../../ui';
import { ReviewQueuePage } from './ReviewQueuePage';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
});

const item = {
  id: 'rev1',
  bidSubmissionId: 'bid1',
  bidReference: 'BID-GEM2026BCPCL001-0002',
  tenderId: 't1',
  tenderReference: 'GEM/2026/B/CPCL/001',
  tenderTitle: 'Valves',
  bidderId: 'b1',
  bidderLegalName: 'Delta Petrochem Traders',
  issueType: 'cross_source_inconsistency',
  issueLabel: 'Cross-source inconsistency',
  status: 'open',
  title: 'GST ↔ MCA difference',
  machineFinding: 'INCONSISTENT',
  mandatory: true,
  requirementName: 'GST registration',
  latestAssessment: null,
  openClarification: false,
  createdAt: '2026-08-30T12:00:00.000Z',
  updatedAt: '2026-08-30T12:00:00.000Z',
};

function jsonResponse(data: unknown, meta: Record<string, unknown> = {}): Response {
  return {
    ok: true,
    status: 200,
    json: async () => ({ success: true, data, meta }),
  } as Response;
}

describe('ReviewQueuePage', () => {
  it('renders the review queue, filters, and dashboard counts', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo) => {
        const url = String(input);
        if (url.includes('/reviews/summary')) {
          return jsonResponse({
            summary: {
              statuses: { open: 2, in_review: 0, clarification_requested: 1, assessed: 1, closed: 0 },
              issues: { evidence_missing: 1, cross_source_inconsistency: 1, review_required: 2 },
              openClarifications: 1,
              advisory: 'Decision support only. Officer assessments do not approve, reject, or award a bid.',
            },
          });
        }
        if (url.includes('/reviews')) {
          return jsonResponse(
            { items: [item] },
            { page: 1, pageSize: 10, totalItems: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
          );
        }
        if (url.includes('/tenders')) {
          return jsonResponse(
            { items: [] },
            { page: 1, pageSize: 100, totalItems: 0, totalPages: 0, hasNextPage: false, hasPreviousPage: false },
          );
        }
        return jsonResponse(
          { items: [] },
          { page: 1, pageSize: 100, totalItems: 0, totalPages: 0, hasNextPage: false, hasPreviousPage: false },
        );
      }),
    );

    render(
      <MemoryRouter initialEntries={['/bharatbid/review']}>
        <AuthProvider
          initialSession={{
            ...TEST_SESSION,
            user: { ...TEST_SESSION.user, permissions: ['bids.read', 'bids.write'] },
          }}
        >
          <ToastProvider>
            <ReviewQueuePage />
          </ToastProvider>
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByText('GST ↔ MCA difference')).toBeInTheDocument();
    expect(screen.getByText('Delta Petrochem Traders')).toBeInTheDocument();
    expect(screen.getByLabelText('Review status')).toBeInTheDocument();
    expect(screen.getByLabelText('Issue type')).toBeInTheDocument();
    expect(screen.getByText('Decision support only')).toBeInTheDocument();
    expect(screen.queryByText(/fraud score|award probability|reject this bid/i)).not.toBeInTheDocument();
  });

  it('shows an empty queue and an error state', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo) => {
        const url = String(input);
        if (url.includes('/reviews/summary')) {
          return jsonResponse({
            summary: {
              statuses: { open: 0, in_review: 0, clarification_requested: 0, assessed: 0, closed: 0 },
              issues: {},
              openClarifications: 0,
              advisory: 'Decision support only.',
            },
          });
        }
        if (url.includes('/reviews') && !url.includes('/summary')) {
          return {
            ok: false,
            status: 500,
            json: async () => ({
              success: false,
              error: { code: 'INTERNAL', message: 'Review information could not be loaded. Please try again.' },
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
            <ReviewQueuePage />
          </ToastProvider>
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Review information could not be loaded. Please try again.')).toBeInTheDocument();
  });
});
