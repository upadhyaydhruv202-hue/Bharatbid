import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { SessionGate } from '../../auth/SessionGate';
import { useAuth } from '../../auth/AuthProvider';
import {
  CROSS_CHECK_STATE_OPTIONS,
  REVIEW_ISSUE_OPTIONS,
  REVIEW_STATUS_OPTIONS,
  VERIFICATION_STATE_OPTIONS,
  formatDateTime,
  StatusBadge,
} from '../../components/bharatbid/StatusBadge';
import { getApiErrorMessage } from '../../services/api';
import {
  DEMO_REVIEW_ADVISORY,
  getOfficerReviewSummary,
  listBidders,
  listOfficerReviews,
  listTenders,
  type BidderListItem,
  type OfficerReviewDashboard,
  type OfficerReviewListItem,
  type TenderListItem,
} from '../../services/bharatbid';
import {
  Alert,
  Breadcrumb,
  Card,
  CardTitle,
  DataTable,
  ErrorState,
  PageContainer,
  Pagination,
  Search,
  Select,
  SimpleBarChart,
} from '../../ui';

const EMPTY_DASHBOARD: OfficerReviewDashboard = {
  statuses: { open: 0, in_review: 0, clarification_requested: 0, assessed: 0, closed: 0 },
  issues: {},
  openClarifications: 0,
  advisory: DEMO_REVIEW_ADVISORY,
};

