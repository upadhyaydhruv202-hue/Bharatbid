import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AuthProvider } from '../../auth/AuthProvider';
import { TEST_SESSION } from '../../test/session';
import { ToastProvider } from '../../ui';
import { EvaluationWorkspacePage } from './EvaluationWorkspacePage';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
});

const comparison = {
  tender: {
    id: 't1',
    referenceNumber: 'GEM/2026/B/CPCL/001',
    title: 'Supply of industrial valves for Manali refinery turnaround',
    organizationName: 'Chennai Petroleum Corporation Limited',
    departmentName: 'Contracts and Procurement',
    category: 'Goods',
    status: 'open',
    closingDate: '2026-09-15T18:30:00.000Z',
  },
  evaluation: {
    id: 'e1',
    tenderId: 't1',
    status: 'in_progress',
    statusLabel: 'In progress',
    startedAt: '2026-08-30T16:10:00.000Z',
    startedBy: { id: 'u1', displayName: 'Demo Officer' },
    readyAt: null,
    readyBy: null,
    recordedAt: null,
    recordedBy: null,
    lastUpdated: '2026-08-30T16:18:00.000Z',
    lastUpdatedBy: { id: 'u1', displayName: 'Demo Officer' },
    tender: {
      id: 't1',
      referenceNumber: 'GEM/2026/B/CPCL/001',
      title: 'Valves',
      category: 'Goods',
      status: 'open',
      closingDate: '2026-09-15T18:30:00.000Z',
    },
    advisory: 'Decision support only.',
    demoLabel: 'DEMO / SYNTHETIC',
  },
  overview: {
    submittedBids: 3,
    comparedBids: 3,
    evidenceGaps: 1,
    verificationIssues: 1,
    openReviews: 2,
    pendingClarifications: 1,
  },
  requirements: [
    {
      id: 'r1',
      name: 'GST registration',
      description: 'Active GSTIN',
      requirementType: 'statutory',
      mandatory: true,
      active: true,
      sortOrder: 0,
    },
  ],
  availableBids: [
    { id: 'b1', submissionReference: 'BID-A', bidderLegalName: 'Bayfront Engineering Private Limited', status: 'submitted' },
    { id: 'b2', submissionReference: 'BID-B', bidderLegalName: 'Delta Petrochem Traders', status: 'submitted' },
  ],
  bids: [
    {
      id: 'b1',
      submissionReference: 'BID-A',
      bidderId: 'bb1',
      bidderLegalName: 'Bayfront Engineering Private Limited',
      status: 'submitted',
      evidenceCoveragePercent: 92,
      verificationSummary: { total: 2, matched: 2, mismatched: 0, notFound: 0, errors: 0 },
      verificationLabel: 'Matched',
      crossCheckSummary: { total: 1, consistent: 1, inconsistent: 0, insufficient: 0, notComparable: 0 },
      crossCheckLabel: 'Consistent',
      reviewSummary: { open: 0, inReview: 0, clarificationRequested: 0, assessed: 0, closed: 2, total: 2 },
      attention: {
        score: 18,
        band: 'low_attention',
        bandLabel: 'Low attention',
        scoreHint: 'Review-priority indicator',
        advisory: 'Decision-support only.',
        factors: [],
      },
      readiness: 'ready',
      readinessLabel: 'READY',
      financialAmount: null,
      financialUnavailableReason: 'Not available in current bid data',
      latestDecision: null,
      requirementCells: [
        {
          requirementId: 'r1',
          name: 'GST registration',
          mandatory: true,
          evidenceStatus: 'evidence_available',
          evaluation: 'pass',
          cellStatus: 'pass',
          cellLabel: 'PASS',
          explanation: 'Required evidence is present.',
          documents: [{ id: 'd1', originalFilename: 'DEMO_GST.txt', documentType: 'gst_certificate' }],
          verification: { id: 'v1', status: 'matched', source: 'gst' },
          crossCheck: { id: 'c1', status: 'consistent', comparisonType: 'gst_mca' },
          reviews: [],
        },
      ],
      links: {
        bid: '/bharatbid/bids/b1',
        documents: '/bharatbid/bids/b1/documents',
        verification: '/bharatbid/bids/b1/verification',
        crossChecks: '/bharatbid/bids/b1/cross-checks',
        requirements: '/bharatbid/bids/b1/requirements',
        review: '/bharatbid/bids/b1/review',
        intelligence: '/bharatbid/bids/b1/intelligence',
      },
    },
    {
      id: 'b2',
      submissionReference: 'BID-B',
      bidderId: 'bb2',
      bidderLegalName: 'Delta Petrochem Traders',
      status: 'submitted',
      evidenceCoveragePercent: 40,
      verificationSummary: { total: 2, matched: 0, mismatched: 1, notFound: 0, errors: 0 },
      verificationLabel: 'Mismatch',
      crossCheckSummary: { total: 1, consistent: 0, inconsistent: 1, insufficient: 0, notComparable: 0 },
      crossCheckLabel: 'Inconsistent',
      reviewSummary: { open: 1, inReview: 0, clarificationRequested: 1, assessed: 0, closed: 0, total: 2 },
      attention: {
        score: 72,
        band: 'high_attention',
        bandLabel: 'High attention',
        scoreHint: 'Review-priority indicator',
        advisory: 'Decision-support only.',
        factors: [],
      },
      readiness: 'clarification_pending',
      readinessLabel: 'CLARIFICATION_PENDING',
      financialAmount: null,
      financialUnavailableReason: 'Not available in current bid data',
      latestDecision: null,
      requirementCells: [
        {
          requirementId: 'r1',
          name: 'GST registration',
          mandatory: true,
          evidenceStatus: 'evidence_conflict',
          evaluation: 'review_required',
          cellStatus: 'conflict',
          cellLabel: 'CONFLICT',
          explanation: 'A source check found a field difference.',
          documents: [{ id: 'd2', originalFilename: 'DEMO_GST_B.txt', documentType: 'gst_certificate' }],
          verification: { id: 'v2', status: 'mismatched', source: 'gst' },
          crossCheck: { id: 'c2', status: 'inconsistent', comparisonType: 'gst_mca' },
          reviews: [{ id: 'rv1', title: 'GST mismatch', status: 'open', issueType: 'verification_mismatch' }],
        },
      ],
      links: {
        bid: '/bharatbid/bids/b2',
        documents: '/bharatbid/bids/b2/documents',
        verification: '/bharatbid/bids/b2/verification',
        crossChecks: '/bharatbid/bids/b2/cross-checks',
        requirements: '/bharatbid/bids/b2/requirements',
        review: '/bharatbid/bids/b2/review',
        intelligence: '/bharatbid/bids/b2/intelligence',
      },
    },
  ],
  notes: [
    {
      id: 'n1',
      evaluationId: 'e1',
      bidSubmissionId: null,
      bidReference: null,
      note: 'Tender requirements have been opened for comparative inspection.',
      attemptNumber: 1,
      isLatest: true,
      createdBy: { id: 'u1', displayName: 'Demo Officer' },
      createdAt: '2026-08-30T16:18:00.000Z',
    },
  ],
  decisions: [],
  checklist: [
    { id: 'requirements', label: 'Tender requirements reviewed', passed: true },
    { id: 'open_reviews', label: 'Open review items resolved', passed: false },
  ],
  financialUnavailableReason: 'Not available in current bid data',
  advisory:
    'This workspace supports human procurement evaluation using available evidence and system findings. Final procurement decisions remain with authorized officers.',
  decisionAdvisory: 'Officer-entered decision-support record. This is not an award, rejection, disqualification, or automated system decision.',
  attentionDisclaimer:
    'Officer Review Priority is a review-triage indicator. It is not a bidder ranking, selection score, bid quality score, or procurement merit score.',
  demoLabel: 'DEMO / SYNTHETIC',
};

