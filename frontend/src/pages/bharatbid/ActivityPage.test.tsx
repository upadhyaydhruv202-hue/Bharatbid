import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AuthProvider } from '../../auth/AuthProvider';
import { TEST_SESSION } from '../../test/session';
import { ActivityPage } from './ActivityPage';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
});

function jsonResponse(data: unknown, meta: Record<string, unknown> = {}): Response {
  return {
    ok: true,
    status: 200,
    json: async () => ({ success: true, data, meta }),
  } as Response;
}

describe('ActivityPage', () => {
  it('groups officer and system events on the timeline', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo) => {
        const url = String(input);
        if (url.includes('/bharatbid/activity')) {
          return jsonResponse(
            {
              items: [
                {
                  id: '1',
                  timestamp: '2026-08-31T10:42:00.000Z',
                  action: 'evaluation.started',
                  title: 'Started officer evaluation',
                  actorKind: 'officer',
                  actorLabel: 'Officer',
                  actorName: 'Demo Officer',
                  href: '/bharatbid/evaluation/t1',
                  demoLabel: 'DEMO / SYNTHETIC',
                },
                {
                  id: '2',
                  timestamp: '2026-08-31T10:38:00.000Z',
                  action: 'cross_verification.completed',
                  title: 'Cross-check completed (demo sources)',
                  actorKind: 'system',
                  actorLabel: 'System',
                  actorName: null,
                  href: '/bharatbid/bids/bid2/cross-checks',
                  demoLabel: 'DEMO / SYNTHETIC',
                },
              ],
            },
            { page: 1, pageSize: 20, totalItems: 2, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
          );
        }
        return jsonResponse(
          { items: [] },
          { page: 1, pageSize: 50, totalItems: 0, totalPages: 0, hasNextPage: false, hasPreviousPage: false },
        );
      }),
    );

    render(
      <MemoryRouter>
        <AuthProvider initialSession={TEST_SESSION}>
          <ActivityPage />
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Started officer evaluation')).toBeInTheDocument();
    expect(screen.getByText('Cross-check completed (demo sources)')).toBeInTheDocument();
    expect(screen.getAllByText('Officer').length).toBeGreaterThan(0);
    expect(screen.getAllByText('System').length).toBeGreaterThan(0);
  });
});
