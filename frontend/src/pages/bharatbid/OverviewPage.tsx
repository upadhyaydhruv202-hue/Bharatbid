import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { SessionGate } from '../../auth/SessionGate';
import { useAuth } from '../../auth/AuthProvider';
import { hasPermission } from '../../lib/rbac';
import { formatDateTime, StatusBadge } from '../../components/bharatbid/StatusBadge';
import { getApiErrorMessage } from '../../services/api';
import {
  getCommandCenter,
  listTenders,
  searchProcurement,
  type CommandCenterDashboard,
  type ProcurementSearchHit,
  type TenderListItem,
} from '../../services/bharatbid';
import { listNotifications as listInbox, markNotificationRead as markInboxRead } from '../../services/notifications';
import {
  ActivityFeed,
  Alert,
  Breadcrumb,
  Button,
  Card,
  CardTitle,
  DataTable,
  EmptyState,
  ErrorState,
  KpiCard,
  PageContainer,
  ResponsiveGrid,
  Search,
  Select,
  SimpleBarChart,
} from '../../ui';

const SOURCE_LABELS: Record<string, string> = {
  gst: 'GST',
  mca: 'MCA',
  udyam: 'Udyam',
  pan: 'PAN',
  income_tax: 'Income Tax',
  epfo: 'EPFO',
  esic: 'ESIC',
  gem: 'GeM',
  dpiit: 'DPIIT',
  nsic: 'NSIC',
  debarment: 'Debarment',
  bis: 'BIS',
};

const EMPTY: CommandCenterDashboard = {
  generatedAt: new Date().toISOString(),
  environment: 'development',
  demoMode: true,
  demoLabel: 'DEMO / SYNTHETIC',
  advisory:
    'Operational view of existing tenders, evidence, verification, reviews and evaluations. This is not a ranking, award, or government certification.',
  kpis: {
    activeTenders: 0,
    submittedBids: 0,
    openReviews: 0,
    pendingClarifications: 0,
    evidenceGaps: 0,
    verificationIssues: 0,
    evaluationsInProgress: 0,
  },
  attention: { high: 0, moderate: 0, low: 0, requiringAttention: 0, queue: [], advisory: '' },
  evidence: { available: 0, missing: 0, processing: 0, conflicts: 0, reviewRequired: 0 },
  verification: { matched: 0, mismatched: 0, notFound: 0, error: 0, notRun: 0, bySource: {} },
  reviews: { open: 0, inReview: 0, clarificationRequested: 0, assessed: 0, closed: 0, openClarifications: 0 },
  evaluations: { notStarted: 0, inProgress: 0, readyForDecision: 0, decisionRecorded: 0 },
  recentActivity: [],
  capabilities: { createTender: false, createBid: false, generateReport: false },
};

