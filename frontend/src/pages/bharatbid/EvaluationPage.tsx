import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { SessionGate } from '../../auth/SessionGate';
import { useAuth } from '../../auth/AuthProvider';
import {
  formatDate,
  StatusBadge,
  TENDER_CATEGORY_OPTIONS,
  TENDER_STATUS_OPTIONS,
} from '../../components/bharatbid/StatusBadge';
import { getApiErrorMessage } from '../../services/api';
import {
  DEMO_EVALUATION_ADVISORY,
  listEvaluations,
  type EvaluationListItem,
} from '../../services/bharatbid';
import {
  Alert,
  Breadcrumb,
  Card,
  DataTable,
  ErrorState,
  KpiCard,
  PageContainer,
  Pagination,
  Search,
  Select,
} from '../../ui';

export function EvaluationPage() {
  const { accessToken } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<EvaluationListItem[]>([]);
  const [advisory, setAdvisory] = useState(DEMO_EVALUATION_ADVISORY);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  async function load(token: string, nextPage = page) {
    setLoading(true);
    setError(undefined);
    try {
      const result = await listEvaluations(token, {
        q: search,
        status: status || undefined,
        category: category || undefined,
        page: nextPage,
        pageSize,
      });
      setItems(result.items);
      setAdvisory(result.advisory);
      setTotal(result.meta.totalItems);
      setPage(result.meta.page);
    } catch (caught) {
      setError(getApiErrorMessage(caught, 'Unable to load the evaluation workspace.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!accessToken) return;
    void load(accessToken, 1);
  }, [accessToken, search, status, category, pageSize]);

  const totals = items.reduce(
    (acc, item) => ({
      submitted: acc.submitted + item.submittedBids,
      review: acc.review + item.reviewRequired,
      gaps: acc.gaps + item.evidenceGaps,
      verification: acc.verification + item.verificationIssues,
    }),
    { submitted: 0, review: 0, gaps: 0, verification: 0 },
  );

  return (
    <PageContainer width="wide">
      <Breadcrumb items={[{ label: 'Command Center', to: '/bharatbid' }, { label: 'Evaluation' }]} />
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Comparative evaluation</h1>
        <p className="mt-1 max-w-3xl text-sm text-foreground-muted">
          Compare submitted bids against tender requirements and available evidence. The system does not rank bidders or
          award tenders.
        </p>
      </div>
      <SessionGate>
        <Alert title="Decision support" className="mb-6">
          {advisory}
        </Alert>
        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Tenders with submitted bids" value={total} />
          <KpiCard label="Submitted bids (this page)" value={totals.submitted} />
          <KpiCard label="Bids requiring review" value={totals.review} />
          <KpiCard label="Evidence gaps" value={totals.gaps} />
        </div>
        <Card>
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end">
            <Search value={search} onChange={setSearch} placeholder="Search tenders" className="lg:max-w-sm" />
            <Select
              label="Status"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              options={[{ value: '', label: 'All statuses' }, ...TENDER_STATUS_OPTIONS]}
            />
            <Select
              label="Category"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              options={[{ value: '', label: 'All categories' }, ...TENDER_CATEGORY_OPTIONS]}
            />
          </div>
          {error ? (
            <ErrorState
              title="Unable to load evaluations"
              message={error}
              onRetry={() => accessToken && void load(accessToken)}
            />
          ) : (
            <DataTable
              loading={loading}
              emptyTitle="No tenders with submitted bids"
              emptyDescription="Evaluation appears only for tenders that already have submitted, under-review, or finalized bids."
              rows={items}
              rowId={(row) => row.tenderId}
              onRowClick={(row) => navigate(`/bharatbid/evaluation/${row.tenderId}`)}
              columns={[
                {
                  id: 'tender',
                  header: 'Tender',
                  accessor: (row) => (
                    <div>
                      <p className="font-medium text-foreground">{row.title}</p>
                      <p className="text-xs text-foreground-muted">{row.referenceNumber}</p>
                    </div>
                  ),
                },
                { id: 'submitted', header: 'Submitted bids', accessor: (row) => row.submittedBids },
                { id: 'under', header: 'Under evaluation', accessor: (row) => row.underEvaluation },
                { id: 'review', header: 'Review required', accessor: (row) => row.reviewRequired },
                { id: 'gaps', header: 'Evidence gaps', accessor: (row) => row.evidenceGaps },
                { id: 'verification', header: 'Verification issues', accessor: (row) => row.verificationIssues },
                {
                  id: 'status',
                  header: 'Evaluation',
                  accessor: (row) => <StatusBadge kind="tenderEvaluation" value={row.evaluationStatus} />,
                },
                {
                  id: 'activity',
                  header: 'Last evaluation activity',
                  accessor: (row) => formatDate(row.lastEvaluationActivity),
                },
              ]}
            />
          )}
          <Pagination
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={(next) => accessToken && void load(accessToken, next)}
            onPageSizeChange={setPageSize}
          />
        </Card>
      </SessionGate>
    </PageContainer>
  );
}
