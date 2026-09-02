import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { formatDateTime, StatusBadge } from './StatusBadge';
import { getApiErrorMessage } from '../../services/api';
import {
  DEMO_REVIEW_ADVISORY,
  listBidOfficerReviews,
  type BidReviewSummary,
  type OfficerReviewListItem,
} from '../../services/bharatbid';
import { Alert, Button, Card, CardTitle, DataTable, ErrorState, LoadingState } from '../../ui';

const EMPTY_SUMMARY: BidReviewSummary = {
  total: 0,
  open: 0,
  inReview: 0,
  clarificationRequested: 0,
  assessed: 0,
  closed: 0,
  finalProcurementDecisions: 0,
};

export function BidReviewPanel({
  bidId,
  token,
  intelligence,
}: {
  bidId: string;
  token: string;
  intelligence?: {
    total: number;
    evidenceAvailable: number;
    evidenceMissing: number;
    reviewRequired: number;
  };
}) {
  const navigate = useNavigate();
  const [items, setItems] = useState<OfficerReviewListItem[]>([]);
  const [summary, setSummary] = useState<BidReviewSummary>(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  async function load() {
    setLoading(true);
    setError(undefined);
    try {
      const result = await listBidOfficerReviews(bidId, token);
      setItems(result.items);
      setSummary(result.summary);
    } catch (caught) {
      setError(getApiErrorMessage(caught, 'Review information could not be loaded. Please try again.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [bidId, token]);

  return (
    <div className="space-y-4">
      {loading ? <LoadingState label="Loading review items…" /> : null}
      {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
      {!loading && !error ? (
        <>
          <Alert title="Decision support only">{DEMO_REVIEW_ADVISORY}</Alert>
          <Card>
            <CardTitle className="mb-2">Review Summary</CardTitle>
            <p className="text-sm text-foreground-muted">
              {intelligence?.total ?? 0} requirements · {intelligence?.evidenceAvailable ?? 0} evidence supported ·{' '}
              {intelligence?.reviewRequired ?? 0} require officer review · {intelligence?.evidenceMissing ?? 0} evidence
              missing
            </p>
            <p className="mt-2 text-sm">
              {summary.open} open review items · {summary.clarificationRequested} clarification requested ·{' '}
              {summary.assessed} assessed · {summary.finalProcurementDecisions} final procurement decisions
            </p>
          </Card>
          <div className="grid gap-4 sm:grid-cols-4">
            <CountCard label="Open" value={summary.open} />
            <CountCard label="In review" value={summary.inReview} />
            <CountCard label="Clarifications" value={summary.clarificationRequested} />
            <CountCard label="Assessed" value={summary.assessed} />
          </div>
          <DataTable
            caption="Officer review items"
            columns={[
              { id: 'title', header: 'Issue', accessor: (row) => row.title },
              {
                id: 'issueType',
                header: 'Type',
                accessor: (row) => <StatusBadge kind="issue" value={row.issueType} />,
              },
              {
                id: 'status',
                header: 'Status',
                accessor: (row) => <StatusBadge kind="review" value={row.status} />,
              },
              {
                id: 'machine',
                header: 'Machine finding',
                accessor: (row) => row.machineFinding.replace(/_/g, ' '),
              },
              {
                id: 'assessment',
                header: 'Officer assessment',
                accessor: (row) =>
                  row.latestAssessment ? (
                    <StatusBadge kind="assessment" value={row.latestAssessment.assessment} />
                  ) : (
                    '—'
                  ),
              },
              {
                id: 'updated',
                header: 'Last activity',
                accessor: (row) => formatDateTime(row.updatedAt),
              },
              {
                id: 'open',
                header: '',
                accessor: (row) => (
                  <Button variant="outline" onClick={() => navigate(`/bharatbid/review/${row.id}`)}>
                    Open
                  </Button>
                ),
              },
            ]}
            rows={items}
            rowId={(row) => row.id}
            onRowClick={(row) => navigate(`/bharatbid/review/${row.id}`)}
            emptyTitle="No review items require attention for this bid."
            emptyDescription="Machine findings remain available on the Requirements and Cross-Checks tabs."
          />
          <p className="text-sm">
            <Link className="underline" to={`/bharatbid/review?bidId=${bidId}`}>
              Open full review workspace
            </Link>
          </p>
        </>
      ) : null}
    </div>
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
