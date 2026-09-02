import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AuthProvider } from '../../auth/AuthProvider';
import { TEST_SESSION } from '../../test/session';
import { ToastProvider } from '../../ui';
import { EvaluationPage } from './EvaluationPage';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
});

const item = {
  tenderId: 't1',
  evaluationId: 'e1',
  referenceNumber: 'GEM/2026/B/CPCL/001',
  title: 'Supply of industrial valves for Manali refinery turnaround',
  organizationName: 'Chennai Petroleum Corporation Limited',
  departmentName: 'Contracts and Procurement',
  category: 'Goods',
  status: 'open',
  closingDate: '2026-09-15T18:30:00.000Z',
  submittedBids: 3,
  underEvaluation: 3,
  reviewRequired: 2,
  evidenceGaps: 1,
  verificationIssues: 1,
  evaluationStatus: 'in_progress',
  lastEvaluationActivity: '2026-08-30T16:18:00.000Z',
  demoLabel: 'DEMO / SYNTHETIC',
};

function jsonResponse(data: unknown, meta: Record<string, unknown> = {}): Response {
  return {
    ok: true,
    status: 200,
    json: async () => ({ success: true, data, meta }),
  } as Response;
}

describe('EvaluationPage', () => {
  it('renders tenders with submitted bids and decision-support language', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse(
          {
            items: [item],
            advisory:
              'This workspace supports human procurement evaluation using available evidence and system findings. Final procurement decisions remain with authorized officers.',
          },
          { page: 1, pageSize: 10, totalItems: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
        ),
      ),
    );

    render(
      <MemoryRouter initialEntries={['/bharatbid/evaluation']}>
        <AuthProvider initialSession={{ ...TEST_SESSION, user: { ...TEST_SESSION.user, permissions: ['bids.read'] } }}>
          <ToastProvider>
            <EvaluationPage />
          </ToastProvider>
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByText(/Supply of industrial valves/)).toBeInTheDocument();
    expect(screen.getByText('GEM/2026/B/CPCL/001')).toBeInTheDocument();
    expect(screen.getByText('Decision support')).toBeInTheDocument();
    expect(screen.queryByText(/best bidder|rank 1|automatically selected|award recommendation/i)).not.toBeInTheDocument();
  });

  it('shows an empty state when no evaluable tenders exist', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse(
          { items: [], advisory: 'Decision support only.' },
          { page: 1, pageSize: 10, totalItems: 0, totalPages: 0, hasNextPage: false, hasPreviousPage: false },
        ),
      ),
    );

    render(
      <MemoryRouter initialEntries={['/bharatbid/evaluation']}>
        <AuthProvider initialSession={{ ...TEST_SESSION, user: { ...TEST_SESSION.user, permissions: ['bids.read'] } }}>
          <ToastProvider>
            <EvaluationPage />
          </ToastProvider>
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByText('No tenders with submitted bids')).toBeInTheDocument();
  });
});
