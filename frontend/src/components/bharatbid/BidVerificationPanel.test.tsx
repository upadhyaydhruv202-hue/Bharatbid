import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '../../ui';
import { BidVerificationPanel } from './BidVerificationPanel';
import type { VerificationDetail, VerificationListItem, VerificationSourceView } from '../../services/bharatbid';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const sources: VerificationSourceView[] = [
  {
    source: 'gst',
    displayName: 'DEMO GST Registry',
    mode: 'demo',
    availability: 'available',
    supportedIdentifierTypes: ['gstin'],
    advisory: 'Demo source — simulated verification data. Not an official government response.',
  },
  {
    source: 'mca',
    displayName: 'DEMO MCA Registry',
    mode: 'demo',
    availability: 'available',
    supportedIdentifierTypes: ['cin'],
    advisory: 'Demo source — simulated verification data. Not an official government response.',
  },
  {
    source: 'udyam',
    displayName: 'DEMO UDYAM Registry',
    mode: 'demo',
    availability: 'available',
    supportedIdentifierTypes: ['udyam'],
    advisory: 'Demo source — simulated verification data. Not an official government response.',
  },
  {
    source: 'gem',
    displayName: 'DEMO GeM Registry',
    mode: 'demo',
    availability: 'available',
    supportedIdentifierTypes: ['gem_seller'],
    advisory: 'Demo source — simulated verification data. Not an official government response.',
  },
];

const matched: VerificationListItem = {
  id: 'v1',
  bidSubmissionId: 'bid1',
  bidderId: 'b1',
  documentId: 'doc1',
  documentFilename: 'DEMO_GST_Certificate.txt',
  documentTypeLabel: 'GST Certificate',
  groupId: 'g1',
  attemptNumber: 1,
  isLatest: true,
  identifierType: 'gstin',
  identifierTypeLabel: 'GSTIN',
  identifierValue: '33AAAPB1234C1Z5',
  identifierOrigin: 'extracted',
  source: 'gst',
  sourceDisplayName: 'DEMO GST Registry',
  sourceMode: 'demo',
  status: 'matched',
  requestedAt: '2026-08-30T12:40:00.000Z',
  completedAt: '2026-08-30T12:40:00.000Z',
};

const mismatched: VerificationListItem = {
  ...matched,
  id: 'v2',
  identifierValue: '29AACPD3456E1Z8',
  status: 'mismatched',
};

const notFound: VerificationListItem = {
  ...matched,
  id: 'v3',
  identifierValue: '07AAAAA0000A1Z5',
  documentId: null,
  documentFilename: null,
  documentTypeLabel: null,
  status: 'not_found',
};

const errored: VerificationListItem = {
  ...matched,
  id: 'v4',
  identifierValue: '00ERROR1234E1Z5',
  identifierOrigin: 'manual',
  status: 'error',
};

const matchedDetail: VerificationDetail = {
  ...matched,
  explanation: 'Source: DEMO GST Registry\nMode: DEMO / SIMULATED',
  fieldComparisons: [
    {
      field: 'identifier',
      label: 'Identifier',
      outcome: 'match',
      claimedValue: '33AAAPB1234C1Z5',
      claimedOrigin: 'identifier',
      sourceValue: '33AAAPB1234C1Z5',
      note: 'Exact match',
    },
    {
      field: 'legalName',
      label: 'Legal name',
      outcome: 'match',
      claimedValue: 'Bayfront Engineering Private Limited',
      claimedOrigin: 'extracted',
      sourceValue: 'Bayfront Engineering Private Limited',
      note: 'Normalized match',
    },
  ],
  sourceSnapshot: {
    recordFound: true,
    legalName: 'Bayfront Engineering Private Limited',
    status: 'ACTIVE',
    state: 'Tamil Nadu',
    retrievedAt: '2026-08-30T12:40:00.000Z',
    attributes: { gstReturnStatus: 'FILED', gstReturnPeriod: 'FY 2025-26' },
  },
  errorCode: null,
  errorMessage: null,
  advisory: 'Demo source — simulated verification data. Not an official government response.',
  requestedByName: 'Demo Officer',
  history: [{ id: 'v1', attemptNumber: 1, status: 'matched', requestedAt: '2026-08-30T12:40:00.000Z', isLatest: true }],
};

function jsonResponse(data: unknown, status = 200, meta: Record<string, unknown> = {}): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({ 'Content-Type': 'application/json' }),
    json: async () => ({ success: status < 400, data, meta }),
  } as Response;
}

