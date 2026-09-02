import { useEffect, useMemo, useState } from 'react';

import { formatDateTime, StatusBadge } from './StatusBadge';
import { getApiErrorMessage } from '../../services/api';
import {
  createBidVerification,
  DEMO_SOURCE_ADVISORY,
  getBidVerification,
  listBidVerifications,
  retryBidVerification,
  type BidVerificationSummary,
  type VerificationDetail,
  type VerificationFieldComparison,
  type VerificationListItem,
  type VerificationSourceSnapshot,
  type VerificationSourceView,
} from '../../services/bharatbid';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardTitle,
  DataTable,
  EmptyState,
  ErrorState,
  Input,
  LoadingState,
  Modal,
  Select,
  useToast,
} from '../../ui';

const EMPTY_SUMMARY: BidVerificationSummary = {
  total: 0,
  matched: 0,
  mismatched: 0,
  notFound: 0,
  errors: 0,
  processing: 0,
};

const IDENTIFIER_LABELS: Record<string, string> = {
  gstin: 'GSTIN',
  cin: 'CIN',
  udyam: 'Udyam',
  pan: 'PAN',
  epfo: 'EPFO',
  esic: 'ESIC',
  nsic: 'NSIC',
  dpiit: 'DPIIT',
  gem_seller: 'GeM seller',
  bis: 'BIS',
};

const ORIGIN_LABELS: Record<string, string> = {
  extracted: 'Extracted from document',
  manual: 'Manually entered identifier',
  bidder_profile: 'Taken from bidder profile',
};

