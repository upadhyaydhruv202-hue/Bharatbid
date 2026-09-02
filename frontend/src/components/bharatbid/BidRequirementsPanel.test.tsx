import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MemoryRouter } from 'react-router-dom';
import { BidRequirementsPanel } from './BidRequirementsPanel';
import type { RequirementIntelligenceResult } from '../../services/bharatbid';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const intelligence: RequirementIntelligenceResult = {
  items: [
    {
      requirementId: 'r-gst',
      name: 'GST Certificate',
      description: 'GST registration required',
      requirementType: 'statutory',
      mandatory: true,
      ruleKind: 'gst_verification',
      evidenceStatus: 'evidence_available',
      evaluation: 'pass',
      explanation: 'Required GST evidence is present and the extracted identifier matched the selected source record.',
      documents: [{ id: 'd1', originalFilename: 'DEMO_GST_Certificate.txt', documentType: 'gst_certificate' }],
      verification: { id: 'v1', status: 'matched', source: 'gst' },
      crossCheck: { id: 'c1', status: 'consistent', comparisonType: 'gst_mca' },
    },
    {
      requirementId: 'r-udyam',
      name: 'Udyam Registration',
      description: null,
      requirementType: 'eligibility',
      mandatory: true,
      ruleKind: 'udyam',
      evidenceStatus: 'evidence_missing',
      evaluation: 'not_evaluated',
      explanation: 'No relevant evidence is associated with this requirement.',
      documents: [],
      verification: null,
      crossCheck: null,
    },
    {
      requirementId: 'r-tech',
      name: 'Technical Experience',
      description: null,
      requirementType: 'technical',
      mandatory: true,
      ruleKind: 'officer_review',
      evidenceStatus: 'evidence_available',
      evaluation: 'review_required',
      explanation: 'Evidence exists, but this requirement requires officer assessment. It is not machine-evaluable.',
      documents: [{ id: 'd2', originalFilename: 'DEMO_Experience.txt', documentType: 'experience_certificate' }],
      verification: null,
      crossCheck: null,
    },
  ],
  summary: {
    total: 3,
    mandatory: 3,
    evidenceAvailable: 2,
    evidenceMissing: 1,
    reviewRequired: 1,
    passCount: 1,
    evidenceCoveragePercent: 67,
  },
  reviewItems: [
    {
      id: 'req:r-udyam',
      kind: 'requirement',
      title: 'Udyam Registration',
      reason: 'No relevant evidence is associated with this requirement.',
      requirementId: 'r-udyam',
    },
    {
      id: 'req:r-tech',
      kind: 'requirement',
      title: 'Technical Experience',
      reason: 'Evidence exists, but this requirement requires officer assessment.',
      requirementId: 'r-tech',
      documentId: 'd2',
    },
  ],
  advisory: 'Demo source — simulated verification data. Not an official government response.',
};

function jsonResponse(data: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({ 'Content-Type': 'application/json' }),
    json: async () => ({ success: status < 400, data, meta: {} }),
  } as Response;
}

function stubApi(payload: RequirementIntelligenceResult | 'error' = intelligence) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => {
      if (payload === 'error') {
        return {
          ok: false,
          status: 500,
          headers: new Headers({ 'Content-Type': 'application/json' }),
          json: async () => ({
            success: false,
            error: { code: 'INTERNAL', message: 'Unable to load requirement intelligence' },
          }),
        } as Response;
      }
      return jsonResponse(payload);
    }),
  );
}

function renderPanel() {
  return render(
    <MemoryRouter>
      <BidRequirementsPanel bidId="bid1" token="token" />
    </MemoryRouter>,
  );
}

describe('BidRequirementsPanel', () => {
  it('renders the requirement matrix, evidence coverage, and review queue', async () => {
    stubApi();
    renderPanel();
    expect(await screen.findByText('GST Certificate')).toBeInTheDocument();
    expect(screen.getByText('Evidence Coverage')).toBeInTheDocument();
    expect(screen.getByText('67%')).toBeInTheDocument();
    expect(screen.getAllByText(/not a compliance score/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Requires review').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Udyam Registration').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Technical Experience').length).toBeGreaterThan(0);
    expect(screen.queryByText(/trust score|fraud detected|fake bidder/i)).not.toBeInTheDocument();
  });

  it('opens requirement detail with evidence, verification, and pass explanation', async () => {
    stubApi();
    renderPanel();
    fireEvent.click(await screen.findByText('GST Certificate'));
    expect(await screen.findByRole('heading', { name: 'Requirement evidence' })).toBeInTheDocument();
    expect(screen.getByText('DEMO_GST_Certificate.txt')).toBeInTheDocument();
    expect(screen.getAllByText(/matched the selected source record/i).length).toBeGreaterThan(0);
    expect(screen.getByText('DEMO SOURCE')).toBeInTheDocument();
  });

  it('shows evidence missing without labelling FAIL', async () => {
    stubApi();
    renderPanel();
    fireEvent.click((await screen.findAllByText('Udyam Registration'))[0]);
    expect(await screen.findAllByText('No relevant evidence is associated with this requirement.')).not.toHaveLength(0);
    expect(screen.getAllByText('Evidence missing').length).toBeGreaterThan(0);
    expect(screen.queryByText(/^Fail$/)).not.toBeInTheDocument();
  });

  it('flags technical experience as officer review required', async () => {
    stubApi();
    renderPanel();
    fireEvent.click((await screen.findAllByText('Technical Experience'))[0]);
    expect(await screen.findByText('Officer review required')).toBeInTheDocument();
    expect(screen.getAllByText(/requires officer assessment/i).length).toBeGreaterThan(0);
  });

  it('shows loading then empty requirements', async () => {
    stubApi({
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
    renderPanel();
    expect(await screen.findByText('No active tender requirements.')).toBeInTheDocument();
  });

  it('shows an error state when the API fails', async () => {
    stubApi('error');
    renderPanel();
    expect(await screen.findByText(/unable to load/i)).toBeInTheDocument();
  });
});
