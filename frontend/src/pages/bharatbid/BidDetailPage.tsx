import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';

import { SessionGate } from '../../auth/SessionGate';
import { useAuth } from '../../auth/AuthProvider';
import { BidDocumentsPanel } from '../../components/bharatbid/BidDocumentsPanel';
import { BidVerificationPanel } from '../../components/bharatbid/BidVerificationPanel';
import { BidCrossChecksPanel } from '../../components/bharatbid/BidCrossChecksPanel';
import { BidReviewPanel } from '../../components/bharatbid/BidReviewPanel';
import { BidRequirementsPanel } from '../../components/bharatbid/BidRequirementsPanel';
import { BidIntelligencePanel, AttentionMeter } from '../../components/bharatbid/BidIntelligencePanel';
import { BidEvaluationPanel } from '../../components/bharatbid/BidEvaluationPanel';
import { ConfirmActionModal } from '../../components/bharatbid/ConfirmActionModal';
import { formatDate, formatDateTime, StatusBadge, PresenceLabel } from '../../components/bharatbid/StatusBadge';
import { hasPermission } from '../../lib/rbac';
import { getApiErrorMessage } from '../../services/api';
import { getBid, getBidEvaluation, getBidIntelligence, listBidActivity, submitBid, type BidAttentionDetail, type BidDetail, type BidEvaluationSummary, type TenderActivityItem } from '../../services/bharatbid';
import {
  ActivityFeed,
  Alert,
  Breadcrumb,
  Button,
  Card,
  CardTitle,
  ErrorState,
  LoadingState,
  PageContainer,
  Tabs,
  useToast,
} from '../../ui';

const EMPTY_DOCUMENT_SUMMARY = {
  total: 0,
  ready: 0,
  processing: 0,
  failed: 0,
  archived: 0,
  unmapped: 0,
};

const EMPTY_VERIFICATION_SUMMARY = {
  total: 0,
  matched: 0,
  mismatched: 0,
  notFound: 0,
  errors: 0,
  processing: 0,
};

const EMPTY_INTELLIGENCE = {
  crossChecks: { total: 0, consistent: 0, inconsistent: 0, insufficient: 0 },
  requirements: {
    total: 0,
    mandatory: 0,
    evidenceAvailable: 0,
    evidenceMissing: 0,
    reviewRequired: 0,
    passCount: 0,
    evidenceCoveragePercent: null as number | null,
  },
};

const EMPTY_REVIEW = {
  total: 0,
  open: 0,
  inReview: 0,
  clarificationRequested: 0,
  assessed: 0,
  closed: 0,
  finalProcurementDecisions: 0,
};

const EMPTY_ATTENTION: BidAttentionDetail = {
  id: '',
  submissionReference: '',
  tenderId: '',
  tenderReference: '',
  tenderTitle: '',
  tenderCategory: null,
  tenderClosingDate: null,
  bidderId: '',
  bidderLegalName: '',
  status: '',
  score: 0,
  band: 'low_attention',
  bandLabel: 'Low attention',
  openIssues: 0,
  pendingClarifications: 0,
  evidenceCoveragePercent: null,
  verificationSummary: { total: 0, matched: 0, mismatched: 0, notFound: 0, errors: 0 },
  lastReviewAt: null,
  modelVersion: 'attention-v1',
  unadjustedScore: 0,
  scoreHint: 'Review-priority indicator based on available evidence, verification, cross-check and review signals.',
  advisory:
    'Decision-support only: This indicator prioritizes bids for human review using available evidence, verification, cross-check and review signals. It does not determine bidder eligibility, fraud, rejection or award.',
  demoLabel: 'DEMO / SYNTHETIC',
  factors: [],
  history: [],
};

function tabFromPath(pathname: string): string {
  if (pathname.endsWith('/documents')) return 'documents';
  if (pathname.endsWith('/verification')) return 'verification';
  if (pathname.endsWith('/cross-checks')) return 'cross-checks';
  if (pathname.endsWith('/requirements')) return 'requirements';
  if (pathname.endsWith('/review')) return 'review';
  if (pathname.endsWith('/intelligence')) return 'intelligence';
  if (pathname.endsWith('/evaluation')) return 'evaluation';
  if (pathname.endsWith('/activity')) return 'activity';
  return 'overview';
}

function pathForTab(bidId: string, tabId: string): string {
  if (tabId === 'overview') {
    return `/bharatbid/bids/${bidId}`;
  }
  return `/bharatbid/bids/${bidId}/${tabId}`;
}

