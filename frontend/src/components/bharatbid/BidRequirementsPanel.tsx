import { useEffect, useState } from 'react';

import { Link } from 'react-router-dom';

import { StatusBadge } from './StatusBadge';
import { DemoSourceBadge } from './BidVerificationPanel';
import { getApiErrorMessage } from '../../services/api';
import {
  getBidRequirementIntelligence,
  type RequirementIntelligenceItem,
  type RequirementIntelligenceResult,
  type ReviewItem,
} from '../../services/bharatbid';
import {
  Alert,
  Button,
  Card,
  CardTitle,
  DataTable,
  EmptyState,
  ErrorState,
  LoadingState,
  Modal,
} from '../../ui';

export function BidRequirementsPanel({
  bidId,
  token,
  focusRequirementId,
  onOpenDocuments,
  onOpenVerification,
  onOpenCrossCheck,
}: {
  bidId: string;
  token: string;
  focusRequirementId?: string;
  onOpenDocuments?: () => void;
  onOpenVerification?: () => void;
  onOpenCrossCheck?: (id: string) => void;
}) {
  const [result, setResult] = useState<RequirementIntelligenceResult>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [viewing, setViewing] = useState<RequirementIntelligenceItem>();

  async function load() {
    setLoading(true);
    setError(undefined);
    try {
      const next = await getBidRequirementIntelligence(bidId, token);
      setResult(next);
    } catch (caught) {
      setError(getApiErrorMessage(caught, 'Unable to load requirement intelligence.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [bidId, token]);

  useEffect(() => {
    if (!focusRequirementId || !result) {
      return;
    }
    const match = result.items.find((item) => item.requirementId === focusRequirementId);
    if (match) {
      setViewing(match);
    }
  }, [focusRequirementId, result]);

  const summary = result?.summary;
  const items = result?.items ?? [];
  const reviewItems = result?.reviewItems ?? [];

  const columns = [
    {
      id: 'name',
      header: 'Requirement',
      accessor: (row: RequirementIntelligenceItem) => row.name,
    },
    {
      id: 'mandatory',
      header: 'Mandatory',
      accessor: (row: RequirementIntelligenceItem) => (row.mandatory ? 'Yes' : 'No'),
    },
    {
      id: 'evidence',
      header: 'Evidence',
      accessor: (row: RequirementIntelligenceItem) => <StatusBadge kind="evidence" value={row.evidenceStatus} />,
    },
    {
      id: 'verification',
      header: 'Verification',
      accessor: (row: RequirementIntelligenceItem) =>
        row.verification ? <StatusBadge kind="verification" value={row.verification.status} /> : '—',
    },
    {
      id: 'cross',
      header: 'Cross-check',
      accessor: (row: RequirementIntelligenceItem) =>
        row.crossCheck ? <StatusBadge kind="cross" value={row.crossCheck.status} /> : '—',
    },
    {
      id: 'status',
      header: 'Status',
      accessor: (row: RequirementIntelligenceItem) => <StatusBadge kind="evaluation" value={row.evaluation} />,
    },
    {
      id: 'explanation',
      header: 'Explanation',
      accessor: (row: RequirementIntelligenceItem) => (
        <span className="line-clamp-2 text-sm text-foreground-muted">{row.explanation}</span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {loading ? <LoadingState label="Loading requirement intelligence…" /> : null}
      {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
      {!loading && !error && result ? (
        <>
          <Alert title="Evidence mapping, not a compliance score">
            Statuses describe whether evidence is available and whether a machine-evaluable rule can be applied.
            Evidence missing is not a Fail. Pass is not a procurement decision. Coverage is labelled Evidence Coverage,
            not compliance.
          </Alert>
          <div className="grid gap-4 sm:grid-cols-4">
            <CountCard label="Requirements" value={summary?.total ?? 0} />
            <CountCard label="Evidence available" value={summary?.evidenceAvailable ?? 0} />
            <CountCard label="Evidence missing" value={summary?.evidenceMissing ?? 0} />
            <CountCard label="Requires review" value={summary?.reviewRequired ?? 0} />
          </div>
          {summary?.evidenceCoveragePercent !== null && summary?.evidenceCoveragePercent !== undefined ? (
            <Card>
              <CardTitle className="mb-2">Evidence Coverage</CardTitle>
              <p className="text-2xl font-semibold">{summary.evidenceCoveragePercent}%</p>
              <p className="mt-1 text-sm text-foreground-muted">
                Share of mandatory requirements that have relevant evidence available. This is not a compliance score.
              </p>
            </Card>
          ) : null}
          <ReviewQueue
            bidId={bidId}
            items={reviewItems}
            onOpen={(item) => {
              if (item.crossVerificationId && onOpenCrossCheck) {
                onOpenCrossCheck(item.crossVerificationId);
                return;
              }
              const match = items.find((row) => row.requirementId === item.requirementId);
              if (match) {
                setViewing(match);
              }
            }}
          />
          <DataTable
            caption="Requirement matrix"
            columns={columns}
            rows={items}
            rowId={(row) => row.requirementId}
            onRowClick={setViewing}
            emptyTitle="No active tender requirements."
            emptyDescription="Requirements come from the linked tender. This bid does not invent its own checklist."
          />
        </>
      ) : null}
      <RequirementDetailModal
        open={Boolean(viewing)}
        detail={viewing}
        onClose={() => setViewing(undefined)}
        onOpenDocuments={onOpenDocuments}
        onOpenVerification={onOpenVerification}
        onOpenCrossCheck={onOpenCrossCheck}
      />
    </div>
  );
}

function ReviewQueue({
  bidId,
  items,
  onOpen,
}: {
  bidId: string;
  items: ReviewItem[];
  onOpen: (item: ReviewItem) => void;
}) {
  return (
    <Card>
      <CardTitle className="mb-2">Requires review</CardTitle>
      {items.length === 0 ? (
        <p className="text-sm text-foreground-muted">No review items for this bid right now.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((item, index) => (
            <li key={item.id} className="rounded-lg border border-edge p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium">
                    {index + 1}. {item.title}
                  </p>
                  <p className="mt-1 text-sm text-foreground-muted">
                    Why am I seeing this? {item.reason}
                  </p>
                </div>
                <Button variant="outline" onClick={() => onOpen(item)}>
                  View evidence
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-xs text-foreground-muted">
        This queue identifies what needs attention. It does not approve, reject, or resolve items.{' '}
        <Link className="underline" to={`/bharatbid/review?bidId=${bidId}`}>
          Open officer review workspace
        </Link>
      </p>
    </Card>
  );
}

function RequirementDetailModal({
  open,
  detail,
  onClose,
  onOpenDocuments,
  onOpenVerification,
  onOpenCrossCheck,
}: {
  open: boolean;
  detail?: RequirementIntelligenceItem;
  onClose: () => void;
  onOpenDocuments?: () => void;
  onOpenVerification?: () => void;
  onOpenCrossCheck?: (id: string) => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Requirement evidence"
      description={detail?.name}
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
            <StatusBadge kind="evaluation" value={detail.evaluation} />
            <StatusBadge kind="evidence" value={detail.evidenceStatus} />
            {detail.evaluation === 'review_required' ? (
              <span className="text-sm font-medium">Officer review required</span>
            ) : null}
          </div>
          <dl className="grid gap-3 sm:grid-cols-2 text-sm">
            <Meta label="Requirement" value={detail.name} />
            <Meta label="Mandatory" value={detail.mandatory ? 'Yes' : 'No'} />
            <Meta
              label="Evidence"
              value={
                detail.documents.length
                  ? detail.documents.map((doc) => doc.originalFilename).join(', ')
                  : 'None associated'
              }
            />
            <Meta
              label="Verification"
              value={detail.verification ? `${detail.verification.source.toUpperCase()} · ${detail.verification.status}` : 'Not applicable'}
            />
            <Meta
              label="Cross-check"
              value={detail.crossCheck ? `${detail.crossCheck.comparisonType.replace(/_/g, ' ↔ ')} · ${detail.crossCheck.status}` : '—'}
            />
            <Meta label="Evaluation" value={detail.evaluation.replace(/_/g, ' ')} />
          </dl>
          <p className="text-sm">{detail.explanation}</p>
          <div className="flex flex-wrap gap-2">
            {detail.documents.length && onOpenDocuments ? (
              <Button variant="outline" onClick={onOpenDocuments}>
                Open documents
              </Button>
            ) : null}
            {detail.verification && onOpenVerification ? (
              <Button variant="outline" onClick={onOpenVerification}>
                Open verification
              </Button>
            ) : null}
            {detail.crossCheck && onOpenCrossCheck ? (
              <Button variant="outline" onClick={() => onOpenCrossCheck(detail.crossCheck!.id)}>
                Open cross-check
              </Button>
            ) : null}
          </div>
          <DemoSourceBadge />
        </div>
      ) : (
        <EmptyState title="Select a requirement to inspect." />
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