function stubApi(options: { items?: VerificationListItem[]; created?: VerificationDetail } = {}) {
  const items = options.items ?? [matched, mismatched, notFound, errored];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo, init?: RequestInit) => {
      const url = String(input);
      const method = (init?.method ?? 'GET').toUpperCase();
      if (method === 'POST' && url.includes('/retry')) {
        return jsonResponse({ verification: { ...errored, ...matchedDetail, id: 'v5', attemptNumber: 2, status: 'error' } }, 201);
      }
      if (method === 'POST' && url.includes('/verifications')) {
        return jsonResponse({ verification: options.created ?? matchedDetail }, 201);
      }
      if (url.includes('/verifications/v1')) {
        return jsonResponse({ verification: matchedDetail });
      }
      if (url.includes('/verifications/v2')) {
        return jsonResponse({
          verification: {
            ...mismatched,
            explanation: 'Mismatch',
            fieldComparisons: [
              {
                field: 'legalName',
                label: 'Legal name',
                outcome: 'mismatch',
                claimedValue: 'Delta Petrochem Traders',
                claimedOrigin: 'extracted',
                sourceValue: 'Southern Petrochem Wholesale Private Limited',
                note: 'This difference requires officer review.',
              },
            ],
            sourceSnapshot: { recordFound: true, legalName: 'Southern Petrochem Wholesale Private Limited' },
            errorCode: null,
            errorMessage: null,
            advisory: matchedDetail.advisory,
            requestedByName: 'Demo Officer',
            history: [{ id: 'v2', attemptNumber: 1, status: 'mismatched', requestedAt: mismatched.requestedAt, isLatest: true }],
          },
        });
      }
      if (url.includes('/verifications/v3')) {
        return jsonResponse({
          verification: {
            ...notFound,
            explanation: 'No matching record found in the selected demo source.',
            fieldComparisons: [],
            sourceSnapshot: { recordFound: false },
            errorCode: null,
            errorMessage: null,
            advisory: matchedDetail.advisory,
            requestedByName: 'Demo Officer',
            history: [],
          },
        });
      }
      if (url.includes('/verifications/v4')) {
        return jsonResponse({
          verification: {
            ...errored,
            explanation: 'Verification could not be completed.',
            fieldComparisons: [],
            sourceSnapshot: null,
            errorCode: 'SOURCE_UNAVAILABLE',
            errorMessage: 'DEMO GST Registry could not complete this lookup',
            advisory: matchedDetail.advisory,
            requestedByName: 'Demo Officer',
            history: [
              { id: 'v4', attemptNumber: 1, status: 'error', requestedAt: errored.requestedAt, isLatest: true },
            ],
          },
        });
      }
      return jsonResponse(
        {
          items,
          summary: {
            total: items.length,
            matched: items.filter((item) => item.status === 'matched').length,
            mismatched: items.filter((item) => item.status === 'mismatched').length,
            notFound: items.filter((item) => item.status === 'not_found').length,
            errors: items.filter((item) => item.status === 'error').length,
            processing: 0,
          },
          sources,
        },
        200,
        { page: 1, pageSize: 100, totalItems: items.length, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
      );
    }),
  );
}

function renderPanel(canWrite = true) {
  return render(
    <ToastProvider>
      <BidVerificationPanel bidId="bid1" token="token" canWrite={canWrite} />
    </ToastProvider>,
  );
}

describe('BidVerificationPanel', () => {
  it('shows overview counts, DEMO SOURCE badges, and verification rows', async () => {
    stubApi();
    renderPanel();
    expect(await screen.findByText('Verification sources')).toBeInTheDocument();
    expect(screen.getAllByText('DEMO SOURCE').length).toBeGreaterThan(0);
    expect(
      screen.getAllByText('Demo source — simulated verification data. Not an official government response.').length,
    ).toBeGreaterThan(0);
    expect(screen.getByText('33AAAPB1234C1Z5')).toBeInTheDocument();
    expect(screen.getAllByText('Matched').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Mismatched').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Not found').length).toBeGreaterThan(0);
    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Run verification' })).toBeInTheDocument();
  });

  it('opens matched field comparison and source snapshot', async () => {
    stubApi();
    renderPanel();
    const viewButtons = await screen.findAllByRole('button', { name: 'View' });
    fireEvent.click(viewButtons[0]);
    expect(await screen.findByRole('heading', { name: 'Verification details' })).toBeInTheDocument();
    expect(screen.getByText('Field comparison')).toBeInTheDocument();
    expect(screen.getByText('Exact match')).toBeInTheDocument();
    expect(screen.getByText('Source snapshot')).toBeInTheDocument();
    expect(screen.getByText('ACTIVE')).toBeInTheDocument();
    expect(screen.getByText('GST Return Filing')).toBeInTheDocument();
    expect(screen.getByText(/Status: FILED/)).toBeInTheDocument();
    expect(screen.getByText(/not a GSTN filing download/i)).toBeInTheDocument();
    expect(screen.getByText('History')).toBeInTheDocument();
    expect(screen.queryByText(/fraud/i)).not.toBeInTheDocument();
  });

  it('shows mismatch, not-found, and error copy without compliance language', async () => {
    stubApi();
    renderPanel();
    const viewButtons = await screen.findAllByRole('button', { name: 'View' });
    fireEvent.click(viewButtons[1]);
    expect(await screen.findByText('Mismatch detected')).toBeInTheDocument();
    expect(screen.getByText(/officer review/i)).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Close' }).at(-1)!);

    fireEvent.click((await screen.findAllByRole('button', { name: 'View' }))[2]);
    expect(await screen.findByText('No matching record')).toBeInTheDocument();
    expect(screen.getByText(/does not by itself prove that the bidder is invalid/i)).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Close' }).at(-1)!);

    fireEvent.click((await screen.findAllByRole('button', { name: 'View' }))[3]);
    expect(await screen.findByText('Verification could not be completed')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('lets an officer retry a failed check', async () => {
    stubApi();
    renderPanel();
    fireEvent.click((await screen.findAllByRole('button', { name: 'View' }))[3]);
    fireEvent.click(await screen.findByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Verification details' })).toBeInTheDocument());
  });

  it('hides run and retry actions for reviewers', async () => {
    stubApi();
    renderPanel(false);
    expect(await screen.findByText('Verification sources')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Run verification' })).not.toBeInTheDocument();
    fireEvent.click((await screen.findAllByRole('button', { name: 'View' }))[3]);
    expect(await screen.findByText('Verification could not be completed')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
  });

  it('shows an empty state when no checks exist', async () => {
    stubApi({ items: [] });
    renderPanel();
    expect(await screen.findByText('No verification checks yet.')).toBeInTheDocument();
  });
});
