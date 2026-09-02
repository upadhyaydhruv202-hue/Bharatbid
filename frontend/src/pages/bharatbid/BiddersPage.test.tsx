import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AuthProvider } from '../../auth/AuthProvider';
import { TEST_SESSION } from '../../test/session';
import { BiddersPage } from './BiddersPage';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe('BiddersPage', () => {
  it('loads bidder profiles with presence indicators instead of verification labels', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse(
          {
            items: [
              {
                id: 'b1',
                legalName: 'Bayfront Engineering Private Limited',
                tradeName: 'Bayfront Valves',
                panMasked: 'AAAPB****C',
                panStatus: 'provided',
                gstinStatus: 'provided',
                udyamStatus: 'provided',
                profileComplete: true,
                city: 'Chennai',
                state: 'Tamil Nadu',
                tenderCount: 3,
                activeBidCount: 2,
                lastParticipationAt: '2026-08-12T10:00:00.000Z',
                createdAt: '2026-07-01T00:00:00.000Z',
              },
            ],
          },
          { page: 1, pageSize: 10, totalItems: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
        ),
      ),
    );

    render(
      <MemoryRouter>
        <AuthProvider
          initialSession={{
            ...TEST_SESSION,
            user: { ...TEST_SESSION.user, permissions: ['bidders.read', 'bidders.write'] },
          }}
        >
          <BiddersPage />
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Bayfront Engineering Private Limited')).toBeInTheDocument();
    expect(screen.getByText('Bayfront Valves')).toBeInTheDocument();
    expect(screen.getByText('Chennai, Tamil Nadu')).toBeInTheDocument();
    expect(screen.getAllByText('Provided').length).toBeGreaterThan(0);
    expect(screen.queryByText('Verified')).not.toBeInTheDocument();
    expect(screen.queryByText('GST Verified')).not.toBeInTheDocument();
    expect(screen.getByLabelText('State')).toBeInTheDocument();
    expect(screen.getByLabelText('Profile completeness')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Register bidder' })).toBeInTheDocument();
  });

  it('shows an empty state when no bidder profiles exist', async () => {
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
        <AuthProvider
          initialSession={{ ...TEST_SESSION, user: { ...TEST_SESSION.user, permissions: ['bidders.read'] } }}
        >
          <BiddersPage />
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByText('No bidder profiles found.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Register bidder' })).not.toBeInTheDocument();
  });
});

function jsonResponse(data: unknown, meta: Record<string, unknown> = {}): Response {
  return {
    ok: true,
    status: 200,
    json: async () => ({ success: true, data, meta }),
  } as Response;
}
