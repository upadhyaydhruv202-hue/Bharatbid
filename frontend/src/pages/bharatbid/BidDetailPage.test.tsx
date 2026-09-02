import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AuthProvider } from '../../auth/AuthProvider';
import { TEST_SESSION } from '../../test/session';
import { ToastProvider } from '../../ui';
import { BidDetailPage } from './BidDetailPage';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
});

const bid = {
  id: 'bid1',
  submissionReference: 'BID-GEM2026BCPCL001-0001',
  tenderId: 't1',
  tenderReference: 'GEM/2026/B/CPCL/001',
  tenderTitle: 'Supply of industrial valves',
  bidderId: 'b1',
  bidderLegalName: 'Bayfront Engineering Private Limited',
  status: 'draft',
  submittedAt: null,
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
  tenderCategory: 'Goods',
  tenderClosingDate: '2026-09-15T00:00:00.000Z',
  tenderStatus: 'open',
  bidderTradeName: 'Bayfront Valves',
  bidderCity: 'Chennai',
  bidderState: 'Tamil Nadu',
  bidderContactName: 'Kavitha Raman',
  bidderContactEmail: 'kavitha.demo@bayfront.example',
  bidderPan: 'AAAPB1234C',
  bidderGstin: '33AAAPB1234C1Z5',
  readiness: {
    readyToOpen: true,
    items: [
      { id: 'tender', label: 'Tender selected', passed: true },
      { id: 'bidder', label: 'Bidder selected', passed: true },
      { id: 'reference', label: 'Submission reference created', passed: true },
      { id: 'metadata', label: 'Submission metadata complete', passed: true },
    ],
  },
  fieldLocks: { all: false },
  allowedActions: [{ action: 'submit', label: 'Submit bid' }],
  documentSummary: { total: 0, ready: 0, processing: 0, failed: 0, archived: 0, unmapped: 0 },
};

function stubBidFetch() {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo) => {
      const url = String(input);
      if (url.includes('/documents')) {
        return jsonResponse(
          {
            items: [],
            summary: bid.documentSummary,
            requirements: [{ id: 'r1', name: 'GST registration' }],
          },
          { page: 1, pageSize: 100, totalItems: 0, totalPages: 0, hasNextPage: false, hasPreviousPage: false },
        );
      }
      if (url.includes('/cross-verifications')) {
        return jsonResponse({ items: [] });
      }
      if (url.includes('/requirement-intelligence') || url.includes('/review-items')) {
        return jsonResponse({
          items: [],
          summary: {
            total: 0,
            mandatory: 0,
            evidenceAvailable: 0,
            evidenceMissing: 0,
            reviewRequired: 0,
            passCount: 0,
            evidenceCoveragePercent: null,
          },
          reviewItems: [],
          advisory: 'Demo source — simulated verification data. Not an official government response.',
        });
      }
      if (url.includes('/intelligence')) {
        return jsonResponse({
          intelligence: {
            id: 'bid1',
            submissionReference: bid.submissionReference,
            tenderId: 't1',
            tenderReference: bid.tenderReference,
            tenderTitle: bid.tenderTitle,
            tenderCategory: 'Goods',
            tenderClosingDate: bid.tenderClosingDate,
            bidderId: 'b1',
            bidderLegalName: bid.bidderLegalName,
            status: 'draft',
            score: 0,
            band: 'low_attention',
            bandLabel: 'Low attention',
            openIssues: 0,
            pendingClarifications: 0,
            evidenceCoveragePercent: 100,
            verificationSummary: { total: 0, matched: 0, mismatched: 0, notFound: 0, errors: 0 },
            lastReviewAt: null,
            modelVersion: 'attention-v1',
            unadjustedScore: 0,
            scoreHint:
              'Review-priority indicator based on available evidence, verification, cross-check and review signals.',
            advisory:
              'Decision-support only: This indicator prioritizes bids for human review using available evidence, verification, cross-check and review signals. It does not determine bidder eligibility, fraud, rejection or award.',
            demoLabel: 'DEMO / SYNTHETIC',
            factors: [],
            history: [],
          },
        });
      }
      if (url.includes('/reviews')) {
        return jsonResponse({
          items: [],
          summary: {
            total: 0,
            open: 0,
            inReview: 0,
            clarificationRequested: 0,
            assessed: 0,
            closed: 0,
            finalProcurementDecisions: 0,
          },
          advisory: 'Decision support only. Officer assessments do not approve, reject, or award a bid.',
        });
      }
      if (url.includes('/verifications')) {
        return jsonResponse(
          {
            items: [],
            summary: { total: 0, matched: 0, mismatched: 0, notFound: 0, errors: 0, processing: 0 },
            sources: [],
          },
          { page: 1, pageSize: 100, totalItems: 0, totalPages: 0, hasNextPage: false, hasPreviousPage: false },
        );
      }
      if (url.includes('/activity')) {
        return jsonResponse({ items: [] });
      }
      return jsonResponse({ bid });
    }),
  );
}