export function ReviewQueuePage() {
  const { accessToken } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [items, setItems] = useState<OfficerReviewListItem[]>([]);
  const [tenders, setTenders] = useState<TenderListItem[]>([]);
  const [bidders, setBidders] = useState<BidderListItem[]>([]);
  const [dashboard, setDashboard] = useState<OfficerReviewDashboard>(EMPTY_DASHBOARD);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [tenderId, setTenderId] = useState(params.get('tenderId') ?? '');
  const [bidId] = useState(params.get('bidId') ?? '');
  const [bidderId, setBidderId] = useState(params.get('bidderId') ?? '');
  const [status, setStatus] = useState('');
  const [issueType, setIssueType] = useState('');
  const [mandatory, setMandatory] = useState('');
  const [verificationState, setVerificationState] = useState('');
  const [crossCheckState, setCrossCheckState] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  async function load(token: string, nextPage = page) {
    setLoading(true);
    setError(undefined);
    try {
      const [result, summary] = await Promise.all([
        listOfficerReviews(token, {
          page: nextPage,
          pageSize,
          q: search,
          tenderId: tenderId || undefined,
          bidId: bidId || undefined,
          bidderId: bidderId || undefined,
          status: status || undefined,
          issueType: issueType || undefined,
          mandatory: mandatory || undefined,
          verificationState: verificationState || undefined,
          crossCheckState: crossCheckState || undefined,
        }),
        getOfficerReviewSummary(token),
      ]);
      setItems(result.items);
      setTotal(result.meta.totalItems);
      setPage(result.meta.page);
      setDashboard(summary);
    } catch (caught) {
      setError(getApiErrorMessage(caught, 'Review information could not be loaded. Please try again.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!accessToken) return;
    void Promise.all([listTenders(accessToken, { pageSize: 100 }), listBidders(accessToken, { pageSize: 100 })])
      .then(([tenderResult, bidderResult]) => {
        setTenders(tenderResult.items);
        setBidders(bidderResult.items);
      })
      .catch(() => undefined);
  }, [accessToken]);

  useEffect(() => {
    if (accessToken) {
      void load(accessToken, 1);
    }
  }, [accessToken, pageSize, tenderId, bidId, bidderId, status, issueType, mandatory, verificationState, crossCheckState]);

  const issueChart = REVIEW_ISSUE_OPTIONS.map((option) => ({
    label: option.label,
    value: dashboard.issues[option.value] ?? 0,
  }));

  return (
    <PageContainer
      width="wide"
      breadcrumb={<Breadcrumb items={[{ label: 'Command Center', to: '/bharatbid' }, { label: 'Officer review' }]} />}
      title="Officer review"
      description="Inspect evidence, verification, and cross-checks, then record an assessment. This workspace does not award or reject bids."
    >
      <SessionGate title="Sign in to view officer reviews">
        <Alert title="Decision support only">{DEMO_REVIEW_ADVISORY}</Alert>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <CountCard label="Open reviews" value={dashboard.statuses.open ?? 0} />
          <CountCard label="In review" value={dashboard.statuses.in_review ?? 0} />
          <CountCard label="Clarifications" value={dashboard.statuses.clarification_requested ?? 0} />
          <CountCard label="Awaiting response" value={dashboard.openClarifications} />
          <CountCard label="Assessed" value={dashboard.statuses.assessed ?? 0} />
        </div>
        <Card className="mt-4">
          <CardTitle className="mb-2">Issue distribution</CardTitle>
          <p className="mb-3 text-sm text-foreground-muted">Operational counts, not risk scores.</p>
          <SimpleBarChart data={issueChart} title="Review issue distribution" />
        </Card>
        <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_12rem_12rem_12rem]">
          <Search
            value={search}
            onChange={setSearch}
            onSubmitSearch={() => accessToken && void load(accessToken, 1)}
            placeholder="Search bid, tender, or bidder"
            loading={loading}
          />
          <Select label="Review status" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">All statuses</option>
            {REVIEW_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <Select label="Issue type" value={issueType} onChange={(event) => setIssueType(event.target.value)}>
            <option value="">All issue types</option>
            {REVIEW_ISSUE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <Select label="Mandatory" value={mandatory} onChange={(event) => setMandatory(event.target.value)}>
            <option value="">All requirements</option>
            <option value="true">Mandatory</option>
            <option value="false">Optional</option>
          </Select>
        </div>
        <div className="mt-3 grid gap-3 lg:grid-cols-4">
          <Select label="Tender" value={tenderId} onChange={(event) => setTenderId(event.target.value)}>
            <option value="">All tenders</option>
            {tenders.map((tender) => (
              <option key={tender.id} value={tender.id}>
                {tender.referenceNumber}
              </option>
            ))}
          </Select>
          <Select label="Bidder" value={bidderId} onChange={(event) => setBidderId(event.target.value)}>
            <option value="">All bidders</option>
            {bidders.map((bidder) => (
              <option key={bidder.id} value={bidder.id}>
                {bidder.legalName}
              </option>
            ))}
          </Select>
          <Select
            label="Verification state"
            value={verificationState}
            onChange={(event) => setVerificationState(event.target.value)}
          >
            <option value="">Any verification</option>
            {VERIFICATION_STATE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <Select
            label="Cross-check state"
            value={crossCheckState}
            onChange={(event) => setCrossCheckState(event.target.value)}
          >
            <option value="">Any cross-check</option>
            {CROSS_CHECK_STATE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
        {error ? (
          <div className="mt-4">
            <ErrorState message={error} onRetry={() => accessToken && void load(accessToken)} />
          </div>
        ) : (
          <div className="mt-4">
            <DataTable
              caption="Review queue"
              columns={[
                {
                  id: 'bid',
                  header: 'Bid',
                  accessor: (row) => (
                    <Link className="underline" to={`/bharatbid/bids/${row.bidSubmissionId}/review`}>
                      {row.bidReference}
                    </Link>
                  ),
                },
                {
                  id: 'tender',
                  header: 'Tender',
                  accessor: (row) => (
                    <Link className="underline" to={`/bharatbid/tenders/${row.tenderId}`}>
                      {row.tenderReference}
                    </Link>
                  ),
                },
                {
                  id: 'bidder',
                  header: 'Bidder',
                  accessor: (row) => (
                    <Link className="underline" to={`/bharatbid/bidders/${row.bidderId}`}>
                      {row.bidderLegalName}
                    </Link>
                  ),
                },
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
                  id: 'coverage',
                  header: 'Mandatory',
                  accessor: (row) => (row.mandatory ? 'Mandatory' : 'Optional'),
                },
                {
                  id: 'updated',
                  header: 'Last activity',
                  accessor: (row) => formatDateTime(row.updatedAt),
                },
              ]}
              rows={items}
              rowId={(row) => row.id}
              loading={loading}
              emptyTitle="No review items require attention."
              emptyDescription="When machine findings need a human, they appear here. This is not a procurement award queue."
              onRowClick={(row) => navigate(`/bharatbid/review/${row.id}`)}
            />
            <Pagination
              className="mt-4"
              page={page}
              pageSize={pageSize}
              total={total}
              onPageChange={(next) => accessToken && void load(accessToken, next)}
              onPageSizeChange={setPageSize}
            />
          </div>
        )}
      </SessionGate>
    </PageContainer>
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
