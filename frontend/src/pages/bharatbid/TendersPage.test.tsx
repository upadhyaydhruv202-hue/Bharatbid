import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AuthProvider } from '../../auth/AuthProvider';
import { TEST_SESSION } from '../../test/session';
import { TendersPage } from './TendersPage';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe('TendersPage', () => {
  it('loads tenders into the table', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse(
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
                bidCount: 4,
                requirementCount: 5,
                createdAt: '2026-07-01T00:00:00.000Z',
                updatedAt: '2026-07-01T00:00:00.000Z',
              },
            ],
          },
          { page: 1, pageSize: 10, totalItems: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
        ),
      ),
    );

    render(
      <MemoryRouter>
        <AuthProvider initialSession={{ ...TEST_SESSION, user: { ...TEST_SESSION.user, permissions: ['tenders.read', 'tenders.write'] } }}>
          <TendersPage />
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByText('GEM/2026/B/CPCL/001')).toBeInTheDocument();
    expect(screen.getByText('Supply of industrial valves')).toBeInTheDocument();
    expect(screen.getByLabelText('Category')).toBeInTheDocument();
    expect(screen.getByLabelText('Status')).toBeInTheDocument();
  });
});

function jsonResponse(data: unknown, meta: Record<string, unknown> = {}): Response {
  return {
    ok: true,
    status: 200,
    json: async () => ({ success: true, data, meta }),
  } as Response;
}
