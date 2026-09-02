import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AuthProvider } from '../../auth/AuthProvider';
import { TEST_SESSION } from '../../test/session';
import { BidsPage } from './BidsPage';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe('BidsPage', () => {
  it('loads bid submissions with tender, bidder, and status columns', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo) => {
        const url = String(input);
        if (url.includes('/tenders')) {
          return jsonResponse(
            { items: [] },
            { page: 1, pageSize: 100, totalItems: 0, totalPages: 0, hasNextPage: false, hasPreviousPage: false },
          );
        }
        if (url.includes('/bidders')) {
          return jsonResponse(
            { items: [] },
            { page: 1, pageSize: 100, totalItems: 0, totalPages: 0, hasNextPage: false, hasPreviousPage: false },
          );
        }
        return jsonResponse(
          {
            items: [
              {
                id: 'bid1',
                submissionReference: 'BID-GEM2026BCPCL001-0001',
                tenderId: 't1',
                tenderReference: 'GEM/2026/B/CPCL/001',
                tenderTitle: 'Supply of industrial valves',
                bidderId: 'b1',
                bidderLegalName: 'Bayfront Engineering Private Limited',
                status: 'submitted',
                submittedAt: '2026-08-12T10:00:00.000Z',
                createdAt: '2026-08-01T00:00:00.000Z',
                updatedAt: '2026-08-12T10:00:00.000Z',
              },
            ],
          },
          { page: 1, pageSize: 10, totalItems: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
        );
      }),
    );

    render(
      <MemoryRouter>
        <AuthProvider
          initialSession={{
            ...TEST_SESSION,
            user: { ...TEST_SESSION.user, permissions: ['bids.read', 'bids.write'] },
          }}
        >
          <BidsPage />
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByText('BID-GEM2026BCPCL001-0001')).toBeInTheDocument();
    expect(screen.getByText('GEM/2026/B/CPCL/001')).toBeInTheDocument();
    expect(screen.getByText('Bayfront Engineering Private Limited')).toBeInTheDocument();
    expect(screen.getAllByText('Submitted').length).toBeGreaterThan(0);
    expect(screen.getByLabelText('Bid status')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create submission' })).toBeInTheDocument();
  });

  it('shows an empty state when no submissions exist', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse(
          { items: [] },
          { page: 1, pageSize: 10, totalItems: 0, totalPages: 0, hasNextPage: false, hasPreviousPage: false },
        ),
      ),
    );

    render(
      <MemoryRouter>
        <AuthProvider initialSession={{ ...TEST_SESSION, user: { ...TEST_SESSION.user, permissions: ['bids.read'] } }}>
          <BidsPage />
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByText('No bid submissions found.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Create submission' })).not.toBeInTheDocument();
  });
});

function jsonResponse(data: unknown, meta: Record<string, unknown> = {}): Response {
  return {
    ok: true,
    status: 200,
    json: async () => ({ success: true, data, meta }),
  } as Response;
}