export function BharatBidOverviewPage() {
  const { accessToken, user } = useAuth();
  const navigate = useNavigate();
  const canWriteTenders = hasPermission(user, 'tenders.write');
  const [data, setData] = useState<CommandCenterDashboard>(EMPTY);
  const [tenders, setTenders] = useState<TenderListItem[]>([]);
  const [tenderId, setTenderId] = useState('');
  const [search, setSearch] = useState('');
  const [hits, setHits] = useState<ProcurementSearchHit[]>([]);
  const [clock, setClock] = useState(() => new Date());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [notices, setNotices] = useState<Array<{ id: string; title: string; body: string; unread: boolean; href?: string }>>([]);

  async function load(token: string) {
    setLoading(true);
    setError(undefined);
    try {
      const [dashboard, tenderList, inbox] = await Promise.all([
        getCommandCenter(token, tenderId ? { tenderId } : {}),
        listTenders(token, { page: 1, pageSize: 50 }),
        listInbox(token).catch(() => ({ items: [] })),
      ]);
      setData(dashboard);
      setTenders(tenderList.items);
      setNotices(
        inbox.items.slice(0, 5).map((item) => ({
          id: item.id,
          title: item.title,
          body: item.body,
          unread: !item.readAt,
          href: typeof item.metadata?.href === 'string' ? item.metadata.href : undefined,
        })),
      );
    } catch (caught) {
      setError(getApiErrorMessage(caught, 'Unable to load the command center.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (accessToken) {
      void load(accessToken);
    }
  }, [accessToken, tenderId]);

  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const kpis = useMemo(
    () => [
      { label: 'Active tenders', value: data.kpis.activeTenders, hint: 'Open and under evaluation', to: '/bharatbid/tenders' },
      { label: 'Submitted bids', value: data.kpis.submittedBids, hint: 'Submitted, under review, finalized', to: '/bharatbid/bids' },
      { label: 'Open reviews', value: data.kpis.openReviews, hint: 'Open and in review', to: '/bharatbid/review' },
      { label: 'Pending clarifications', value: data.kpis.pendingClarifications, hint: 'In-app clarification requests', to: '/bharatbid/review' },
      { label: 'Evidence gaps', value: data.kpis.evidenceGaps, hint: 'Missing evidence mappings', to: '/bharatbid/intelligence' },
      { label: 'Verification issues', value: data.kpis.verificationIssues, hint: 'Mismatched, not found, or error', to: '/bharatbid/intelligence' },
      { label: 'Evaluations in progress', value: data.kpis.evaluationsInProgress, hint: 'In progress or ready for decision', to: '/bharatbid/evaluation' },
    ],
    [data.kpis],
  );

  return (
    <PageContainer
      width="wide"
      breadcrumb={<Breadcrumb items={[{ label: 'Command Center' }]} />}
      title="Command Center"
      description="Evidence, DEMO SOURCE verification, officer review, and comparative evaluation — in one operational workspace."
      actions={
        <div className="flex flex-wrap gap-2">
          {canWriteTenders ? (
            <Button onClick={() => navigate('/bharatbid/tenders/new')}>Create tender</Button>
          ) : null}
          <Button variant="outline" disabled={loading || !accessToken} onClick={() => accessToken && void load(accessToken)}>
            Refresh
          </Button>
        </div>
      }
    >
      <SessionGate title="Sign in to open BharatBid" hint="Procurement officer, reviewer, manager, and admin roles can view this workspace.">
        <section className="mb-6 rounded-lg border border-edge bg-surface-elevated p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-warning">{data.demoLabel}</p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight text-foreground">BharatBid</h2>
              <p className="mt-1 text-sm font-medium text-foreground">Procurement Intelligence Command Center</p>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-foreground-muted">
                Monitor tender evaluations, bidder compliance, verification status and risk across procurement workflows.
                Government procurement officers inspect large volumes of bidder evidence. BharatBid organizes tenders
                and documents, runs labeled DEMO SOURCE checks, highlights evidence gaps, and supports transparent officer
                review. It does not award, reject, or rank bidders.
              </p>
            </div>
            <div className="text-right text-xs text-foreground-muted">
              <p>{formatDateTime(clock.toISOString())}</p>
              <p className="mt-1 uppercase tracking-wide">{data.environment}</p>
              {data.demoMode ? <p className="mt-1 font-semibold text-warning">{data.demoLabel}</p> : null}
            </div>
          </div>
          <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_16rem]">
            <Search
              value={search}
              onChange={setSearch}
              placeholder="Search tender, bid, or bidder name"
              aria-label="Global procurement search"
              onSubmitSearch={(value) => {
                if (!accessToken || value.trim().length < 2) {
                  setHits([]);
                  return;
                }
                void searchProcurement(accessToken, value.trim())
                  .then((result) => setHits(result.items))
                  .catch(() => setHits([]));
              }}
            />
            <Select
              label="Tender filter"
              value={tenderId}
              onChange={(event) => setTenderId(event.target.value)}
              options={[
                { value: '', label: 'All tenders' },
                ...tenders.map((tender) => ({ value: tender.id, label: tender.referenceNumber })),
              ]}
            />
          </div>
          {hits.length > 0 ? (
            <ul className="mt-3 divide-y divide-edge rounded-xl border border-edge">
              {hits.map((hit) => (
                <li key={`${hit.type}-${hit.id}`}>
                  <Link className="flex items-center justify-between gap-3 px-4 py-2 text-sm hover:bg-surface-muted" to={hit.href}>
                    <span>
                      <span className="font-medium">{hit.label}</span>
                      <span className="ml-2 text-foreground-muted">{hit.sublabel}</span>
                    </span>
                    <span className="text-xs uppercase tracking-wide text-foreground-muted">{hit.type}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        {error ? (
          <ErrorState title="Unable to load command center" message={error} onRetry={() => accessToken && void load(accessToken)} />
        ) : null}

        {!error ? (
          <>
            <ResponsiveGrid columns={4} className="mb-8">
              {kpis.map((kpi) => (
                <Link key={kpi.label} to={kpi.to} className="rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-info" aria-label={`${kpi.label}: ${kpi.value}. Open workspace.`}>
                  <KpiCard label={kpi.label} value={String(kpi.value)} hint={`${kpi.hint} · Open workspace`} loading={loading} interactive />
                </Link>
              ))}
            </ResponsiveGrid>

            <Alert variant="info" title="Decision support" className="mb-6">
              {data.advisory}
            </Alert>

            <div className="mb-6 grid gap-4 lg:grid-cols-2">
              <Card>
                <div className="flex items-start justify-between gap-3">
                  <CardTitle>Officer Review Priority</CardTitle>
                  <Link className="text-sm underline" to="/bharatbid/intelligence">
                    Open attention
                  </Link>
                </div>
                <p className="mt-1 text-xs text-foreground-muted">Workload bands from Officer Review Priority. Not a risk, bidder, or winner ranking.</p>
                {data.attention.high + data.attention.moderate + data.attention.low === 0 ? (
                  <EmptyState title="No bids requiring attention" className="border-0 px-0 py-6" />
                ) : (
                  <div className="mt-4">
                    <SimpleBarChart
                      title="Attention bands"
                      data={[
                        { label: 'High', value: data.attention.high },
                        { label: 'Moderate', value: data.attention.moderate },
                        { label: 'Low', value: data.attention.low },
                      ]}
                    />
                    <p className="mt-2 text-xs text-foreground-muted">{data.attention.requiringAttention} bids currently require officer attention.</p>
                  </div>
                )}
              </Card>
              <Card>
                <div className="flex items-start justify-between gap-3">
                  <CardTitle>Evidence health</CardTitle>
                  <Link className="text-sm underline" to="/bharatbid/intelligence">
                    Open intelligence
                  </Link>
                </div>
                <p className="mt-1 text-xs text-foreground-muted">Evidence Coverage terminology from requirement intelligence. Not a compliance score.</p>
                <HealthList
                  items={[
                    { label: 'Evidence available', value: data.evidence.available, to: '/bharatbid/intelligence' },
                    { label: 'Evidence missing', value: data.evidence.missing, to: '/bharatbid/intelligence' },
                    { label: 'Processing', value: data.evidence.processing, to: '/bharatbid/intelligence' },
                    { label: 'Conflicts', value: data.evidence.conflicts, to: '/bharatbid/intelligence' },
                    { label: 'Review required', value: data.evidence.reviewRequired, to: '/bharatbid/review' },
                  ]}
                  empty="No evidence mappings yet."
                />
              </Card>
            </div>

            {data.intelligence ? (
              <div className="mb-6 grid gap-4 lg:grid-cols-2">
                <Card>
                  <CardTitle>Bid intelligence</CardTitle>
                  <p className="mt-1 text-xs text-foreground-muted">Decision-support only. Not an official government score.</p>
                  <HealthList
                    items={[
                      { label: 'Compliance coverage (avg)', value: data.intelligence.coverageAverage ?? 0, to: '/bharatbid/intelligence' },
                      { label: 'High review risk', value: data.intelligence.reviewRisk.high + data.intelligence.reviewRisk.critical, to: '/bharatbid/intelligence' },
                      { label: 'Pending requirements', value: data.intelligence.pendingRequirements, to: '/bharatbid/intelligence' },
                      { label: 'Open reviews', value: data.kpis.openReviews, to: '/bharatbid/review' },
                      { label: 'Verification issues', value: data.kpis.verificationIssues, to: '/bharatbid/intelligence' },
                    ]}
                    empty="No bid intelligence yet."
                  />
                </Card>
                <Card>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-foreground-muted">AI Recommendation</p>
                  <CardTitle>Officer advisory</CardTitle>
                  <p className="mt-3 text-sm">{data.intelligence.officerAdvisory.text}</p>
                  {data.intelligence.officerAdvisory.bullets.length > 0 ? (
                    <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-foreground-muted">
                      {data.intelligence.officerAdvisory.bullets.slice(0, 4).map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  ) : null}
                  <p className="mt-3 text-xs text-foreground-muted">
                    AI assists. Officers decide. {data.intelligence.officerAdvisory.disclaimer}
                  </p>
                </Card>
              </div>
            ) : null}

            <div className="mb-6 grid gap-4 lg:grid-cols-2">
              <Card>
                <div className="flex items-start justify-between gap-3">
                  <CardTitle>Verification health</CardTitle>
                  <Link className="text-sm underline" to="/bharatbid/intelligence">
                    Open verification
                  </Link>
                </div>
                <p className="mt-1 text-xs text-foreground-muted">Latest adapter results. Sources are DEMO SOURCE / SIMULATED.</p>
                <HealthList
                  items={[
                    { label: 'Matched', value: data.verification.matched, to: '/bharatbid/intelligence' },
                    { label: 'Mismatched', value: data.verification.mismatched, to: '/bharatbid/intelligence' },
                    { label: 'Not found', value: data.verification.notFound, to: '/bharatbid/intelligence' },
                    { label: 'Error', value: data.verification.error, to: '/bharatbid/intelligence' },
                    { label: 'Not run', value: data.verification.notRun, to: '/bharatbid/intelligence' },
                  ]}
                  empty="No verification runs yet."
                />
                {Object.keys(data.verification.bySource).length > 0 ? (
                  <div className="mt-4">
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-foreground-muted">
                      Verification infrastructure
                    </p>
                    <ul className="grid gap-2 sm:grid-cols-2">
                      {Object.entries(data.verification.bySource).map(([source, counts]) => (
                        <li key={source} className="rounded-md border border-edge px-3 py-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium uppercase text-foreground">
                              {SOURCE_LABELS[source] ?? source}
                            </span>
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-warning">
                              {counts.sourceMode || 'DEMO SOURCE'}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-foreground-muted">
                            DEMO SOURCE · matched {counts.matched}, mismatched {counts.mismatched}, not found{' '}
                            {counts.notFound}, error {counts.error}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </Card>
              <Card>
                <CardTitle>Review workload</CardTitle>
                <HealthList
                  items={[
                    { label: 'Open', value: data.reviews.open, to: '/bharatbid/review' },
                    { label: 'In review', value: data.reviews.inReview, to: '/bharatbid/review' },
                    { label: 'Clarification requested', value: data.reviews.clarificationRequested, to: '/bharatbid/review' },
                    { label: 'Assessed', value: data.reviews.assessed, to: '/bharatbid/review' },
                    { label: 'Closed', value: data.reviews.closed, to: '/bharatbid/review' },
                  ]}
                  empty="No review items."
                />
              </Card>
            </div>

            <div className="mb-6 grid gap-4 lg:grid-cols-2">
              <Card>
                <CardTitle>Evaluation workload</CardTitle>
                <HealthList
                  items={[
                    { label: 'Not started', value: data.evaluations.notStarted, to: '/bharatbid/evaluation' },
                    { label: 'In progress', value: data.evaluations.inProgress, to: '/bharatbid/evaluation' },
                    { label: 'Ready for decision', value: data.evaluations.readyForDecision, to: '/bharatbid/evaluation' },
                    { label: 'Decision recorded', value: data.evaluations.decisionRecorded, to: '/bharatbid/evaluation' },
                  ]}
                  empty="No evaluations underway."
                />
              </Card>
              <ActivityFeed
                title="Recent procurement activity"
                items={data.recentActivity.map((item) => ({
                  id: item.id,
                  title: item.title,
                  description: (
                    <span>
                      <span className="font-medium">{item.actorLabel}</span>
                      {item.href ? (
                        <>
                          {' · '}
                          <Link className="underline" to={item.href}>
                            Open record
                          </Link>
                        </>
                      ) : null}
                    </span>
                  ),
                  timestamp: formatDateTime(item.timestamp),
                }))}
                emptyTitle="No procurement activity yet"
              />
            </div>

            <Card className="mb-6">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <CardTitle>Tenders requiring attention</CardTitle>
                  <p className="mt-1 text-xs text-foreground-muted">
                    Open a tender workspace to inspect bidders, requirements, and evaluation.
                  </p>
                </div>
                <Link className="text-sm underline" to="/bharatbid/tenders">
                  Open tenders
                </Link>
              </div>
              <DataTable
                caption="Tenders in this workspace"
                rowId={(row) => row.id}
                rows={tenders}
                onRowClick={(row) => navigate(`/bharatbid/tenders/${row.id}`)}
                emptyTitle="No tenders in this workspace"
                emptyDescription="Create a tender or wait for procurement records to appear."
                columns={[
                  { id: 'referenceNumber', header: 'Tender ID', accessor: 'referenceNumber' },
                  { id: 'title', header: 'Tender Title', accessor: 'title', className: 'min-w-[14rem]' },
                  {
                    id: 'organizationName',
                    header: 'Organization',
                    accessor: (row) => `${row.organizationName}${row.departmentName ? ` · ${row.departmentName}` : ''}`,
                  },
                  { id: 'bidCount', header: 'Bidders', accessor: 'bidCount' },
                  { id: 'requirementCount', header: 'Requirements', accessor: (row) => row.requirementCount ?? 0 },
                  {
                    id: 'status',
                    header: 'Status',
                    accessor: (row) => <StatusBadge kind="tender" value={row.status} />,
                  },
                  { id: 'updatedAt', header: 'Last Updated', accessor: (row) => formatDateTime(row.updatedAt) },
                  {
                    id: 'action',
                    header: 'Action',
                    accessor: (row) => (
                      <Link className="text-sm underline" to={`/bharatbid/tenders/${row.id}`}>
                        View evaluation →
                      </Link>
                    ),
                  },
                ]}
              />
            </Card>

            <Card className="mb-6">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <CardTitle>Attention queue</CardTitle>
                  <p className="mt-1 text-xs text-foreground-muted">Highest Officer Review Priority first. Click a row to open bid intelligence.</p>
                </div>
                <Link className="text-sm underline" to="/bharatbid/intelligence">
                  Open attention workspace
                </Link>
              </div>
              <DataTable
                caption="Bids ordered by Officer Review Priority"
                rowId={(row) => row.id}
                rows={data.attention.queue}
                onRowClick={(row) => navigate(row.href)}
                emptyTitle="No attention items"
                emptyDescription="Submitted bids will appear here when Officer Review Priority can be computed."
                columns={[
                  { id: 'submissionReference', header: 'Bid reference', accessor: 'submissionReference' },
                  { id: 'tenderTitle', header: 'Tender', accessor: (row) => `${row.tenderReference}` },
                  { id: 'bidderLegalName', header: 'Bidder', accessor: 'bidderLegalName' },
                  { id: 'bandLabel', header: 'Review priority', accessor: 'bandLabel' },
                  { id: 'primaryReason', header: 'Primary attention reason', accessor: 'primaryReason' },
                  { id: 'currentState', header: 'Current state', accessor: 'currentState' },
                ]}
              />
            </Card>

            <div className="mb-6 grid gap-4 lg:grid-cols-2">
              <Card>
                <CardTitle>Notifications</CardTitle>
                {notices.length === 0 ? (
                  <EmptyState title="No notifications" className="border-0 px-0 py-6" />
                ) : (
                  <ul className="mt-3 space-y-2">
                    {notices.map((item) => (
                      <li key={item.id} className="rounded-lg border border-edge p-3 text-sm">
                        <p className="font-medium">{item.title}</p>
                        <p className="mt-1 text-foreground-muted">{item.body}</p>
                        <div className="mt-2 flex gap-3">
                          {item.href ? (
                            <Link className="text-xs underline" to={item.href}>
                              Open
                            </Link>
                          ) : null}
                          {item.unread && accessToken ? (
                            <button
                              type="button"
                              className="text-xs underline"
                              onClick={() =>
                                void markInboxRead(item.id, accessToken).then(() => load(accessToken))
                              }
                            >
                              Mark read
                            </button>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                <Link className="mt-3 inline-block text-sm underline" to="/bharatbid/notifications">
                  Open notification center
                </Link>
              </Card>
              <Card>
                <CardTitle>Quick actions</CardTitle>
                <div className="mt-4 flex flex-wrap gap-2">
                  {canWriteTenders ? (
                    <Button onClick={() => navigate('/bharatbid/tenders/new')}>Create tender</Button>
                  ) : null}
                  <Button variant="outline" onClick={() => navigate('/bharatbid/bids')}>
                    View bids
                  </Button>
                  <Button variant="outline" onClick={() => navigate('/bharatbid/review')}>
                    Open reviews
                  </Button>
                  <Button variant="outline" onClick={() => navigate('/bharatbid/evaluation')}>
                    Open evaluation
                  </Button>
                  <Button variant="outline" onClick={() => navigate('/bharatbid/intelligence')}>
                    View intelligence
                  </Button>
                  <Button variant="outline" onClick={() => navigate('/bharatbid/activity')}>
                    Activity timeline
                  </Button>
                </div>
              </Card>
            </div>
          </>
        ) : null}
      </SessionGate>
    </PageContainer>
  );
}

function HealthList({
  items,
  empty,
}: {
  items: Array<{ label: string; value: number; to?: string }>;
  empty: string;
}) {
  if (items.every((item) => item.value === 0)) {
    return <p className="mt-4 text-sm text-foreground-muted">{empty}</p>;
  }
  return (
    <ul className="mt-4 space-y-2">
      {items.map((item) => (
        <li key={item.label} className="flex items-center justify-between text-sm">
          {item.to ? (
            <Link className="underline-offset-2 hover:underline" to={item.to}>
              {item.label}
            </Link>
          ) : (
            <span>{item.label}</span>
          )}
          <span className="font-semibold">{item.value}</span>
        </li>
      ))}
    </ul>
  );
}
