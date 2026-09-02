import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { SessionGate } from '../../auth/SessionGate';
import { useAuth } from '../../auth/AuthProvider';
import {
  ATTENTION_BAND_OPTIONS,
  REVIEW_STATUS_OPTIONS,
  TENDER_CATEGORY_OPTIONS,
  VERIFICATION_STATE_OPTIONS,
  formatDate,
  StatusBadge,
} from '../../components/bharatbid/StatusBadge';
import { getApiErrorMessage } from '../../services/api';
import {
  DEMO_ATTENTION_ADVISORY,
  getAttentionSummary,
  listAttentionBids,
  listTenders,
  type AttentionDashboard,
  type AttentionListItem,
  type TenderListItem,
} from '../../services/bharatbid';
import {
  Alert,
  Breadcrumb,
  Card,
  CardTitle,
  DataTable,
  ErrorState,
  KpiCard,
  PageContainer,
  Pagination,
  Search,
  Select,
  SimpleBarChart,
} from '../../ui';

const EMPTY_DASHBOARD: AttentionDashboard = {
  totalBids: 0,
  lowAttention: 0,
  moderateAttention: 0,
  elevatedAttention: 0,
  highAttention: 0,
  criticalAttention: 0,
  requiringAttention: 0,
  openReviews: 0,
  pendingClarifications: 0,
  modelVersion: 'attention-v1',
  advisory: DEMO_ATTENTION_ADVISORY,
  demoLabel: 'DEMO / SYNTHETIC',
};

