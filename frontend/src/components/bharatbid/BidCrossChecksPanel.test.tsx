import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '../../ui';
import { BidCrossChecksPanel } from './BidCrossChecksPanel';
import type { CrossVerificationListItem } from '../../services/bharatbid';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const consistent: CrossVerificationListItem = {
  id: 'c1',
  bidSubmissionId: 'bid1',
  comparisonType: 'gst_mca',
  comparisonLabel: 'GST ↔ MCA',
  status: 'consistent',
  sourceBasis: 'demo',
  leftVerificationId: 'v1',
  rightVerificationId: 'v2',
  leftSource: 'gst',
  rightSource: 'mca',
  leftSourceDisplayName: 'DEMO GST Registry',
  rightSourceDisplayName: 'DEMO MCA Registry',
  leftSourceMode: 'demo',
  rightSourceMode: 'demo',
  fieldComparisons: [
    {
      field: 'legalName',
      label: 'Legal name',
      outcome: 'normalized_match',
      leftValue: 'ABC Technologies Pvt Ltd',
      rightValue: 'ABC Technologies Private Limited',
      note: 'Normalized match',
    },
    {
      field: 'state',
      label: 'State',
      outcome: 'exact_match',
      leftValue: 'Gujarat',
      rightValue: 'Gujarat',
      note: 'Exact match',
    },
  ],
  explanation: 'Source A: DEMO GST Registry\nMode: DEMO / SIMULATED SOURCES',
  advisory: 'Demo source — simulated verification data. Not an official government response.',
  attemptNumber: 1,
  isLatest: true,
  requestedAt: '2026-08-30T12:50:00.000Z',
  completedAt: '2026-08-30T12:50:00.000Z',
  requestedByName: 'Demo Officer',
  history: [{ id: 'c1', attemptNumber: 1, status: 'consistent', requestedAt: '2026-08-30T12:50:00.000Z', isLatest: true }],
};

const inconsistent: CrossVerificationListItem = {
  ...consistent,
  id: 'c2',
  comparisonType: 'gst_udyam',
  comparisonLabel: 'GST ↔ Udyam',
  status: 'inconsistent',
  fieldComparisons: [
    {
      field: 'legalName',
      label: 'Legal name',
      outcome: 'difference',
      leftValue: 'ABC Technologies Private Limited',
      rightValue: 'ABC Technology Solutions Private Limited',
      note: 'Difference detected. Officer review recommended.',
    },
  ],
  explanation: 'A difference was detected. Officer review is recommended. This is not a fraud finding.',
};

const insufficient: CrossVerificationListItem = {
  ...consistent,
  id: 'c3',
  comparisonType: 'mca_udyam',
  comparisonLabel: 'MCA ↔ Udyam',
  status: 'insufficient_evidence',
  fieldComparisons: [],
  explanation: 'A source record was not found in the available demo source. This does not by itself establish bidder invalidity.',
};

function jsonResponse(data: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({ 'Content-Type': 'application/json' }),
    json: async () => ({ success: status < 400, data, meta: {} }),
  } as Response;
}

function stubApi(items: CrossVerificationListItem[] = [consistent, inconsistent, insufficient]) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo, init?: RequestInit) => {
      const url = String(input);
      const method = (init?.method ?? 'GET').toUpperCase();
      if (method === 'POST' && url.includes('/cross-verifications')) {
        return jsonResponse({ items }, 201);
      }
      if (url.includes('/cross-verifications/c1')) {
        return jsonResponse({ crossVerification: consistent });
      }
      if (url.includes('/cross-verifications/c2')) {
        return jsonResponse({ crossVerification: inconsistent });
      }
      if (url.includes('/cross-verifications/c3')) {
        return jsonResponse({ crossVerification: insufficient });
      }
      if (url.includes('/cross-verifications')) {
        return jsonResponse({ items });
      }
      return jsonResponse({ items: [] }, 404);
    }),
  );
}

function renderPanel(canWrite = true) {
  return render(
    <ToastProvider>
      <BidCrossChecksPanel bidId="bid1" token="token" canWrite={canWrite} />
    </ToastProvider>,
  );
}

describe('BidCrossChecksPanel', () => {
  it('shows consistent, inconsistent, and insufficient rows with DEMO SOURCE badges', async () => {
    stubApi();
    renderPanel();
    expect(await screen.findByText('GST ↔ MCA')).toBeInTheDocument();
    expect(screen.getByText('GST ↔ Udyam')).toBeInTheDocument();
    expect(screen.getByText('MCA ↔ Udyam')).toBeInTheDocument();
    expect(screen.getAllByText('DEMO SOURCE').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Consistent').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Inconsistent').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Insufficient evidence').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Run cross-checks' })).toBeInTheDocument();
    expect(screen.queryByText(/fraud|fake bidder|disqualified/i)).not.toBeInTheDocument();
  });

  it('opens field comparison for a consistent pair', async () => {
    stubApi();
    renderPanel();
    fireEvent.click(await screen.findByText('GST ↔ MCA'));
    expect(await screen.findByRole('heading', { name: 'Cross-check details' })).toBeInTheDocument();
    expect(screen.getByText('SIMULATED SOURCE')).toBeInTheDocument();
    expect(screen.getAllByText('Normalized match').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Exact match').length).toBeGreaterThan(0);
    expect(screen.getByText(/ABC Technologies Pvt Ltd/)).toBeInTheDocument();
  });

  it('explains differences without calling them fraud', async () => {
    stubApi();
    renderPanel();
    fireEvent.click(await screen.findByText('GST ↔ Udyam'));
    expect(await screen.findByText('Difference detected')).toBeInTheDocument();
    expect(screen.getAllByText(/officer review is recommended/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/ABC Technology Solutions Private Limited/)).toBeInTheDocument();
    expect(screen.queryByText(/fraud detected|fake bidder/i)).not.toBeInTheDocument();
  });

  it('explains insufficient evidence without invalidating the bidder', async () => {
    stubApi();
    renderPanel();
    fireEvent.click(await screen.findByText('MCA ↔ Udyam'));
    expect((await screen.findAllByText('Insufficient evidence')).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/does not by itself establish bidder invalidity/i).length).toBeGreaterThan(0);
  });

  it('lets an officer run cross-checks', async () => {
    stubApi();
    renderPanel();
    fireEvent.click(await screen.findByRole('button', { name: 'Run cross-checks' }));
    await waitFor(() => expect(screen.getByText('GST ↔ MCA')).toBeInTheDocument());
  });

  it('hides run actions for reviewers', async () => {
    stubApi();
    renderPanel(false);
    expect(await screen.findByText('GST ↔ MCA')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Run cross-checks' })).not.toBeInTheDocument();
    expect(screen.getByText(/requires write access/i)).toBeInTheDocument();
  });

  it('shows an empty state when no comparisons exist', async () => {
    stubApi([]);
    renderPanel();
    expect(await screen.findByText('No cross-checks yet.')).toBeInTheDocument();
  });
});
