import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AuthProvider } from '../../auth/AuthProvider';
import { TEST_SESSION } from '../../test/session';
import { ToastProvider } from '../../ui';
import { TenderDetailPage } from './TenderDetailPage';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
});

const tender = {
  id: 't1',
  referenceNumber: 'GEM/2026/B/CPCL/001',
  title: 'Supply of industrial valves',
  description: 'Turnaround valves',
  organizationName: 'Chennai Petroleum Corporation Limited',
  departmentName: 'Contracts and Procurement',
  category: 'Goods',
  status: 'draft',
  issueDate: '2026-07-01T00:00:00.000Z',
  closingDate: '2026-09-15T00:00:00.000Z',
  bidCount: 0,
  requirementCount: 1,
  createdAt: '2026-07-01T00:00:00.000Z',
  updatedAt: '2026-07-01T00:00:00.000Z',
  createdById: 'user-1',
  createdBy: { id: 'user-1', displayName: 'Demo Officer' },
  requirements: [
    {
      id: 'r1',
      tenderId: 't1',
      name: 'GST registration',
      description: 'Active GSTIN',
      requirementType: 'statutory',
      mandatory: true,
      active: true,
      sortOrder: 0,
    },
  ],
  readiness: {
    readyToOpen: true,
    items: [
      { id: 'basic', label: 'Basic tender information', passed: true },
      { id: 'dates', label: 'Valid issue and closing dates', passed: true },
      { id: 'requirements', label: 'At least one active requirement', passed: true },
      { id: 'status', label: 'Tender status configured', passed: true },
    ],
  },
  requirementCounts: { total: 1, mandatory: 1, optional: 0, active: 1 },
  bidSummary: { total: 0, draft: 0, submitted: 0, underReview: 0, withdrawn: 0, finalized: 0 },
  allowedStatusActions: [
    { to: 'open', label: 'Open tender', destructive: false },
    { to: 'cancelled', label: 'Cancel', destructive: true },
  ],
  fieldLocks: { all: false, closingDate: false, requirementCore: false },
};

describe('TenderDetailPage', () => {
  it('shows contextual status actions, requirements, and readiness for an officer', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo) => {
        const url = String(input);
        if (url.includes('/activity')) {
          return jsonResponse({ items: [{ id: 'a1', action: 'tender.created', title: 'created this tender', actorName: 'Demo Officer', timestamp: '2026-07-01T00:00:00.000Z' }] });
        }
        return jsonResponse({ tender });
      }),
    );

    render(
      <MemoryRouter initialEntries={['/bharatbid/tenders/t1']}>
        <AuthProvider initialSession={{ ...TEST_SESSION, user: { ...TEST_SESSION.user, permissions: ['tenders.read', 'tenders.write'] } }}>
          <ToastProvider>
            <Routes>
              <Route path="/bharatbid/tenders/:id" element={<TenderDetailPage />} />
            </Routes>
          </ToastProvider>
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('button', { name: 'Open tender' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByText('Configuration readiness')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Requirements/ })).toBeInTheDocument();
  });

  it('hides mutation actions for a reviewer', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo) => {
        const url = String(input);
        if (url.includes('/activity')) {
          return jsonResponse({ items: [] });
        }
        return jsonResponse({ tender });
      }),
    );

    render(
      <MemoryRouter initialEntries={['/bharatbid/tenders/t1']}>
        <AuthProvider initialSession={{ ...TEST_SESSION, user: { ...TEST_SESSION.user, permissions: ['tenders.read'] } }}>
          <ToastProvider>
            <Routes>
              <Route path="/bharatbid/tenders/:id" element={<TenderDetailPage />} />
            </Routes>
          </ToastProvider>
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(await screen.findAllByText('GEM/2026/B/CPCL/001')).not.toHaveLength(0);
    expect(screen.queryByRole('button', { name: 'Open tender' })).not.toBeInTheDocument();
  });

  it('shows bid participation counts and an empty table on the participation tab', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo) => {
        const url = String(input);
        if (url.includes('/activity')) {
          return jsonResponse({ items: [] });
        }
        if (url.includes('/bids')) {
          return jsonResponse({ items: [] }, { page: 1, pageSize: 50, totalItems: 0, totalPages: 0, hasNextPage: false, hasPreviousPage: false });
        }
        return jsonResponse({ tender });
      }),
    );

    render(
      <MemoryRouter initialEntries={['/bharatbid/tenders/t1']}>
        <AuthProvider initialSession={{ ...TEST_SESSION, user: { ...TEST_SESSION.user, permissions: ['tenders.read', 'bids.read'] } }}>
          <ToastProvider>
            <Routes>
              <Route path="/bharatbid/tenders/:id" element={<TenderDetailPage />} />
            </Routes>
          </ToastProvider>
        </AuthProvider>
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole('tab', { name: /Bid participation/ }));
    expect(await screen.findByText('No bids have been submitted for this tender.')).toBeInTheDocument();
    expect(screen.getByText('Draft')).toBeInTheDocument();
    expect(screen.getByText('Finalized')).toBeInTheDocument();
  });
});

function jsonResponse(data: unknown, meta: Record<string, unknown> = {}): Response {
  return {
    ok: true,
    status: 200,
    json: async () => ({ success: true, data, meta }),
  } as Response;
}