function jsonResponse(data: unknown, status = 200): Response {
  return {
    ok: status < 400,
    status,
    json: async () => ({ success: status < 400, data }),
  } as Response;
}

describe('EvaluationWorkspacePage', () => {
  it('compares bids, shows requirement cells, and records an officer note', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/notes') && init?.method === 'POST') {
        return jsonResponse({
          note: {
            id: 'n2',
            evaluationId: 'e1',
            bidSubmissionId: null,
            bidReference: null,
            note: 'Technical documentation requires additional clarification before evaluation.',
            attemptNumber: 2,
            isLatest: true,
            createdBy: { id: 'u1', displayName: 'Demo Officer' },
            createdAt: '2026-08-30T17:00:00.000Z',
          },
        }, 201);
      }
      return jsonResponse({ comparison });
    });
    vi.stubGlobal('fetch', fetchMock);

    render(
      <MemoryRouter initialEntries={['/bharatbid/evaluation/t1']}>
        <AuthProvider
          initialSession={{
            ...TEST_SESSION,
            user: { ...TEST_SESSION.user, permissions: ['bids.read', 'bids.write'] },
          }}
        >
          <ToastProvider>
            <Routes>
              <Route path="/bharatbid/evaluation/:tenderId" element={<EvaluationWorkspacePage />} />
            </Routes>
          </ToastProvider>
        </AuthProvider>
      </MemoryRouter>,
    );

    expect((await screen.findAllByText('Bayfront Engineering Private Limited')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Delta Petrochem Traders').length).toBeGreaterThan(0);
    expect(screen.getByText('PASS')).toBeInTheDocument();
    expect(screen.getByText('CONFLICT')).toBeInTheDocument();
    expect(screen.getAllByText('Officer Review Priority').length).toBeGreaterThan(0);
    expect(screen.getByText(/not a bidder ranking/i)).toBeInTheDocument();
    expect(screen.getAllByText('Not available in current bid data').length).toBeGreaterThan(0);
    expect(screen.queryByText(/rank 1|best bidder|automatically selected/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('PASS'));
    expect(await screen.findByText(/Required evidence is present/)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Note'), {
      target: { value: 'Technical documentation requires additional clarification before evaluation.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Record note' }));
    expect(await screen.findByText('Evaluation note recorded')).toBeInTheDocument();
  });

  it('keeps reviewers read-only', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ comparison })));

    render(
      <MemoryRouter initialEntries={['/bharatbid/evaluation/t1']}>
        <AuthProvider initialSession={{ ...TEST_SESSION, user: { ...TEST_SESSION.user, permissions: ['bids.read'] } }}>
          <ToastProvider>
            <Routes>
              <Route path="/bharatbid/evaluation/:tenderId" element={<EvaluationWorkspacePage />} />
            </Routes>
          </ToastProvider>
        </AuthProvider>
      </MemoryRouter>,
    );

    expect((await screen.findAllByText('Bayfront Engineering Private Limited')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Read-only').length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: 'Record officer decision' })).not.toBeInTheDocument();
  });
});
