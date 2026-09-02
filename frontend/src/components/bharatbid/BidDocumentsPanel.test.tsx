import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '../../ui';
import { BidDocumentsPanel } from './BidDocumentsPanel';
import type { BidDocumentDetail, BidDocumentListItem } from '../../services/bharatbid';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const documentItem: BidDocumentListItem = {
  id: 'doc1',
  bidSubmissionId: 'bid1',
  groupId: 'g1',
  versionNumber: 2,
  isCurrent: true,
  documentType: 'gst_certificate',
  documentTypeLabel: 'GST Certificate',
  category: 'identity',
  originalFilename: 'DEMO_GST_Certificate.txt',
  mimeType: 'text/plain',
  sizeBytes: 180,
  checksumShort: 'abcdef12',
  status: 'ready',
  extractionStatus: 'completed',
  tenderRequirementId: 'r1',
  requirementName: 'GST registration',
  linked: true,
  uploadedById: 'user-1',
  uploadedByName: 'Demo Officer',
  createdAt: '2026-08-12T11:00:00.000Z',
  archivedAt: null,
};

const documentDetail: BidDocumentDetail = {
  ...documentItem,
  extractedText: 'DEMO / SYNTHETIC\nExtracted GSTIN placeholder 33AAAPB1234C1Z5',
  extractedAt: '2026-08-12T11:01:00.000Z',
  extractionEngine: 'bharatbid-text-extract',
  extractionError: null,
  extractionAdvisory: 'Machine-extracted information. Not independently verified.',
  versions: [
    { id: 'doc0', versionNumber: 1, status: 'archived', createdAt: '2026-08-10T09:00:00.000Z', isCurrent: false },
    { id: 'doc1', versionNumber: 2, status: 'ready', createdAt: '2026-08-12T11:00:00.000Z', isCurrent: true },
  ],
};

const listPayload = {
  items: [documentItem],
  summary: { total: 1, ready: 1, processing: 0, failed: 0, archived: 0, unmapped: 0 },
  requirements: [{ id: 'r1', name: 'GST registration' }],
};

function jsonResponse(data: unknown, status = 200, meta: Record<string, unknown> = {}): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({ 'Content-Type': 'application/json' }),
    json: async () => ({ success: status < 400, data, error: status >= 400 ? { code: 'ERROR', message: 'Upload failed' } : undefined, meta }),
    blob: async () => new Blob(['x']),
  } as Response;
}

function blobResponse(text: string): Response {
  return {
    ok: true,
    status: 200,
    headers: new Headers({
      'Content-Type': 'text/plain',
      'Content-Disposition': 'inline; filename="DEMO_GST_Certificate.txt"',
    }),
    json: async () => ({}),
    blob: async () => new Blob([text], { type: 'text/plain' }),
  } as Response;
}

function stubDocumentsApi(options: { items?: BidDocumentListItem[]; uploadError?: boolean } = {}) {
  if (!URL.createObjectURL) {
    Object.assign(URL, { createObjectURL: () => 'blob:mock', revokeObjectURL: () => undefined });
  }
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
  const items = options.items ?? listPayload.items;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo, init?: RequestInit) => {
      const url = String(input);
      const method = (init?.method ?? 'GET').toUpperCase();
      if (url.includes('/download')) {
        return blobResponse('DEMO / SYNTHETIC text');
      }
      if (method === 'POST' && url.endsWith('/documents')) {
        if (options.uploadError) {
          return jsonResponse({}, 400);
        }
        return jsonResponse({ document: documentDetail }, 201);
      }
      if (method === 'POST' && url.includes('/version')) {
        return jsonResponse({ document: { ...documentDetail, versionNumber: 3 } }, 201);
      }
      if (method === 'POST' && url.includes('/link-requirement')) {
        return jsonResponse({ document: { ...documentDetail, tenderRequirementId: null, linked: false, requirementName: null } });
      }
      if (method === 'POST' && url.includes('/archive')) {
        return jsonResponse({ document: { ...documentDetail, status: 'archived' } });
      }
      if (method === 'POST' && url.includes('/verifications')) {
        return jsonResponse(
          {
            verification: {
              id: 'v1',
              status: 'matched',
              sourceDisplayName: 'DEMO GST Registry',
              sourceMode: 'demo',
              identifierValue: '33AAAPB1234C1Z5',
              advisory: 'Demo source — simulated verification data. Not an official government response.',
            },
          },
          201,
        );
      }
      if (url.match(/\/documents\/[0-9a-f-]+$/i) || url.includes('/documents/doc1')) {
        return jsonResponse({ document: documentDetail });
      }
      return jsonResponse({
        items,
        summary: {
          total: items.length,
          ready: items.filter((item) => item.status === 'ready').length,
          processing: 0,
          failed: items.filter((item) => item.status === 'failed').length,
          archived: items.filter((item) => item.status === 'archived').length,
          unmapped: items.filter((item) => !item.linked).length,
        },
        requirements: listPayload.requirements,
      });
    }),
  );
}