describe('BidDetailPage', () => {
  it('opens a submit confirmation instead of submitting immediately', async () => {
    stubBidFetch();

    render(
      <MemoryRouter initialEntries={['/bharatbid/bids/bid1']}>
        <AuthProvider
          initialSession={{
            ...TEST_SESSION,
            user: { ...TEST_SESSION.user, permissions: ['bids.read', 'bids.write'] },
          }}
        >
          <ToastProvider>
            <Routes>
              <Route path="/bharatbid/bids/:id" element={<BidDetailPage />} />
              <Route path="/bharatbid/bids/:id/:section" element={<BidDetailPage />} />
            </Routes>
          </ToastProvider>
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(await screen.findAllByText('BID-GEM2026BCPCL001-0001')).not.toHaveLength(0);
    expect(screen.getByText(/Tender selected/)).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Overview' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Documents (0)' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Verification (0)' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Cross-Checks (0)' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Requirements (0)' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Review (0)' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Intelligence (0)' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Activity' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Submit bid' }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Submit this bid?' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('hides submit for reviewers and keeps the documents workspace read-only', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo) => {
        const url = String(input);
        if (url.includes('/documents')) {
          return jsonResponse({
            items: [],
            summary: bid.documentSummary,
            requirements: [],
          });
        }
        if (url.includes('/cross-verifications')) {
          return jsonResponse({ items: [] });
        }
        if (url.includes('/requirement-intelligence') || url.includes('/review-items')) {
          return jsonResponse({
            items: [],
            summary: {
              total: 0,
              mandatory: 0,
              evidenceAvailable: 0,
              evidenceMissing: 0,
              reviewRequired: 0,
              passCount: 0,
              evidenceCoveragePercent: null,
            },
            reviewItems: [],
            advisory: 'Demo source — simulated verification data. Not an official government response.',
          });
        }
        if (url.includes('/intelligence')) {
          return jsonResponse({
            intelligence: {
              id: 'bid1',
              submissionReference: bid.submissionReference,
              tenderId: 't1',
              tenderReference: bid.tenderReference,
              tenderTitle: bid.tenderTitle,
              tenderCategory: 'Goods',
              tenderClosingDate: bid.tenderClosingDate,
              bidderId: 'b1',
              bidderLegalName: bid.bidderLegalName,
              status: 'submitted',
              score: 0,
              band: 'low_attention',
              bandLabel: 'Low attention',
              openIssues: 0,
              pendingClarifications: 0,
              evidenceCoveragePercent: null,
              verificationSummary: { total: 0, matched: 0, mismatched: 0, notFound: 0, errors: 0 },
              lastReviewAt: null,
              modelVersion: 'attention-v1',
              unadjustedScore: 0,
              scoreHint: 'Review-priority indicator based on available evidence.',
              advisory: 'Decision-support only.',
              demoLabel: 'DEMO / SYNTHETIC',
              factors: [],
              history: [],
            },
          });
        }
        if (url.includes('/reviews')) {
          return jsonResponse({
            items: [],
            summary: {
              total: 0,
              open: 0,
              inReview: 0,
              clarificationRequested: 0,
              assessed: 0,
              closed: 0,
              finalProcurementDecisions: 0,
            },
            advisory: 'Decision support only.',
          });
        }
        if (url.includes('/verifications')) {
          return jsonResponse({
            items: [],
            summary: { total: 0, matched: 0, mismatched: 0, notFound: 0, errors: 0, processing: 0 },
            sources: [],
          });
        }
        if (url.includes('/activity')) {
          return jsonResponse({ items: [] });
        }
        return jsonResponse({
          bid: { ...bid, status: 'submitted', fieldLocks: { all: true }, allowedActions: [] },
        });
      }),
    );

    render(
      <MemoryRouter initialEntries={['/bharatbid/bids/bid1']}>
        <AuthProvider initialSession={{ ...TEST_SESSION, user: { ...TEST_SESSION.user, permissions: ['bids.read'] } }}>
          <ToastProvider>
            <Routes>
              <Route path="/bharatbid/bids/:id" element={<BidDetailPage />} />
              <Route path="/bharatbid/bids/:id/:section" element={<BidDetailPage />} />
            </Routes>
          </ToastProvider>
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Submission locked')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Submit bid' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Documents (0)' }));
    expect(await screen.findByText('No documents uploaded for this bid yet.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Upload document' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Verification (0)' }));
    expect(await screen.findByText('No verification checks yet.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Run verification' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Cross-Checks (0)' }));
    expect(await screen.findByText('No cross-checks yet.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Run cross-checks' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Requirements (0)' }));
    expect(await screen.findByText('No active tender requirements.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Review (0)' }));
    expect(await screen.findByText('No review items require attention for this bid.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Intelligence (0)' }));
    expect(await screen.findByText(/low review priority/i)).toBeInTheDocument();
    expect(screen.queryByText(/edit score|set score|override score/i)).not.toBeInTheDocument();
  });
});

function jsonResponse(data: unknown, meta: Record<string, unknown> = {}): Response {
  return {
    ok: true,
    status: 200,
    json: async () => ({ success: true, data, meta }),
  } as Response;
}
