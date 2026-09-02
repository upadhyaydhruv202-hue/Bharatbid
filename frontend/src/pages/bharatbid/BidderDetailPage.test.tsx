import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AuthProvider } from '../../auth/AuthProvider';
import { TEST_SESSION } from '../../test/session';
import { ToastProvider } from '../../ui';
import { BidderDetailPage } from './BidderDetailPage';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
});

const bidder = {
  id: 'b1',
  legalName: 'Bayfront Engineering Private Limited',
  tradeName: 'Bayfront Valves',
  pan: 'AAAPB1234C',
  gstin: '33AAAPB1234C1Z5',
  cin: 'U29120TN2014PTC095001',
  udyamRegistrationNumber: 'UDYAM-TN-02-0001001',
  panStatus: 'provided',
  gstinStatus: 'provided',
  udyamStatus: 'provided',
  registeredAddress: '14 GST Road',
  city: 'Chennai',
  state: 'Tamil Nadu',
  pincode: '600032',
  contactName: 'Kavitha Raman',
  contactEmail: 'kavitha.demo@bayfront.example',
  contactPhone: '+919840010001',
  createdAt: '2026-07-01T00:00:00.000Z',
  updatedAt: '2026-07-01T00:00:00.000Z',
  participation: {
    total: 3,
    draft: 0,
    submitted: 2,
    underReview: 1,
    withdrawn: 0,
    finalized: 0,
    tenderCount: 2,
  },
  bids: [
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
};

describe('BidderDetailPage', () => {
  it('shows identity, participation, and tender rows for an officer', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo) => {
        const url = String(input);
        if (url.includes('/activity')) {
          return jsonResponse({ items: [] });
        }
        return jsonResponse({ bidder });
      }),
    );

    render(
      <MemoryRouter initialEntries={['/bharatbid/bidders/b1']}>
        <AuthProvider
          initialSession={{
            ...TEST_SESSION,
            user: { ...TEST_SESSION.user, permissions: ['bidders.read', 'bidders.write'] },
          }}
        >
          <ToastProvider>
            <Routes>
              <Route path="/bharatbid/bidders/:id" element={<BidderDetailPage />} />
            </Routes>
          </ToastProvider>
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Identity')).toBeInTheDocument();
    expect(screen.getByText('Tender participation')).toBeInTheDocument();
    expect(screen.getByText('GEM/2026/B/CPCL/001')).toBeInTheDocument();
    expect(screen.getByText('BID-GEM2026BCPCL001-0001')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit profile' })).toBeInTheDocument();
    expect(screen.queryByText('Verified')).not.toBeInTheDocument();
  });

  it('shows an empty participation state and hides edit for a reviewer', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo) => {
        if (String(input).includes('/activity')) {
          return jsonResponse({ items: [] });
        }
        return jsonResponse({
          bidder: {
            ...bidder,
            participation: { total: 0, draft: 0, submitted: 0, underReview: 0, withdrawn: 0, finalized: 0, tenderCount: 0 },
            bids: [],
          },
        });
      }),
    );

    render(
      <MemoryRouter initialEntries={['/bharatbid/bidders/b1']}>
        <AuthProvider
          initialSession={{ ...TEST_SESSION, user: { ...TEST_SESSION.user, permissions: ['bidders.read'] } }}
        >
          <ToastProvider>
            <Routes>
              <Route path="/bharatbid/bidders/:id" element={<BidderDetailPage />} />
            </Routes>
          </ToastProvider>
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByText('This bidder has not participated in any tender yet.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit profile' })).not.toBeInTheDocument();
  });
});

function jsonResponse(data: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: async () => ({ success: true, data, meta: {} }),
  } as Response;
}