function renderPanel(canWrite = true) {
  return render(
    <ToastProvider>
      <BidDocumentsPanel bidId="bid1" token="test-token" canWrite={canWrite} />
    </ToastProvider>,
  );
}

describe('BidDocumentsPanel', () => {
  it('lists documents with type, version, extraction, and actions', async () => {
    stubDocumentsApi();
    renderPanel();
    expect(await screen.findByText('DEMO_GST_Certificate.txt')).toBeInTheDocument();
    expect(screen.getByText('GST Certificate')).toBeInTheDocument();
    expect(screen.getByText('v2')).toBeInTheDocument();
    expect(screen.getByText('Extracted')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'View' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'New version' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Archive' })).toBeInTheDocument();
    expect(screen.getByText(/Document linked/)).toBeInTheDocument();
  });

  it('shows the empty state when no documents exist', async () => {
    stubDocumentsApi({ items: [] });
    renderPanel();
    expect(await screen.findByText('No documents uploaded for this bid yet.')).toBeInTheDocument();
    expect(
      screen.getByText('Upload supporting evidence and associate it with tender requirements.'),
    ).toBeInTheDocument();
  });

  it('opens the upload modal with type and requirement mapping', async () => {
    stubDocumentsApi();
    renderPanel();
    fireEvent.click(await screen.findByRole('button', { name: 'Upload document' }));
    expect(screen.getByRole('dialog', { name: 'Upload document' })).toBeInTheDocument();
    expect(screen.getByLabelText('Document type')).toBeInTheDocument();
    expect(screen.getByLabelText('Associated requirement')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'GST Certificate' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Unmapped' })).toBeInTheDocument();
  });

  it('uploads a selected file', async () => {
    stubDocumentsApi();
    renderPanel();
    fireEvent.click(await screen.findByRole('button', { name: 'Upload document' }));
    const file = new File(['DEMO / SYNTHETIC'], 'gst.txt', { type: 'text/plain' });
    fireEvent.change(screen.getByLabelText('File'), { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: 'Upload' }));
    await waitFor(() => expect(screen.getByText('Document uploaded')).toBeInTheDocument());
  });

  it('shows an upload error', async () => {
    stubDocumentsApi({ uploadError: true });
    renderPanel();
    fireEvent.click(await screen.findByRole('button', { name: 'Upload document' }));
    const file = new File(['DEMO'], 'gst.txt', { type: 'text/plain' });
    fireEvent.change(screen.getByLabelText('File'), { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: 'Upload' }));
    await waitFor(() => expect(screen.getByText('Upload failed')).toBeInTheDocument());
  });

  it('previews a document and shows extraction advisory copy', async () => {
    stubDocumentsApi();
    renderPanel();
    fireEvent.click(await screen.findByRole('button', { name: 'View' }));
    expect(await screen.findByText('Machine-extracted information. Not independently verified.')).toBeInTheDocument();
    expect(screen.getByText(/Extracted GSTIN placeholder/)).toBeInTheDocument();
    expect(screen.getByText('v1 — archived')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Verify GSTIN' })).toBeInTheDocument();
    expect(screen.queryByText(/verified gstin/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Verify GSTIN' }));
    await waitFor(() => expect(screen.getByText('Matched — demo source')).toBeInTheDocument());
  });

  it('offers download and archive confirmation', async () => {
    stubDocumentsApi();
    renderPanel();
    fireEvent.click(await screen.findByRole('button', { name: 'Download' }));
    fireEvent.click(screen.getByRole('button', { name: 'Archive' }));
    expect(await screen.findByRole('heading', { name: 'Archive this document?' })).toBeInTheDocument();
  });

  it('opens replace/new version from the current document', async () => {
    stubDocumentsApi();
    renderPanel();
    fireEvent.click(await screen.findByRole('button', { name: 'New version' }));
    expect(screen.getByRole('heading', { name: 'Upload a new version' })).toBeInTheDocument();
  });

  it('hides mutation actions for reviewers', async () => {
    stubDocumentsApi();
    renderPanel(false);
    expect(await screen.findByText('DEMO_GST_Certificate.txt')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Upload document' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'New version' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Archive' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'View' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'View' }));
    expect(await screen.findByText(/Reviewers can inspect results/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Verify GSTIN' })).not.toBeInTheDocument();
  });
});