export function IntelligencePage() {
  const { accessToken } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<AttentionListItem[]>([]);
  const [tenders, setTenders] = useState<TenderListItem[]>([]);
  const [dashboard, setDashboard] = useState<AttentionDashboard>(EMPTY_DASHBOARD);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [tenderId, setTenderId] = useState('');
  const [category, setCategory] = useState('');
  const [band, setBand] = useState('');
  const [reviewStatus, setReviewStatus] = useState('');
  const [verificationState, setVerificationState] = useState('');
  const [clarificationState, setClarificationState] = useState('');
  const [sortBy, setSortBy] = useState('score');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  async function load(token: string, nextPage = page) {
    setLoading(true);
    setError(undefined);
    try {
      const filters = {
        q: search,
        tenderId: tenderId || undefined,
        category: category || undefined,
        reviewStatus: reviewStatus || undefined,
        verificationState: verificationState || undefined,
        clarificationState: clarificationState || undefined,
      };
      const [result, summary] = await Promise.all([
        listAttentionBids(token, {
          page: nextPage,
          pageSize,
          ...filters,
          band: band || undefined,
          sortBy,
          sortOrder: 'desc',
        }),
        getAttentionSummary(token, filters),
      ]);
      setItems(result.items);
      setTotal(result.meta.totalItems);
      setDashboard(summary);
    } catch (caught) {
      setError(getApiErrorMessage(caught, 'Attention intelligence could not be loaded. Please try again.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (accessToken) {
      void load(accessToken, 1);
      setPage(1);
    }
  }, [accessToken, search, tenderId, category, band, reviewStatus, verificationState, clarificationState, sortBy, pageSize]);

  useEffect(() => {
    if (!accessToken) return;
    void (async () => {
      try {
        const result = await listTenders(accessToken, { pageSize: 100 });
        setTenders(result.items);
      } catch {
        setTenders([]);
      }
    })();
  }, [accessToken]);

  const chartData = [
    { label: 'Low', value: dashboard.lowAttention },
    { label: 'Moderate', value: dashboard.moderateAttention },
    { label: 'Elevated', value: dashboard.elevatedAttention },
    { label: 'High', value: dashboard.highAttention },
    { label: 'Critical', value: dashboard.criticalAttention },
  ];

  return (
    <PageContainer
      width="wide"
      breadcrumb={
        <Breadcrumb items={[{ label: 'Command Center', to: '/bharatbid' }, { label: 'Officer Review Priority' }]} />
      }
      title="Officer Review Priority"
      description="Prioritize which bids need human review first, and why. This is not a fraud, eligibility, winner, or award score."
    >
      <SessionGate title="Sign in to view attention intelligence">
        <Alert title="Decision-support only">{dashboard.advisory}</Alert>
        <p className="mt-2 text-xs uppercase tracking-wide text-foreground-muted">{dashboard.demoLabel}</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          <KpiCard label="Bids requiring attention" value={dashboard.requiringAttention} hint="Score above low band" />
          <KpiCard
            label="High attention"
            value={dashboard.highAttention + dashboard.criticalAttention}
            hint="High and critical bands"
          />
          <KpiCard
            label="Moderate attention"
            value={dashboard.moderateAttention + dashboard.elevatedAttention}
            hint="Moderate and elevated bands"
          />
          <KpiCard label="Low attention" value={dashboard.lowAttention} />
          <Link to="/bharatbid/review" className="rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-info">
            <KpiCard label="Open review items" value={dashboard.openReviews} hint="Open workspace" interactive />
          </Link>
          <Link to="/bharatbid/review" className="rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-info">
            <KpiCard label="Pending clarifications" value={dashboard.pendingClarifications} hint="Open workspace" interactive />
          </Link>
        </div>
        <div className="mt-6 grid gap-4 lg:grid-cols-[2fr,1fr]">
          <Card>
            <CardTitle className="mb-3">Review-priority bands</CardTitle>
            <SimpleBarChart data={chartData} title="Review-priority bands" />
          </Card>
          <Card>
            <CardTitle className="mb-3">How to read this</CardTitle>
            <p className="text-sm text-foreground-muted">
              The officer attention score is a deterministic 0–100 review-priority indicator. A low score means low
              current review priority, not a trusted bidder. Officers cannot edit the score.
            </p>
            <p className="mt-3 text-xs text-foreground-muted">Rules {dashboard.modelVersion}</p>
          </Card>
        </div>
        <div className="mt-6 grid gap-3 lg:grid-cols-4">
          <Search
            aria-label="Search"
            value={search}
            onChange={setSearch}
            placeholder="Bid, bidder, or tender reference"
          />
          <Select label="Attention band" value={band} onChange={(event) => setBand(event.target.value)}>
            <option value="">All bands</option>
            {ATTENTION_BAND_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <Select label="Review status" value={reviewStatus} onChange={(event) => setReviewStatus(event.target.value)}>
            <option value="">Any review status</option>
            {REVIEW_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <Select label="Sort" value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
            <option value="score">Attention score</option>
            <option value="evidence_coverage">Evidence Coverage</option>
            <option value="open_reviews">Open issues</option>
            <option value="last_activity">Last review</option>
            <option value="closing_date">Closing date</option>
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
          <Select label="Category" value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="">All categories</option>
            {TENDER_CATEGORY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
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
            label="Clarification state"
            value={clarificationState}
            onChange={(event) => setClarificationState(event.target.value)}
          >
            <option value="">Any clarification</option>
            <option value="requested">Requested</option>
            <option value="responded">Responded</option>
            <option value="none">None pending</option>
          </Select>
        </div>
        {error ? <ErrorState className="mt-6" message={error} onRetry={() => accessToken && void load(accessToken, page)} /> : null}
        {!error ? (
          <div className="mt-6">
            <DataTable
              loading={loading}
              emptyTitle="No bids match these attention filters."
              emptyDescription="When evidence, verification, cross-check or review signals raise review priority, those bids appear here."
              rowId={(row) => row.id}
              onRowClick={(row) => navigate(`/bharatbid/bids/${row.id}/intelligence`)}
              columns={[
                { id: 'submissionReference', header: 'Bid', accessor: (row) => row.submissionReference },
                { id: 'tenderReference', header: 'Tender', accessor: (row) => row.tenderReference },
                { id: 'bidderLegalName', header: 'Bidder', accessor: (row) => row.bidderLegalName },
                {
                  id: 'score',
                  header: 'Attention score',
                  accessor: (row) => (
                    <span aria-label={`Officer attention score ${row.score} of 100, ${row.bandLabel}`}>
                      {row.score} / 100
                    </span>
                  ),
                },
                {
                  id: 'band',
                  header: 'Band',
                  accessor: (row) => <StatusBadge kind="attention" value={row.band} />,
                },
                { id: 'openIssues', header: 'Open issues', accessor: (row) => String(row.openIssues) },
                {
                  id: 'evidenceCoveragePercent',
                  header: 'Evidence Coverage',
                  accessor: (row) => (row.evidenceCoveragePercent === null ? '—' : `${row.evidenceCoveragePercent}%`),
                },
                {
                  id: 'verificationSummary',
                  header: 'Verification',
                  accessor: (row) =>
                    `${row.verificationSummary.matched} matched · ${row.verificationSummary.mismatched} difference`,
                },
                {
                  id: 'lastReviewAt',
                  header: 'Last review',
                  accessor: (row) => formatDate(row.lastReviewAt),
                },
              ]}
              rows={items}
            />
            <Pagination
              className="mt-4"
              page={page}
              pageSize={pageSize}
              total={total}
              onPageChange={(next) => {
                setPage(next);
                if (accessToken) void load(accessToken, next);
              }}
              onPageSizeChange={setPageSize}
            />
          </div>
        ) : null}
      </SessionGate>
    </PageContainer>
  );
}