export function BidVerificationPanel({
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
  const [items, setItems] = useState<VerificationListItem[]>([]);
  const [summary, setSummary] = useState<BidVerificationSummary>(EMPTY_SUMMARY);
  const [sources, setSources] = useState<VerificationSourceView[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [viewing, setViewing] = useState<VerificationDetail>();
  const [identifierType, setIdentifierType] = useState('gstin');
  const [selectedSource, setSelectedSource] = useState('gst');
  const [identifier, setIdentifier] = useState('');

  async function load() {
    setLoading(true);
    setError(undefined);
    try {
      const result = await listBidVerifications(bidId, token, { latestOnly: true, pageSize: 100 });
      setItems(result.items);
      setSummary(result.summary);
      setSources(result.sources);
      const first = result.sources[0];
      if (first) {
        setSelectedSource((current) => (result.sources.some((item) => item.source === current) ? current : first.source));
      }
    } catch (caught) {
      setError(getApiErrorMessage(caught, 'Unable to load verification checks.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [bidId, token]);

  async function refresh() {
    await load();
    onChanged?.();
  }

  async function openDetail(row: VerificationListItem) {
    try {
      setViewing(await getBidVerification(bidId, row.id, token));
    } catch (caught) {
      toast({ title: getApiErrorMessage(caught, 'Unable to open this verification'), variant: 'error' });
    }
  }

  async function onRun() {
    if (!identifier.trim()) {
      toast({ title: 'Enter an identifier to run verification', variant: 'error' });
      return;
    }
    setSaving(true);
    try {
      const result = await createBidVerification(
        bidId,
        {
          source: selectedSource,
          identifierType,
          identifier: identifier.trim(),
        },
        token,
      );
      toast({ title: statusToast(result.status), variant: result.status === 'error' ? 'error' : 'success' });
      setIdentifier('');
      await refresh();
      setViewing(result);
    } catch (caught) {
      toast({ title: getApiErrorMessage(caught, 'Verification could not be started'), variant: 'error' });
    } finally {
      setSaving(false);
    }
  }

  async function onRetry(id: string) {
    setSaving(true);
    try {
      const result = await retryBidVerification(bidId, id, token);
      toast({ title: statusToast(result.status), variant: result.status === 'error' ? 'error' : 'success' });
      await refresh();
      setViewing(result);
    } catch (caught) {
      toast({ title: getApiErrorMessage(caught, 'Retry failed'), variant: 'error' });
    } finally {
      setSaving(false);
    }
  }

  const columns = useMemo(
    () => [
      { id: 'identifier', header: 'Identifier', accessor: (row: VerificationListItem) => row.identifierValue },
      { id: 'type', header: 'Type', accessor: (row: VerificationListItem) => row.identifierTypeLabel },
      {
        id: 'document',
        header: 'Document',
        accessor: (row: VerificationListItem) => row.documentTypeLabel || row.documentFilename || '—',
      },
      { id: 'source', header: 'Source', accessor: (row: VerificationListItem) => row.sourceDisplayName },
      {
        id: 'mode',
        header: 'Mode',
        accessor: () => <DemoSourceBadge />,
      },
      {
        id: 'result',
        header: 'Result',
        accessor: (row: VerificationListItem) => <StatusBadge kind="verification" value={row.status} />,
      },
      {
        id: 'checked',
        header: 'Checked at',
        accessor: (row: VerificationListItem) => formatDateTime(row.completedAt ?? row.requestedAt),
      },
      {
        id: 'action',
        header: 'Action',
        accessor: (row: VerificationListItem) => (
          <Button size="sm" variant="outline" onClick={() => void openDetail(row)}>
            View
          </Button>
        ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <Alert title="Demo source — simulated verification">
        {DEMO_SOURCE_ADVISORY} A matched check is an evidence signal only. It is not compliance, eligibility, or a
        government authentication.
      </Alert>
      {loading ? <LoadingState label="Loading verification…" /> : null}
      {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
      {!loading && !error ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <CountCard label="Total checks" value={summary.total} />
            <CountCard label="Matched" value={summary.matched} />
            <CountCard label="Mismatched" value={summary.mismatched} />
            <CountCard label="Not found" value={summary.notFound} />
            <CountCard label="Errors" value={summary.errors} />
          </div>
          <Card>
            <CardTitle className="mb-4">Verification sources</CardTitle>
            <ul className="grid gap-3 sm:grid-cols-2">
              {sources.map((source) => (
                <li key={source.source} className="rounded-lg border border-edge p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{source.displayName}</p>
                    <DemoSourceBadge />
                    <Badge tone={source.availability === 'available' ? 'success' : 'warning'}>
                      {source.availability === 'available' ? 'Available' : 'Unavailable'}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-foreground-muted">{source.advisory}</p>
                  <p className="mt-1 text-xs text-foreground-muted">
                    {source.supportedIdentifierTypes.length
                      ? `Looks up: ${source.supportedIdentifierTypes.map((item) => item.toUpperCase()).join(', ')}`
                      : 'No identifier lookups configured for this demo source.'}
                  </p>
                </li>
              ))}
            </ul>
          </Card>
          {canWrite ? (
            <Card>
              <CardTitle className="mb-2">Run a verification</CardTitle>
              <p className="mb-4 text-sm text-foreground-muted">
                Manually entered identifier — used only when extraction did not supply a usable value, or when an
                officer chooses to type one. This does not mark the bidder as verified.
              </p>
              <div className="grid gap-3 sm:grid-cols-4">
                <Select
                  label="DEMO source"
                  value={selectedSource}
                  options={sources.map((item) => ({ value: item.source, label: item.displayName }))}
                  onChange={(event) => {
                    const next = event.target.value;
                    setSelectedSource(next);
                    const types = sources.find((item) => item.source === next)?.supportedIdentifierTypes ?? [];
                    if (types[0]) {
                      setIdentifierType(types[0]);
                    }
                  }}
                />
                <Select
                  label="Identifier type"
                  value={identifierType}
                  options={(sources.find((item) => item.source === selectedSource)?.supportedIdentifierTypes ?? ['gstin']).map(
                    (item) => ({ value: item, label: IDENTIFIER_LABELS[item] ?? item.toUpperCase() }),
                  )}
                  onChange={(event) => setIdentifierType(event.target.value)}
                />
                <Input
                  label="Identifier"
                  value={identifier}
                  placeholder={identifierType === 'gstin' ? '24ABCDE1234F1Z5' : 'Enter identifier'}
                  onChange={(event) => setIdentifier(event.target.value)}
                />
                <div className="flex items-end">
                  <Button loading={saving} onClick={() => void onRun()}>
                    Run verification
                  </Button>
                </div>
              </div>
            </Card>
          ) : (
            <Alert>Reviewers can inspect verification results. Initiating or retrying a check requires write access.</Alert>
          )}
          <DataTable
            caption="Verification checks"
            columns={columns}
            rows={items}
            rowId={(row) => row.id}
            emptyTitle="No verification checks yet."
            emptyDescription="Verification is an explicit action. Extracted identifiers are not checked automatically, and a match is not a compliance result."
          />
        </>
      ) : null}
      <VerificationDetailModal
        open={Boolean(viewing)}
        detail={viewing}
        canWrite={canWrite}
        saving={saving}
        onClose={() => setViewing(undefined)}
        onRetry={(id) => void onRetry(id)}
      />
    </div>
  );
}

function VerificationDetailModal({
  open,
  detail,
  canWrite,
  saving,
  onClose,
  onRetry,
}: {
  open: boolean;
  detail?: VerificationDetail;
  canWrite: boolean;
  saving: boolean;
  onClose: () => void;
  onRetry: (id: string) => void;
}) {
  const fields = Array.isArray(detail?.fieldComparisons)
    ? (detail.fieldComparisons as VerificationFieldComparison[])
    : [];
  const snapshot =
    detail?.sourceSnapshot && typeof detail.sourceSnapshot === 'object'
      ? (detail.sourceSnapshot as VerificationSourceSnapshot)
      : null;
  const history = detail?.history ?? [];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Verification details"
      description={detail ? `${detail.identifierTypeLabel} · ${detail.sourceDisplayName}` : undefined}
      size="lg"
      footer={
        <>
          {canWrite && detail?.status === 'error' ? (
            <Button loading={saving} onClick={() => detail && onRetry(detail.id)}>
              Retry
            </Button>
          ) : null}
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </>
      }
    >
      {detail ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge kind="verification" value={detail.status} />
            <DemoSourceBadge />
          </div>
          <p className="text-sm text-foreground-muted">{detail.advisory || DEMO_SOURCE_ADVISORY}</p>
          <dl className="grid gap-3 sm:grid-cols-2 text-sm">
            <Meta label="Identifier" value={`${detail.identifierTypeLabel}: ${detail.identifierValue}`} />
            <Meta label="Origin" value={ORIGIN_LABELS[detail.identifierOrigin] ?? detail.identifierOrigin} />
            <Meta label="Document" value={detail.documentTypeLabel || detail.documentFilename} />
            <Meta label="Source" value={detail.sourceDisplayName} />
            <Meta label="Mode" value="SIMULATED" />
            <Meta label="Requested" value={formatDateTime(detail.requestedAt)} />
            <Meta label="Retrieved" value={formatDateTime(detail.completedAt ?? snapshot?.retrievedAt)} />
            <Meta label="Requested by" value={detail.requestedByName} />
          </dl>
          {detail.status === 'mismatched' ? (
            <Alert title="Mismatch detected">
              A field differed between the document or bidder information and the demo source. This difference requires
              officer review. It is not a fraud finding.
            </Alert>
          ) : null}
          {detail.status === 'not_found' ? (
            <Alert title="No matching record">
              No matching record found in the selected demo source. This does not by itself prove that the bidder is
              invalid.
            </Alert>
          ) : null}
          {detail.status === 'error' ? (
            <Alert title="Verification could not be completed" variant="error">
              Source: {detail.sourceDisplayName}. {detail.errorMessage || 'The demo source did not return a record.'}
            </Alert>
          ) : null}
          {fields.length ? (
            <div>
              <h3 className="text-sm font-semibold">Field comparison</h3>
              <ul className="mt-2 space-y-2 text-sm">
                {fields.map((field) => (
                  <li key={field.field} className="rounded-lg border border-edge p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium">{field.label}</span>
                      <Badge tone={outcomeTone(field.outcome)}>{outcomeLabel(field.outcome)}</Badge>
                    </div>
                    {field.outcome === 'mismatch' ? (
                      <p className="mt-1 text-foreground-muted">
                        Document: {field.claimedValue || '—'}
                        <br />
                        Source: {field.sourceValue || '—'}
                      </p>
                    ) : (
                      <>
                        {field.sourceValue ? (
                          <p className="mt-1 text-foreground-muted">Source: {field.sourceValue}</p>
                        ) : null}
                        {field.note ? <p className="mt-1 text-foreground-muted">{field.note}</p> : null}
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {snapshot?.recordFound ? (
            <div>
              <h3 className="text-sm font-semibold">Source snapshot</h3>
              <dl className="mt-2 grid gap-3 sm:grid-cols-2 text-sm">
                <Meta label="Legal name" value={snapshot.legalName} />
                <Meta label="Trade name" value={snapshot.tradeName} />
                <Meta label="Status" value={snapshot.status} />
                <Meta label="State" value={snapshot.state} />
                <Meta label="Registration date" value={snapshot.registrationDate} />
                <Meta label="Retrieved" value={formatDateTime(snapshot.retrievedAt)} />
              </dl>
              {snapshot.attributes?.gstReturnStatus ? (
                <Alert title="GST Return Filing">
                  Status: {snapshot.attributes.gstReturnStatus.replace(/_/g, ' ')}
                  {snapshot.attributes.gstReturnPeriod ? ` · Period: ${snapshot.attributes.gstReturnPeriod}` : ''}
                  {' · '}
                  Source: DEMO GST Registry. This is a DEMO GST attribute, not a GSTN filing download.
                </Alert>
              ) : null}
            </div>
          ) : null}
          <div>
            <h3 className="text-sm font-semibold">Timeline</h3>
            <ol className="mt-2 space-y-1 text-sm text-foreground-muted">
              <li>Requested — {formatDateTime(detail.requestedAt)}</li>
              <li>Completed — {formatDateTime(detail.completedAt)}</li>
            </ol>
            <p className="mt-1 text-xs text-foreground-muted">
              Mock lookups complete in the same request. Additional timestamps are not invented.
            </p>
          </div>
          {history.length ? (
            <div>
              <h3 className="text-sm font-semibold">History</h3>
              <ul className="mt-2 space-y-1 text-sm">
                {history.map((item) => (
                  <li key={item.id}>
                    Attempt {item.attemptNumber} · {formatDateTime(item.requestedAt)} ·{' '}
                    {item.status.replace(/_/g, ' ')}
                    {item.isLatest ? ' · latest' : ''}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {detail.explanation ? (
            <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-lg border border-edge bg-surface-muted p-3 text-xs">
              {detail.explanation}
            </pre>
          ) : null}
        </div>
      ) : (
        <EmptyState title="Select a verification to inspect." />
      )}
    </Modal>
  );
}

export function DemoSourceBadge() {
  return <Badge tone="warning">DEMO SOURCE</Badge>;
}

function CountCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <p className="text-xs uppercase tracking-wide text-foreground-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </Card>
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

function statusToast(status: string): string {
  if (status === 'matched') {
    return 'Matched — demo source';
  }
  if (status === 'mismatched') {
    return 'Mismatched — demo source';
  }
  if (status === 'not_found') {
    return 'Not found in demo source';
  }
  return 'Verification could not be completed';
}

function outcomeLabel(outcome: string): string {
  if (outcome === 'match') return 'Match';
  if (outcome === 'mismatch') return 'Mismatch';
  if (outcome === 'potential_match') return 'Potential match';
  if (outcome === 'review_required') return 'Review required';
  return 'Not compared';
}

function outcomeTone(outcome: string): 'success' | 'warning' | 'info' | 'neutral' {
  if (outcome === 'match') return 'success';
  if (outcome === 'mismatch') return 'warning';
  if (outcome === 'potential_match' || outcome === 'review_required') return 'info';
  return 'neutral';
}
