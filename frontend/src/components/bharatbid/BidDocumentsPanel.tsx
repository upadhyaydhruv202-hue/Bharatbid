import { useEffect, useMemo, useState } from 'react';

import { ConfirmActionModal } from './ConfirmActionModal';
import {
  BID_DOCUMENT_CATEGORY_FILTERS,
  BID_DOCUMENT_TYPE_OPTIONS,
  formatDate,
  StatusBadge,
} from './StatusBadge';
import { getApiErrorMessage } from '../../services/api';
import {
  archiveBidDocument,
  createBidVerification,
  downloadBidDocument,
  EXTRACTION_ADVISORY,
  getBidDocument,
  linkBidDocumentRequirement,
  listBidDocuments,
  replaceBidDocument,
  uploadBidDocument,
  type BidDocumentDetail,
  type BidDocumentListItem,
  type BidDocumentSummary,
} from '../../services/bharatbid';
import {
  Alert,
  Button,
  Card,
  CardTitle,
  DataTable,
  ErrorState,
  Input,
  LoadingState,
  Modal,
  Select,
  useToast,
} from '../../ui';

const EMPTY_SUMMARY: BidDocumentSummary = {
  total: 0,
  ready: 0,
  processing: 0,
  failed: 0,
  archived: 0,
  unmapped: 0,
};

