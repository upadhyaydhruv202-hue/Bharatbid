import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AuthProvider } from '../../auth/AuthProvider';
import { TEST_SESSION } from '../../test/session';
import { ToastProvider } from '../../ui';
import { BidCreatePage } from './BidCreatePage';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe('BidCreatePage', () => {
  it('requires an open tender and a bidder to create a draft', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo) => {
        const url = String(input);
        if (url.includes('/tenders')) {
          return jsonResponse(
            {
              items: [
                {
                  id: 't1',
                  referenceNumber: 'GEM/2026/B/CPCL/001',
                  title: 'Supply of industrial valves',
                  organizationName: 'Chennai Petroleum Corporation Limited',
                  departmentName: 'Contracts',
                  category: 'Goods',
                  status: 'open',
                  issueDate: '2026-07-01T00:00:00.000Z',
                  closingDate: '2026-09-15T00:00:00.000Z',
                  bidCount: 0,
                  requirementCount: 1,
                  createdAt: '2026-07-01T00:00:00.000Z',
                  updatedAt: '2026-07-01T00:00:00.000Z',
                },
              ],
            },
            { page: 1, pageSize: 100, totalItems: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
          );
        }
        return jsonResponse(
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
                tenderCount: 0,
                activeBidCount: 0,
                lastParticipationAt: null,
                createdAt: '2026-07-01T00:00:00.000Z',
              },
            ],
          },
          { page: 1, pageSize: 100, totalItems: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
        );
      }),
    );

    render(
      <MemoryRouter>
        <AuthProvider
          initialSession={{ ...TEST_SESSION, user: { ...TEST_SESSION.user, permissions: ['bids.write'] } }}
        >
          <ToastProvider>
            <BidCreatePage />
          </ToastProvider>
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByLabelText('Open tender')).toBeInTheDocument();
    expect(screen.getByLabelText('Bidder')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create bid' })).toBeDisabled();
  });
});

function jsonResponse(data: unknown, meta: Record<string, unknown> = {}): Response {
  return {
    ok: true,
    status: 200,
    json: async () => ({ success: true, data, meta }),
  } as Response;
}
