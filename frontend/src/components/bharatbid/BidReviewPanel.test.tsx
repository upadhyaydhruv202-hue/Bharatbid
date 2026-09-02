import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { BidReviewPanel } from './BidReviewPanel';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function jsonResponse(data: unknown): Response {
  return { ok: true, status: 200, json: async () => ({ success: true, data }) } as Response;
}

describe('BidReviewPanel', () => {
  it('summarises open reviews and assessments', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse({
          items: [
            {
              id: 'rev1',
              bidSubmissionId: 'bid1',
              bidReference: 'BID-1',
              tenderId: 't1',
              tenderReference: 'GEM/1',
              tenderTitle: 'Valves',
              bidderId: 'b1',
              bidderLegalName: 'Bayfront Engineering Private Limited',
              issueType: 'review_required',
              issueLabel: 'Officer review required',
              status: 'assessed',
              title: 'Financial eligibility',
              machineFinding: 'REVIEW_REQUIRED',
              mandatory: true,
              requirementName: 'Financial eligibility',
              latestAssessment: {
                assessment: 'evidence_sufficient',
                assessedAt: '2026-08-30T14:10:00.000Z',
                officerName: 'Demo Officer',
              },
              openClarification: false,
              createdAt: '2026-08-30T12:00:00.000Z',
              updatedAt: '2026-08-30T14:10:00.000Z',
            },
          ],
          summary: {
            total: 1,
            open: 0,
            inReview: 0,
            clarificationRequested: 0,
            assessed: 1,
            closed: 0,
            finalProcurementDecisions: 0,
          },
          advisory: 'Decision support only.',
        }),
      ),
    );

    render(
      <MemoryRouter>
        <BidReviewPanel
          bidId="bid1"
          token="token"
          intelligence={{ total: 5, evidenceAvailable: 3, evidenceMissing: 1, reviewRequired: 1 }}
        />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Financial eligibility')).toBeInTheDocument();
    expect(screen.getByText(/0 final procurement decisions/i)).toBeInTheDocument();
    expect(screen.getByText('REVIEW REQUIRED')).toBeInTheDocument();
    expect(screen.getByText('Evidence sufficient')).toBeInTheDocument();
  });

  it('shows an empty review state', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse({
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
        }),
      ),
    );

    render(
      <MemoryRouter>
        <BidReviewPanel bidId="bid1" token="token" />
      </MemoryRouter>,
    );

    expect(await screen.findByText('No review items require attention for this bid.')).toBeInTheDocument();
  });
});