export function BidDocumentsPanel({
  bidId,
  token,
  canWrite,
  onChanged,
}: {
  bidId: string;
  token: string;
  canWrite: boolean;
  onChanged?: () => void;
}) {
  const { toast } = useToast();
  const [items, setItems] = useState<BidDocumentListItem[]>([]);
  const [requirements, setRequirements] = useState<Array<{ id: string; name: string }>>([]);
  const [summary, setSummary] = useState<BidDocumentSummary>(EMPTY_SUMMARY);
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState<'newest' | 'oldest' | 'name' | 'type'>('newest');
  const [currentOnly, setCurrentOnly] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [replaceTarget, setReplaceTarget] = useState<BidDocumentListItem>();
  const [archiveTarget, setArchiveTarget] = useState<BidDocumentListItem>();
  const [viewing, setViewing] = useState<BidDocumentDetail>();
  const [verifyIdentifier, setVerifyIdentifier] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string>();
  const [previewKind, setPreviewKind] = useState<'pdf' | 'image' | 'text' | 'none'>('none');
  const [previewText, setPreviewText] = useState<string>();
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError(undefined);
    try {
      const result = await listBidDocuments(bidId, token, {
        category: category || undefined,
        sort,
        currentOnly,
        pageSize: 100,
      });
      setItems(result.items);
      setRequirements(result.requirements);
      setSummary(result.summary);
    } catch (caught) {
      setError(getApiErrorMessage(caught, 'Unable to load documents.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [bidId, token, category, sort, currentOnly]);

  const requirementOptions = useMemo(
    () => [{ value: 'unmapped', label: 'Unmapped' }, ...requirements.map((item) => ({ value: item.id, label: item.name }))],
    [requirements],
  );

  async function refresh() {
    await load();
    onChanged?.();
  }

  async function openPreview(document: BidDocumentListItem) {
    try {
      const [detail, file] = await Promise.all([
        getBidDocument(bidId, document.id, token),
        downloadBidDocument(bidId, document.id, token, 'inline'),
      ]);
      setViewing(detail);
      setVerifyIdentifier(extractedIdentifierForDocument(detail) ?? '');
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      const url = URL.createObjectURL(file.blob);
      setPreviewUrl(url);
      if (file.mimeType.includes('pdf')) {
        setPreviewKind('pdf');
        setPreviewText(undefined);
      } else if (file.mimeType.startsWith('image/')) {
        setPreviewKind('image');
        setPreviewText(undefined);
      } else if (file.mimeType.startsWith('text/')) {
        setPreviewKind('text');
        setPreviewText(await file.blob.text());
      } else {
        setPreviewKind('none');
        setPreviewText(undefined);
      }
    } catch (caught) {
      toast({ title: getApiErrorMessage(caught, 'Unable to open this document'), variant: 'error' });
    }
  }

  async function onDownload(document: BidDocumentListItem) {
    try {
      const file = await downloadBidDocument(bidId, document.id, token, 'attachment');
      const url = URL.createObjectURL(file.blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = file.filename || document.originalFilename;
      link.click();
      URL.revokeObjectURL(url);
    } catch (caught) {
      toast({ title: getApiErrorMessage(caught, 'Download failed'), variant: 'error' });
    }
  }

  async function onArchive() {
    if (!archiveTarget) return;
    setSaving(true);
    try {
      await archiveBidDocument(bidId, archiveTarget.id, token);
      toast({ title: 'Document archived', variant: 'success' });
      setArchiveTarget(undefined);
      await refresh();
    } catch (caught) {
      toast({ title: getApiErrorMessage(caught, 'Archive failed'), variant: 'error' });
    } finally {
      setSaving(false);
    }
  }

  async function onMap(documentId: string, tenderRequirementId: string) {
    setSaving(true);
    try {
      await linkBidDocumentRequirement(bidId, documentId, tenderRequirementId === 'unmapped' ? null : tenderRequirementId, token);
      toast({ title: 'Requirement mapping updated', variant: 'success' });
      await refresh();
      if (viewing?.id === documentId) {
        setViewing(await getBidDocument(bidId, documentId, token));
      }
    } catch (caught) {
      toast({ title: getApiErrorMessage(caught, 'Could not update mapping'), variant: 'error' });
    } finally {
      setSaving(false);
    }
  }

  function closePreview() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(undefined);
    setPreviewText(undefined);
    setViewing(undefined);
    setPreviewKind('none');
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Document evidence</h2>
          <p className="text-sm text-foreground-muted">
            Documents: {summary.total}
            {summary.ready ? ` · Ready: ${summary.ready}` : ''}
            {summary.processing ? ` · Processing: ${summary.processing}` : ''}
            {summary.failed ? ` · Failed: ${summary.failed}` : ''}
          </p>
        </div>
        {canWrite ? (
          <Button onClick={() => setUploadOpen(true)} aria-label="Upload document">
            Upload document
          </Button>
        ) : null}
      </div>

      {summary.unmapped > 0 ? (
        <Alert title="Unmapped documents">
          {summary.unmapped} document{summary.unmapped === 1 ? ' is' : 's are'} not associated with a tender
          requirement. Linking a file records association only — it does not mean the requirement is satisfied.
        </Alert>
      ) : null}

      <div className="flex flex-wrap gap-2" role="group" aria-label="Document category">
        {BID_DOCUMENT_CATEGORY_FILTERS.map((item) => (
          <Button
            key={item.label}
            size="sm"
            variant={category === item.value ? 'primary' : 'outline'}
            aria-pressed={category === item.value}
            onClick={() => setCategory(item.value)}
          >
            {item.label}
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <Select
          label="Sort"
          value={sort}
          onChange={(event) => setSort(event.target.value as typeof sort)}
          options={[
            { value: 'newest', label: 'Newest' },
            { value: 'oldest', label: 'Oldest' },
            { value: 'name', label: 'Name' },
            { value: 'type', label: 'Type' },
          ]}
        />
        <label className="flex items-center gap-2 pb-2 text-sm">
          <input
            type="checkbox"
            checked={!currentOnly}
            onChange={(event) => setCurrentOnly(!event.target.checked)}
          />
          Include previous versions
        </label>
      </div>

      {loading ? <LoadingState label="Loading documents…" /> : null}
      {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}

      {!loading && !error ? (
        <DataTable
          caption="Bid documents"
          rows={items}
          rowId={(row) => row.id}
          emptyTitle="No documents uploaded for this bid yet."
          emptyDescription="Upload supporting evidence and associate it with tender requirements."
          columns={[
            { id: 'file', header: 'Document', accessor: (row) => row.originalFilename },
            { id: 'type', header: 'Type', accessor: (row) => row.documentTypeLabel },
            {
              id: 'requirement',
              header: 'Requirement',
              accessor: (row) => (row.linked ? row.requirementName : 'Unmapped'),
            },
            { id: 'version', header: 'Version', accessor: (row) => `v${row.versionNumber}` },
            {
              id: 'status',
              header: 'Status',
              accessor: (row) => <StatusBadge kind="document" value={row.status} />,
            },
            { id: 'uploadedBy', header: 'Uploaded by', accessor: (row) => row.uploadedByName || '—' },
            { id: 'uploaded', header: 'Uploaded', accessor: (row) => formatDate(row.createdAt) },
            {
              id: 'extraction',
              header: 'Extraction',
              accessor: (row) => <StatusBadge kind="extraction" value={row.extractionStatus} />,
            },
            {
              id: 'actions',
              header: 'Actions',
              accessor: (row) => (
                <div className="flex flex-wrap gap-1">
                  <Button size="sm" variant="ghost" onClick={() => void openPreview(row)}>
                    View
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => void onDownload(row)}>
                    Download
                  </Button>
                  {canWrite && row.isCurrent && row.status !== 'archived' ? (
                    <>
                      <Button size="sm" variant="ghost" onClick={() => setReplaceTarget(row)}>
                        New version
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setArchiveTarget(row)}>
                        Archive
                      </Button>
                    </>
                  ) : null}
                </div>
              ),
            },
          ]}
        />
      ) : null}

      {requirements.length > 0 ? (
        <Card>
          <CardTitle className="mb-4">Requirement mapping</CardTitle>
          <ul className="space-y-4">
            {requirements.map((requirement) => {
              const linked = items.filter((item) => item.tenderRequirementId === requirement.id && item.isCurrent);
              return (
                <li key={requirement.id} className="border-b border-edge pb-3 last:border-0 last:pb-0">
                  <p className="text-sm font-medium">{requirement.name}</p>
                  {linked.length === 0 ? (
                    <p className="mt-1 text-sm text-foreground-muted">Not provided</p>
                  ) : (
                    <ul className="mt-1 space-y-1 text-sm">
                      {linked.map((item) => (
                        <li key={item.id}>
                          ✓ {item.originalFilename}{' '}
                          <span className="text-foreground-muted">· Document linked</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>
      ) : null}

      <UploadDocumentModal
        open={uploadOpen}
        saving={saving}
        requirements={requirementOptions}
        onClose={() => setUploadOpen(false)}
        onSubmit={async (input) => {
          setSaving(true);
          try {
            await uploadBidDocument(bidId, input, token);
            toast({ title: 'Document uploaded', variant: 'success' });
            setUploadOpen(false);
            await refresh();
          } catch (caught) {
            toast({ title: getApiErrorMessage(caught, 'Upload failed'), variant: 'error' });
          } finally {
            setSaving(false);
          }
        }}
      />

      <ReplaceDocumentModal
        open={Boolean(replaceTarget)}
        filename={replaceTarget?.originalFilename}
        saving={saving}
        onClose={() => setReplaceTarget(undefined)}
        onSubmit={async (file) => {
          if (!replaceTarget) return;
          setSaving(true);
          try {
            await replaceBidDocument(bidId, replaceTarget.id, file, token);
            toast({ title: 'New document version created', variant: 'success' });
            setReplaceTarget(undefined);
            await refresh();
          } catch (caught) {
            toast({ title: getApiErrorMessage(caught, 'Could not create a new version'), variant: 'error' });
          } finally {
            setSaving(false);
          }
        }}
      />

      <ConfirmActionModal
        open={Boolean(archiveTarget)}
        title="Archive this document?"
        description="The file remains in history as archived evidence. It is not permanently deleted."
        confirmLabel="Archive"
        cancelLabel="Cancel"
        loading={saving}
        onClose={() => setArchiveTarget(undefined)}
        onConfirm={() => void onArchive()}
      />

      <Modal
        open={Boolean(viewing)}
        onClose={closePreview}
        title={viewing?.originalFilename ?? 'Document'}
        description={viewing ? `${viewing.documentTypeLabel} · v${viewing.versionNumber}` : undefined}
        size="lg"
      >
        {viewing ? (
          <div className="space-y-4">
            <dl className="grid gap-3 sm:grid-cols-2 text-sm">
              <Meta label="Type" value={viewing.documentTypeLabel} />
              <Meta label="Size" value={formatBytes(viewing.sizeBytes)} />
              <Meta label="Version" value={`v${viewing.versionNumber}${viewing.isCurrent ? ' (current)' : ''}`} />
              <Meta label="Checksum" value={viewing.checksumShort} />
              <Meta label="Uploaded by" value={viewing.uploadedByName} />
              <Meta label="Uploaded" value={formatDate(viewing.createdAt)} />
              <div>
                <dt className="text-xs uppercase tracking-wide text-foreground-muted">Status</dt>
                <dd className="mt-1">
                  <StatusBadge kind="document" value={viewing.status} />
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-foreground-muted">Extraction</dt>
                <dd className="mt-1">
                  <StatusBadge kind="extraction" value={viewing.extractionStatus} />
                </dd>
              </div>
            </dl>
            {canWrite ? (
              <Select
                label="Associated requirement"
                value={viewing.tenderRequirementId ?? 'unmapped'}
                options={requirementOptions}
                onChange={(event) => void onMap(viewing.id, event.target.value)}
              />
            ) : (
              <p className="text-sm">
                Requirement: {viewing.linked ? viewing.requirementName : 'Unmapped'}
                {viewing.linked ? ' · Document linked' : ''}
              </p>
            )}
            {viewing.extractionStatus === 'processing' ? (
              <Alert>Processing document…</Alert>
            ) : null}
            {viewing.extractionStatus === 'failed' ? (
              <Alert title="Extraction failed">
                {viewing.extractionError || 'The original document is still available.'}
              </Alert>
            ) : null}
            {viewing.extractionStatus === 'completed' && viewing.extractedText ? (
              <div>
                <h3 className="text-sm font-semibold">Extracted information</h3>
                <p className="mt-1 text-xs text-foreground-muted">{viewing.extractionAdvisory || EXTRACTION_ADVISORY}</p>
                <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-lg border border-edge bg-surface-muted p-3 text-xs">
                  {viewing.extractedText}
                </pre>
                <DocumentVerifyAction
                  document={viewing}
                  identifier={verifyIdentifier}
                  canWrite={canWrite}
                  saving={saving}
                  onIdentifierChange={setVerifyIdentifier}
                  onVerify={async () => {
                    const hint = verifyHint(viewing);
                    if (!hint) {
                      return;
                    }
                    const value = verifyIdentifier.trim() || extractedIdentifierForDocument(viewing);
                    if (!value) {
                      toast({ title: 'Enter an identifier to run verification', variant: 'error' });
                      return;
                    }
                    setSaving(true);
                    try {
                      const result = await createBidVerification(
                        bidId,
                        {
                          source: hint.source,
                          identifierType: hint.identifierType,
                          identifier: value,
                          documentId: viewing.id,
                        },
                        token,
                      );
                      toast({
                        title:
                          result.status === 'matched'
                            ? 'Matched — demo source'
                            : result.status === 'mismatched'
                              ? 'Mismatched — demo source'
                              : result.status === 'not_found'
                                ? 'Not found in demo source'
                                : 'Verification could not be completed',
                        variant: result.status === 'error' ? 'error' : 'success',
                      });
                      onChanged?.();
                    } catch (caught) {
                      toast({ title: getApiErrorMessage(caught, 'Verification could not be started'), variant: 'error' });
                    } finally {
                      setSaving(false);
                    }
                  }}
                />
              </div>
            ) : null}
            {viewing.versions.length > 1 ? (
              <div>
                <h3 className="text-sm font-semibold">Versions</h3>
                <ul className="mt-1 space-y-1 text-sm">
                  {viewing.versions.map((version) => (
                    <li key={version.id}>
                      v{version.versionNumber}
                      {version.isCurrent ? ' — current' : ` — ${version.status.replace(/_/g, ' ')}`}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {previewKind === 'pdf' && previewUrl ? (
              <iframe title="Document preview" src={previewUrl} className="h-80 w-full rounded-lg border border-edge" sandbox="" />
            ) : null}
            {previewKind === 'image' && previewUrl ? (
              <img alt={viewing.originalFilename} src={previewUrl} className="max-h-80 rounded-lg border border-edge" />
            ) : null}
            {previewKind === 'text' && previewText !== undefined ? (
              <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-lg border border-edge bg-surface-muted p-3 text-sm">
                {previewText}
              </pre>
            ) : null}
            {previewKind === 'none' ? (
              <p className="text-sm text-foreground-muted">Preview is not available for this file type. Use Download.</p>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

function UploadDocumentModal({
  open,
  saving,
  requirements,
  onClose,
  onSubmit,
}: {
  open: boolean;
  saving: boolean;
  requirements: Array<{ value: string; label: string }>;
  onClose: () => void;
  onSubmit: (input: { file: File; documentType: string; tenderRequirementId: string | null }) => Promise<void>;
}) {
  const [file, setFile] = useState<File>();
  const [documentType, setDocumentType] = useState('gst_certificate');
  const [requirementId, setRequirementId] = useState('unmapped');
  const [formError, setFormError] = useState<string>();

  useEffect(() => {
    if (open) {
      setFile(undefined);
      setDocumentType('gst_certificate');
      setRequirementId('unmapped');
      setFormError(undefined);
    }
  }, [open]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Upload document"
      description="Select a file, document type, and optional requirement. Linking does not mean the requirement is satisfied."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            loading={saving}
            onClick={() => {
              if (!file) {
                setFormError('Choose a file to upload.');
                return;
              }
              void onSubmit({
                file,
                documentType,
                tenderRequirementId: requirementId === 'unmapped' ? null : requirementId,
              });
            }}
          >
            Upload
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Input
          type="file"
          label="File"
          accept=".pdf,.png,.jpg,.jpeg,.txt,application/pdf,image/png,image/jpeg,text/plain"
          error={formError}
          onChange={(event) => setFile(event.target.files?.[0])}
        />
        <Select
          label="Document type"
          value={documentType}
          options={BID_DOCUMENT_TYPE_OPTIONS}
          onChange={(event) => setDocumentType(event.target.value)}
        />
        <Select
          label="Associated requirement"
          value={requirementId}
          options={requirements}
          onChange={(event) => setRequirementId(event.target.value)}
        />
      </div>
    </Modal>
  );
}

function ReplaceDocumentModal({
  open,
  filename,
  saving,
  onClose,
  onSubmit,
}: {
  open: boolean;
  filename?: string;
  saving: boolean;
  onClose: () => void;
  onSubmit: (file: File) => Promise<void>;
}) {
  const [file, setFile] = useState<File>();
  const [formError, setFormError] = useState<string>();

  useEffect(() => {
    if (open) {
      setFile(undefined);
      setFormError(undefined);
    }
  }, [open]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Upload a new version"
      description={
        filename
          ? `The previous file for ${filename} remains in history. The new file becomes the current version.`
          : 'The previous file remains in history.'
      }
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            loading={saving}
            onClick={() => {
              if (!file) {
                setFormError('Choose a replacement file.');
                return;
              }
              void onSubmit(file);
            }}
          >
            Create version
          </Button>
        </>
      }
    >
      <Input
        type="file"
        label="Replacement file"
        accept=".pdf,.png,.jpg,.jpeg,.txt,application/pdf,image/png,image/jpeg,text/plain"
        error={formError}
        onChange={(event) => setFile(event.target.files?.[0])}
      />
    </Modal>
  );
}

function Meta({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-foreground-muted">{label}</dt>
      <dd className="mt-1">{value || '—'}</dd>
    </div>
  );
}

function formatBytes(size: number): string {
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

const GSTIN_PATTERN = /[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]/i;
const CIN_PATTERN = /[UL][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}/i;
const UDYAM_PATTERN = /UDYAM-[A-Z]{2}-[0-9]{2}-[0-9]{7}/i;

function verifyHint(document: BidDocumentDetail): {
  label: string;
  source: string;
  identifierType: string;
} | null {
  if (document.documentType === 'gst_certificate') {
    return { label: 'Verify GSTIN', source: 'gst', identifierType: 'gstin' };
  }
  if (document.documentType === 'cin') {
    return { label: 'Verify CIN', source: 'mca', identifierType: 'cin' };
  }
  if (document.documentType === 'udyam_certificate') {
    return { label: 'Verify Udyam', source: 'udyam', identifierType: 'udyam' };
  }
  return null;
}

function extractedIdentifierForDocument(document: BidDocumentDetail): string | null {
  const text = document.extractedText?.toUpperCase() ?? '';
  if (document.documentType === 'gst_certificate') {
    return text.match(GSTIN_PATTERN)?.[0] ?? null;
  }
  if (document.documentType === 'cin') {
    return text.match(CIN_PATTERN)?.[0] ?? null;
  }
  if (document.documentType === 'udyam_certificate') {
    return text.match(UDYAM_PATTERN)?.[0] ?? null;
  }
  return null;
}

function DocumentVerifyAction({
  document,
  identifier,
  canWrite,
  saving,
  onIdentifierChange,
  onVerify,
}: {
  document: BidDocumentDetail;
  identifier: string;
  canWrite: boolean;
  saving: boolean;
  onIdentifierChange: (value: string) => void;
  onVerify: () => void;
}) {
  const hint = verifyHint(document);
  if (!hint) {
    return null;
  }
  const extracted = extractedIdentifierForDocument(document);
  return (
    <div className="mt-3 rounded-lg border border-edge p-3">
      <p className="text-sm font-medium">Source check</p>
      <p className="mt-1 text-xs text-foreground-muted">
        {extracted
          ? `Extracted ${hint.identifierType.toUpperCase()}: ${extracted}`
          : 'Extraction did not produce a usable identifier.'}
      </p>
      {!extracted ? (
        <p className="mt-1 text-xs text-foreground-muted">Manually entered identifier — not claimed as document text.</p>
      ) : (
        <p className="mt-1 text-xs text-foreground-muted">Not verified until a demo source check is run.</p>
      )}
      {canWrite ? (
        <div className="mt-2 flex flex-wrap items-end gap-2">
          {!extracted ? (
            <Input
              label="Manually entered identifier"
              value={identifier}
              onChange={(event) => onIdentifierChange(event.target.value)}
            />
          ) : null}
          <Button loading={saving} onClick={onVerify}>
            {hint.label}
          </Button>
        </div>
      ) : (
        <p className="mt-2 text-xs text-foreground-muted">Reviewers can inspect results on the Verification tab.</p>
      )}
    </div>
  );
}
