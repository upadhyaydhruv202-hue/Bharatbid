import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AuthProvider } from '../../auth/AuthProvider';
import { TEST_SESSION } from '../../test/session';
import { ToastProvider } from '../../ui';
import { ReviewDetailPage } from './ReviewDetailPage';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
});

const review = {
  id: 'rev1',
  bidSubmissionId: 'bid1',
  bidReference: 'BID-GEM2026BCPCL001-0002',
  tenderId: 't1',
  tenderReference: 'GEM/2026/B/CPCL/001',
  tenderTitle: 'Valves',
  bidderId: 'b1',
  bidderLegalName: 'Delta Petrochem Traders',
  issueType: 'cross_source_inconsistency',
  issueLabel: 'Cross-source inconsistency',
  status: 'open',
  title: 'GST ↔ MCA difference',
  machineFinding: 'INCONSISTENT',
  mandatory: true,
  requirementName: 'GST registration',
  latestAssessment: null,
  openClarification: false,
  createdAt: '2026-08-30T12:00:00.000Z',
  updatedAt: '2026-08-30T12:00:00.000Z',
  whyCreated: 'The GST legal name differs from the MCA source record.',
  whyItMatters: 'The tender requires consistent bidder identity evidence.',
  inspectHint: 'GST certificate, GST verification, MCA verification.',
  actionHint: 'Request clarification or record an assessment.',
  machineExplanation: 'Cross-source comparison reported a difference.',
  advisory: 'Decision support only. Officer assessments do not approve, reject, or award a bid.',
  requirement: { id: 'r1', name: 'GST registration', mandatory: true, requirementType: 'statutory' },
  document: {
    id: 'd1',
    originalFilename: 'DEMO_GST_Certificate_Delta.txt',
    documentType: 'gst_certificate',
    extractionStatus: 'completed',
  },
  verification: {
    id: 'v1',
    status: 'matched',
    source: 'gst',
    sourceDisplayName: 'GST demo registry',
    sourceMode: 'demo',
  },
  crossVerification: {
    id: 'c1',
    status: 'inconsistent',
    comparisonType: 'gst_mca',
    leftSourceDisplayName: 'GST demo registry',
    rightSourceDisplayName: 'MCA demo registry',
    sourceBasis: 'demo',
  },
  assessments: [],
  clarifications: [],
  openedAt: null,
  openedByName: null,
  closedAt: null,
  closedByName: null,
};

function jsonResponse(data: unknown): Response {
  return { ok: true, status: 200, json: async () => ({ success: true, data }) } as Response;
}

function renderDetail(permissions: string[], payload = review) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo) => {
      const url = String(input);
      if (url.includes('/activity')) {
        return jsonResponse({ items: [] });
      }
      return jsonResponse({ review: payload });
    }),
  );

  return render(
    <MemoryRouter initialEntries={['/bharatbid/review/rev1']}>
      <AuthProvider initialSession={{ ...TEST_SESSION, user: { ...TEST_SESSION.user, permissions } }}>
        <ToastProvider>
          <Routes>
            <Route path="/bharatbid/review/:id" element={<ReviewDetailPage />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('ReviewDetailPage', () => {
  it('keeps the machine finding separate from officer assessment and links evidence', async () => {
    renderDetail(['bids.read', 'bids.write']);
    expect((await screen.findAllByText('GST ↔ MCA difference')).length).toBeGreaterThan(0);
    expect(screen.getByText('INCONSISTENT')).toBeInTheDocument();
    expect(screen.getByText('The GST legal name differs from the MCA source record.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'View DEMO_GST_Certificate_Delta.txt' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /GST demo registry verification/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Record assessment' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Request clarification' })).toBeInTheDocument();
    expect(screen.queryByText(/approve this bid|reject this bid|award this bid|award probability/i)).not.toBeInTheDocument();
  });

  it('requires a substantial officer note', async () => {
    renderDetail(['bids.read', 'bids.write']);
    await screen.findByText('INCONSISTENT');
    fireEvent.change(screen.getByLabelText('Officer note'), { target: { value: 'ok' } });
    fireEvent.click(screen.getByRole('button', { name: 'Record assessment' }));
    expect(
      await screen.findByText('This assessment needs a written explanation of at least 20 characters.'),
    ).toBeInTheDocument();
  });

  it('opens the clarification modal with a DEMO label', async () => {
    renderDetail(['bids.read', 'bids.write']);
    fireEvent.click(await screen.findByRole('button', { name: 'Request clarification' }));
    expect(await screen.findByRole('heading', { name: 'Request clarification' })).toBeInTheDocument();
    expect(screen.getAllByText(/No bidder email or government message/i).length).toBeGreaterThan(0);
    expect(screen.getByLabelText('Reason')).toBeInTheDocument();
  });

  it('hides mutation actions for reviewers', async () => {
    renderDetail(['bids.read']);
    expect(await screen.findByText('INCONSISTENT')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Record assessment' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Request clarification' })).not.toBeInTheDocument();
    expect(screen.getByText(/cannot change the workflow/i)).toBeInTheDocument();
  });
});
