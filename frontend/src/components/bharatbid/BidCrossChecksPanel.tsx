import { useEffect, useMemo, useState } from 'react';

import { formatDateTime, StatusBadge } from './StatusBadge';
import { DemoSourceBadge } from './BidVerificationPanel';
import { getApiErrorMessage } from '../../services/api';
import {
  DEMO_CROSS_ADVISORY,
  createBidCrossVerifications,
  getBidCrossVerification,
  listBidCrossVerifications,
  type CrossFieldComparison,
  type CrossVerificationListItem,
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
  LoadingState,
  Modal,
  useToast,
} from '../../ui';

export function BidCrossChecksPanel({
  bidId,
  token,
  canWrite,
  focusId,
  onChanged,
}: {
  bidId: string;
  token: string;
  canWrite: boolean;
  focusId?: string;
  onChanged?: () => void;
}) {
  const { toast } = useToast();
  const [items, setItems] = useState<CrossVerificationListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [viewing, setViewing] = useState<CrossVerificationListItem>();

  async function load() {
    setLoading(true);
    setError(undefined);
    try {
      setItems(await listBidCrossVerifications(bidId, token, { latestOnly: true }));
    } catch (caught) {
      setError(getApiErrorMessage(caught, 'Unable to load cross-checks.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [bidId, token]);

  useEffect(() => {
    if (!focusId) {
      return;
    }
    void getBidCrossVerification(bidId, focusId, token)
      .then(setViewing)
      .catch((caught) => {
        toast({ title: getApiErrorMessage(caught, 'Unable to open this cross-check'), variant: 'error' });
      });
  }, [focusId, bidId, token]);

  const counts = useMemo(
    () => ({
      total: items.length,
      consistent: items.filter((item) => item.status === 'consistent').length,
      inconsistent: items.filter((item) => item.status === 'inconsistent').length,
      insufficient: items.filter((item) => item.status === 'insufficient_evidence').length,
    }),
    [items],
  );

  async function openDetail(row: CrossVerificationListItem) {
    try {
      setViewing(await getBidCrossVerification(bidId, row.id, token));
    } catch (caught) {
      toast({ title: getApiErrorMessage(caught, 'Unable to open this cross-check'), variant: 'error' });
    }
  }

  async function onRun() {
    setSaving(true);
    try {
      await createBidCrossVerifications(bidId, token, {});
      toast({ title: 'Cross-checks completed against demo sources', variant: 'success' });
      await load();
      onChanged?.();
    } catch (caught) {
      toast({ title: getApiErrorMessage(caught, 'Unable to run cross-checks'), variant: 'error' });
    } finally {
      setSaving(false);
    }
  }

  const columns = [
    {
      id: 'pair',
      header: 'Comparison',
      accessor: (row: CrossVerificationListItem) => row.comparisonLabel,
    },
    {
      id: 'status',
      header: 'Result',
      accessor: (row: CrossVerificationListItem) => <StatusBadge kind="cross" value={row.status} />,
    },
    {
      id: 'mode',
      header: 'Source',
      accessor: (row: CrossVerificationListItem) => (
        <div className="flex flex-wrap items-center gap-2">
          <span>{row.sourceBasis === 'mixed' ? 'Mixed source basis' : 'Simulated'}</span>
          <DemoSourceBadge />
        </div>
      ),
    },
    {
      id: 'when',
      header: 'Checked',
      accessor: (row: CrossVerificationListItem) => formatDateTime(row.requestedAt),
    },
  ];

  return (
    <div className="space-y-4">
      {loading ? <LoadingState label="Loading cross-checks…" /> : null}
      {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
      {!loading && !error ? (
        <>
          <Alert title="Decision support only">
            Cross-checks compare demo source records already obtained for this bid. They do not approve, reject, or
            disqualify a bidder.
          </Alert>
          <div className="grid gap-4 sm:grid-cols-4">
            <CountCard label="Latest checks" value={counts.total} />
            <CountCard label="Consistent" value={counts.consistent} />
            <CountCard label="Difference detected" value={counts.inconsistent} />
            <CountCard label="Insufficient evidence" value={counts.insufficient} />
          </div>
          {canWrite ? (
            <Card>
              <CardTitle className="mb-2">Run comparable pairs</CardTitle>
              <p className="mb-4 text-sm text-foreground-muted">
                Uses the latest GST, MCA, and Udyam checks on this bid. Results are stored; previous attempts remain in
                history.
              </p>
              <Button loading={saving} onClick={() => void onRun()}>
                Run cross-checks
              </Button>
            </Card>
          ) : (
            <Alert>Reviewers can inspect cross-checks. Running a new comparison requires write access.</Alert>
          )}
          <DataTable
            caption="Cross-verification"
            columns={columns}
            rows={items}
            rowId={(row) => row.id}
            onRowClick={(row) => void openDetail(row)}
            emptyTitle="No cross-checks yet."
            emptyDescription="Run GST, MCA, or Udyam verification first, then compare the latest source records."
          />
        </>
      ) : null}
      <CrossCheckDetailModal open={Boolean(viewing)} detail={viewing} onClose={() => setViewing(undefined)} />
    </div>
  );
}

function CrossCheckDetailModal({
  open,
  detail,
  onClose,
}: {
  open: boolean;
  detail?: CrossVerificationListItem;
  onClose: () => void;
}) {
  const fields = detail?.fieldComparisons ?? [];
  const mixed = detail?.sourceBasis === 'mixed';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Cross-check details"
      description={detail?.comparisonLabel}
      size="lg"
      footer={
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      }
    >
      {detail ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge kind="cross" value={detail.status} />
            <DemoSourceBadge />
            {mixed ? <Badge tone="warning">MIXED SOURCE BASIS</Badge> : <Badge tone="warning">SIMULATED SOURCE</Badge>}
          </div>
          <p className="text-sm text-foreground-muted">{detail.advisory || DEMO_CROSS_ADVISORY}</p>
          <dl className="grid gap-3 sm:grid-cols-2 text-sm">
            <Meta label="Source A" value={detail.leftSourceDisplayName} />
            <Meta label="Source B" value={detail.rightSourceDisplayName} />
            <Meta label="Mode" value={mixed ? 'MIXED SOURCE BASIS' : 'SIMULATED'} />
            <Meta label="Attempt" value={`#${detail.attemptNumber}${detail.isLatest ? ' (latest)' : ''}`} />
            <Meta label="Requested" value={formatDateTime(detail.requestedAt)} />
            <Meta label="Requested by" value={detail.requestedByName} />
          </dl>
          {detail.status === 'inconsistent' ? (
            <Alert title="Difference detected">
              A field differed between the two source records. Officer review is recommended. This is not a fraud
              finding.
            </Alert>
          ) : null}
          {detail.status === 'insufficient_evidence' ? (
            <Alert title="Insufficient evidence">
              One or both source records were unavailable. This does not by itself establish bidder invalidity.
            </Alert>
          ) : null}
          {fields.length ? (
            <div>
              <h3 className="text-sm font-semibold">Fields</h3>
              <ul className="mt-2 space-y-2 text-sm">
                {fields.map((field) => (
                  <li key={field.field} className="rounded-lg border border-edge p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium">{field.label}</span>
                      <Badge tone={fieldTone(field.outcome)}>{fieldLabel(field.outcome)}</Badge>
                    </div>
                    <p className="mt-1 text-foreground-muted">
                      {detail.leftSourceDisplayName}: {field.leftValue || '—'}
                      <br />
                      {detail.rightSourceDisplayName}: {field.rightValue || '—'}
                    </p>
                    <p className="mt-1 text-xs text-foreground-muted">{field.note}</p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {detail.history.length ? (
            <div>
              <h3 className="text-sm font-semibold">History</h3>
              <ul className="mt-2 space-y-1 text-sm">
                {detail.history.map((item) => (
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
        <EmptyState title="Select a cross-check to inspect." />
      )}
    </Modal>
  );
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

function fieldLabel(outcome: CrossFieldComparison['outcome']): string {
  if (outcome === 'exact_match') return 'Exact match';
  if (outcome === 'normalized_match') return 'Normalized match';
  if (outcome === 'difference') return 'Difference';
  if (outcome === 'missing_from_left') return 'Missing from first source';
  if (outcome === 'missing_from_right') return 'Missing from second source';
  return 'Not comparable';
}

function fieldTone(outcome: CrossFieldComparison['outcome']): 'success' | 'warning' | 'info' | 'neutral' {
  if (outcome === 'exact_match' || outcome === 'normalized_match') return 'success';
  if (outcome === 'difference') return 'warning';
  return 'neutral';
}