export function BidDetailPage() {
  const { id = '' } = useParams();
  const location = useLocation();
  const { accessToken, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [bid, setBid] = useState<BidDetail>();
  const [attention, setAttention] = useState<BidAttentionDetail>();
  const [evaluation, setEvaluation] = useState<BidEvaluationSummary | null>(null);
  const [activity, setActivity] = useState<TenderActivityItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [tab, setTab] = useState(() => tabFromPath(location.pathname));
  const [focusCrossCheckId, setFocusCrossCheckId] = useState<string>();
  const [error, setError] = useState<string>();
  const canWrite = hasPermission(user, 'bids.write');

  async function load(token: string) {
    setLoading(true);
    setError(undefined);
    try {
      const [detail, events, intelligence] = await Promise.all([
        getBid(id, token),
        listBidActivity(id, token),
        getBidIntelligence(id, token),
      ]);
      setBid(detail);
      setActivity(events);
      setAttention(intelligence);
      try {
        setEvaluation(await getBidEvaluation(id, token));
      } catch {
        setEvaluation(null);
      }
    } catch (caught) {
      setError(getApiErrorMessage(caught, 'Unable to load this bid submission.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setTab(tabFromPath(location.pathname));
  }, [location.pathname]);

  useEffect(() => {
    if (accessToken && id) {
      void load(accessToken);
    }
  }, [accessToken, id]);

  async function onSubmit() {
    if (!accessToken) return;
    setSaving(true);
    try {
      setBid(await submitBid(id, accessToken));
      setActivity(await listBidActivity(id, accessToken));
      toast({ title: 'Bid submitted', variant: 'success' });
      setConfirmSubmit(false);
    } catch (caught) {
      toast({ title: getApiErrorMessage(caught, 'Submit failed'), variant: 'error' });
    } finally {
      setSaving(false);
    }
  }

  const canSubmit = canWrite && bid?.status === 'draft' && Boolean(bid.allowedActions.some((item) => item.action === 'submit'));
  const documents = bid?.documentSummary ?? EMPTY_DOCUMENT_SUMMARY;
  const verifications = bid?.verificationSummary ?? EMPTY_VERIFICATION_SUMMARY;
  const intelligence = bid?.intelligenceSummary ?? EMPTY_INTELLIGENCE;
  const reviewSummary = bid?.reviewSummary ?? EMPTY_REVIEW;

  function goToTab(next: string) {
    navigate(pathForTab(id, next), { replace: true });
  }

  function openCrossCheck(checkId: string) {
    setFocusCrossCheckId(checkId);
    goToTab('cross-checks');
  }

  return (
    <PageContainer
      width="wide"
      breadcrumb={
        <Breadcrumb
          items={[
            { label: 'Command Center', to: '/bharatbid' },
            { label: 'Bids', to: '/bharatbid/bids' },
            { label: bid?.submissionReference ?? 'Bid' },
          ]}
        />
      }
      title={bid?.submissionReference ?? 'Bid submission'}
      description="Inspect evidence, DEMO SOURCE verification, cross-checks, officer review, and Officer Review Priority for this submission."
      actions={
        <div className="flex flex-wrap gap-2">
          {canSubmit ? (
            <Button onClick={() => setConfirmSubmit(true)}>Submit bid</Button>
          ) : null}
          <Button variant="outline" onClick={() => navigate('/bharatbid/bids')}>
            Back to list
          </Button>
        </div>
      }
    >
      <SessionGate title="Sign in to view bid submissions">
        {loading ? <LoadingState label="Loading submission…" /> : null}
        {error ? <ErrorState message={error} onRetry={() => accessToken && void load(accessToken)} /> : null}
        {bid && !loading ? (
          <Tabs
            value={tab}
            onChange={goToTab}
            items={[
              {
                id: 'overview',
                label: 'Overview',
                content: (
                  <OverviewTab
                    bid={bid}
                    documents={documents}
                    verifications={verifications}
                    intelligence={intelligence}
                    reviewSummary={reviewSummary}
                    attention={attention ?? EMPTY_ATTENTION}
                    onOpenIntelligence={() => goToTab('intelligence')}
                  />
                ),
              },
              {
                id: 'documents',
                label: `Documents (${documents.total})`,
                content: accessToken ? (
                  <BidDocumentsPanel
                    bidId={bid.id}
                    token={accessToken}
                    canWrite={canWrite}
                    onChanged={() => accessToken && void load(accessToken)}
                  />
                ) : null,
              },
              {
                id: 'verification',
                label: `Verification (${verifications.total})`,
                content: accessToken ? (
                  <BidVerificationPanel
                    bidId={bid.id}
                    token={accessToken}
                    canWrite={canWrite}
                    onChanged={() => accessToken && void load(accessToken)}
                  />
                ) : null,
              },
              {
                id: 'cross-checks',
                label: `Cross-Checks (${intelligence.crossChecks.total})`,
                content: accessToken ? (
                  <BidCrossChecksPanel
                    bidId={bid.id}
                    token={accessToken}
                    canWrite={canWrite}
                    focusId={focusCrossCheckId}
                    onChanged={() => accessToken && void load(accessToken)}
                  />
                ) : null,
              },
              {
                id: 'requirements',
                label: `Requirements (${intelligence.requirements.total})`,
                content: accessToken ? (
                  <BidRequirementsPanel
                    bidId={bid.id}
                    token={accessToken}
                    onOpenDocuments={() => goToTab('documents')}
                    onOpenVerification={() => goToTab('verification')}
                    onOpenCrossCheck={openCrossCheck}
                  />
                ) : null,
              },
              {
                id: 'review',
                label: `Review (${reviewSummary.total})`,
                content: accessToken ? (
                  <BidReviewPanel
                    bidId={bid.id}
                    token={accessToken}
                    intelligence={intelligence.requirements}
                  />
                ) : null,
              },
              {
                id: 'intelligence',
                label: `Intelligence (${attention?.score ?? bid.attentionSummary?.score ?? 0})`,
                content: attention ? <BidIntelligencePanel bidId={bid.id} intelligence={attention} /> : null,
              },
              {
                id: 'evaluation',
                label: 'Evaluation',
                content: <BidEvaluationPanel summary={evaluation} canWrite={canWrite} />,
              },
              {
                id: 'activity',
                label: 'Activity',
                content: (
                  <ActivityFeed
                    title="Submission activity"
                    emptyTitle="No recorded activity yet."
                    items={activity.map((item) => ({
                      id: item.id,
                      title: item.actorName ? `${item.actorName} ${item.title}` : item.title,
                      timestamp: formatDateTime(item.timestamp),
                    }))}
                  />
                ),
              },
            ]}
          />
        ) : null}
      </SessionGate>
      <ConfirmActionModal
        open={confirmSubmit}
        title="Submit this bid?"
        description="Once submitted, the bid will enter the procurement workflow and may become subject to tender controls."
        confirmLabel="Submit bid"
        cancelLabel="Cancel"
        loading={saving}
        onClose={() => setConfirmSubmit(false)}
        onConfirm={() => void onSubmit()}
      />
    </PageContainer>
  );
}

function OverviewTab({
  bid,
  documents,
  verifications,
  intelligence,
  reviewSummary,
  attention,
  onOpenIntelligence,
}: {
  bid: BidDetail;
  documents: { total: number; ready: number; processing: number; failed: number };
  verifications: { total: number; matched: number; mismatched: number; notFound: number; errors: number };
  intelligence: typeof EMPTY_INTELLIGENCE;
  reviewSummary: typeof EMPTY_REVIEW;
  attention: BidAttentionDetail;
  onOpenIntelligence: () => void;
}) {
  return (
    <div className="space-y-6">
      {bid.fieldLocks.all ? (
        <Alert title="Submission locked">
          This bid is {bid.status.replace(/_/g, ' ')} and submission details cannot be edited. Document evidence can
          still be inspected by authorised users.
        </Alert>
      ) : (
        <Alert title="Draft submission">
          This bid is a draft. It does not count as a submitted bid until you use Submit bid.
        </Alert>
      )}
      <Card>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <AttentionMeter score={attention.score} bandLabel={attention.bandLabel} />
            <div>
              <p className="text-xs uppercase tracking-wide text-foreground-muted">Officer Review Priority</p>
              <p className="mt-1 text-xl font-semibold">
                {attention.score} / 100
              </p>
              <div className="mt-2">
                <StatusBadge kind="attention" value={attention.band} />
              </div>
              <p className="mt-2 max-w-xl text-sm text-foreground-muted">{attention.scoreHint}</p>
            </div>
          </div>
          <Button variant="outline" onClick={onOpenIntelligence}>
            Inspect factors
          </Button>
        </div>
      </Card>
      {attention.coverage || attention.reviewRisk || attention.officerAdvisory ? (
        <div className="grid gap-4 lg:grid-cols-3">
          {attention.coverage ? (
            <Card>
              <CardTitle className="mb-2">Compliance coverage</CardTitle>
              <p className="text-xl font-semibold">{attention.coverage.score} / 100</p>
              <p className="mt-2 text-xs text-foreground-muted">{attention.coverage.disclaimer}</p>
            </Card>
          ) : null}
          {attention.reviewRisk ? (
            <Card>
              <CardTitle className="mb-2">Review risk</CardTitle>
              <p className="text-xl font-semibold">{attention.reviewRisk.label}</p>
            </Card>
          ) : null}
          {attention.officerAdvisory ? (
            <Card>
              <CardTitle className="mb-2">Officer advisory</CardTitle>
              <p className="text-sm text-foreground-muted">{attention.officerAdvisory.text}</p>
            </Card>
          ) : null}
        </div>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle className="mb-4">Submission overview</CardTitle>
          <dl className="grid gap-3 sm:grid-cols-2">
            <Item label="Submission reference" value={bid.submissionReference} />
            <div>
              <dt className="text-xs uppercase tracking-wide text-foreground-muted">Status</dt>
              <dd className="mt-1">
                <StatusBadge kind="bid" value={bid.status} />
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-foreground-muted">Tender</dt>
              <dd className="mt-1 text-sm">
                <Link className="underline" to={`/bharatbid/tenders/${bid.tenderId}`}>
                  {bid.tenderReference}
                </Link>
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-foreground-muted">Bidder</dt>
              <dd className="mt-1 text-sm">
                <Link className="underline" to={`/bharatbid/bidders/${bid.bidderId}`}>
                  {bid.bidderLegalName}
                </Link>
              </dd>
            </div>
            <Item label="Created" value={formatDate(bid.createdAt)} />
            <Item label="Submitted" value={formatDate(bid.submittedAt)} />
            <Item
              label="Documents"
              value={`${documents.total}${
                documents.ready || documents.processing || documents.failed
                  ? ` · Ready ${documents.ready} · Processing ${documents.processing} · Failed ${documents.failed}`
                  : ''
              }`}
            />
            <Item
              label="Verification checks"
              value={`${verifications.total} · Matched ${verifications.matched} · Mismatched ${verifications.mismatched} · Not found ${verifications.notFound} · Errors ${verifications.errors}`}
            />
            <Item
              label="Cross-checks"
              value={`${intelligence.crossChecks.total} · Consistent ${intelligence.crossChecks.consistent} · Difference ${intelligence.crossChecks.inconsistent} · Insufficient ${intelligence.crossChecks.insufficient}`}
            />
            <Item
              label="Evidence Coverage"
              value={
                intelligence.requirements.evidenceCoveragePercent === null
                  ? `${intelligence.requirements.evidenceAvailable} of ${intelligence.requirements.mandatory} mandatory requirements have evidence`
                  : `${intelligence.requirements.evidenceCoveragePercent}% of mandatory requirements have relevant evidence`
              }
            />
            <Item
              label="Review"
              value={`${reviewSummary.open} open · ${reviewSummary.clarificationRequested} clarification requested · ${reviewSummary.assessed} assessed · ${reviewSummary.finalProcurementDecisions} final procurement decisions`}
            />
          </dl>
        </Card>
        <Card>
          <CardTitle className="mb-4">Tender context</CardTitle>
          <dl className="grid gap-3 sm:grid-cols-2">
            <Item label="Title" value={bid.tenderTitle} />
            <Item label="Reference" value={bid.tenderReference} />
            <Item label="Category" value={bid.tenderCategory} />
            <Item label="Closing date" value={formatDate(bid.tenderClosingDate)} />
            {bid.tenderStatus ? (
              <div>
                <dt className="text-xs uppercase tracking-wide text-foreground-muted">Tender status</dt>
                <dd className="mt-1">
                  <StatusBadge kind="tender" value={bid.tenderStatus} />
                </dd>
              </div>
            ) : null}
          </dl>
        </Card>
        <Card>
          <CardTitle className="mb-4">Bidder context</CardTitle>
          <dl className="grid gap-3 sm:grid-cols-2">
            <Item label="Business name" value={bid.bidderTradeName || bid.bidderLegalName} />
            <Item label="Location" value={[bid.bidderCity, bid.bidderState].filter(Boolean).join(', ') || null} />
            <Item label="Contact" value={bid.bidderContactName} />
            <Item label="Email" value={bid.bidderContactEmail} />
            <div>
              <dt className="text-xs uppercase tracking-wide text-foreground-muted">PAN</dt>
              <dd className="mt-1 text-sm">
                <PresenceLabel value={bid.bidderPan} />
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-foreground-muted">GSTIN</dt>
              <dd className="mt-1 text-sm">
                <PresenceLabel value={bid.bidderGstin} />
              </dd>
            </div>
          </dl>
        </Card>
        <Card>
          <CardTitle className="mb-4">Submission readiness</CardTitle>
          <ul className="space-y-2 text-sm">
            {bid.readiness.items.map((item) => (
              <li key={item.id}>
                {item.passed ? '✓' : '○'} {item.label}
              </li>
            ))}
          </ul>
        </Card>
      </div>
      <Card>
        <CardTitle className="mb-4">Submission timeline</CardTitle>
        <dl className="grid gap-3 sm:grid-cols-3">
          <Item label="Created" value={formatDate(bid.createdAt)} />
          <Item label="Updated" value={formatDate(bid.updatedAt)} />
          <Item label="Submitted" value={formatDate(bid.submittedAt)} />
        </dl>
      </Card>
    </div>
  );
}

function Item({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-foreground-muted">{label}</dt>
      <dd className="mt-1 text-sm">{value || '—'}</dd>
    </div>
  );
}
