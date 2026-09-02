import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { SessionGate } from '../../auth/SessionGate';
import { useAuth } from '../../auth/AuthProvider';
import { formatDateTime, StatusBadge, EVALUATION_DECISION_OPTIONS } from '../../components/bharatbid/StatusBadge';
import { hasPermission } from '../../lib/rbac';
import { getApiErrorMessage } from '../../services/api';
import {
  DEMO_DECISION_ADVISORY,
  DEMO_EVALUATION_ADVISORY,
  createEvaluation,
  createEvaluationDecision,
  createEvaluationNote,
  downloadTenderEvaluationReport,
  getTenderEvaluationComparison,
  markEvaluationReady,
  recordEvaluationComplete,
  startEvaluation,
  type ComparisonBid,
  type EvaluationComparison,
  type EvaluationDecisionType,
  type RequirementCell,
} from '../../services/bharatbid';
import {
  Alert,
  Breadcrumb,
  Button,
  Card,
  CardTitle,
  Checkbox,
  Drawer,
  ErrorState,
  KpiCard,
  LoadingState,
  PageContainer,
  Select,
  useToast,
} from '../../ui';
import { controlBase, labelClass } from '../../ui/styles';

const MAX_COLUMNS = 4;

export function EvaluationWorkspacePage() {
  const { tenderId = '' } = useParams();
  const { accessToken, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const canWrite = hasPermission(user, 'bids.write');
  const [comparison, setComparison] = useState<EvaluationComparison>();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [focusBidId, setFocusBidId] = useState<string>();
  const [inspect, setInspect] = useState<{ bid: ComparisonBid; cell: RequirementCell }>();
  const [sideBySide, setSideBySide] = useState<[string, string] | null>(null);
  const [note, setNote] = useState('');
  const [noteBidId, setNoteBidId] = useState('');
  const [decision, setDecision] = useState<EvaluationDecisionType>('requires_clarification');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [error, setError] = useState<string>();

  async function load(token: string, ids?: string[]) {
    setLoading(true);
    setError(undefined);
    try {
      const result = await getTenderEvaluationComparison(tenderId, token, ids);
      setComparison(result);
      const nextIds = result.bids.map((bid) => bid.id);
      setSelectedIds(nextIds);
      setFocusBidId((current) => current ?? nextIds[0]);
    } catch (caught) {
      setError(getApiErrorMessage(caught, 'Unable to load this evaluation comparison.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!accessToken || !tenderId) return;
    void load(accessToken);
  }, [accessToken, tenderId]);

  const evaluation = comparison?.evaluation;
  const bids = comparison?.bids ?? [];
  const focusBid = bids.find((bid) => bid.id === focusBidId) ?? bids[0];
  const pair = useMemo(() => {
    if (!sideBySide) return null;
    return {
      left: bids.find((bid) => bid.id === sideBySide[0]),
      right: bids.find((bid) => bid.id === sideBySide[1]),
    };
  }, [bids, sideBySide]);

  async function ensureEvaluation(token: string) {
    if (evaluation) return evaluation;
    return createEvaluation(tenderId, token);
  }

  async function run(action: () => Promise<unknown>, success: string) {
    if (!accessToken) return;
    setSaving(true);
    try {
      await action();
      toast({ title: success, variant: 'success' });
      await load(accessToken, selectedIds);
    } catch (caught) {
      toast({ title: getApiErrorMessage(caught, 'The evaluation could not be updated.'), variant: 'error' });
    } finally {
      setSaving(false);
    }
  }

  function toggleBid(id: string) {
    setSelectedIds((current) => {
      if (current.includes(id)) {
        const next = current.filter((item) => item !== id);
        return next.length === 0 ? current : next;
      }
      if (current.length >= MAX_COLUMNS) {
        toast({ title: `Compare at most ${MAX_COLUMNS} bids at a time.`, variant: 'error' });
        return current;
      }
      return [...current, id];
    });
  }

  return (
    <PageContainer width="full">
      <Breadcrumb
        items={[
          { label: 'Command Center', to: '/bharatbid' },
          { label: 'Evaluation', to: '/bharatbid/evaluation' },
          { label: comparison?.tender.referenceNumber ?? 'Workspace' },
        ]}
      />
      <SessionGate>
        {loading && !comparison ? <LoadingState label="Loading evaluation comparison" /> : null}
        {error ? (
          <ErrorState
            title="Unable to load evaluation"
            message={error}
            onRetry={() => accessToken && void load(accessToken)}
          />
        ) : null}
        {comparison ? (
          <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">
                  {comparison.demoLabel}
                </p>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">{comparison.tender.title}</h1>
                <p className="mt-1 text-sm text-foreground-muted">
                  {comparison.tender.referenceNumber} · {comparison.tender.category} · closes{' '}
                  {formatDateTime(comparison.tender.closingDate)}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {evaluation ? <StatusBadge kind="tenderEvaluation" value={evaluation.status} /> : null}
                {canWrite && !evaluation ? (
                  <Button
                    loading={saving}
                    onClick={() => void run(async () => createEvaluation(tenderId, accessToken!), 'Evaluation created')}
                  >
                    Create evaluation
                  </Button>
                ) : null}
                {canWrite && evaluation?.status === 'not_started' ? (
                  <Button loading={saving} onClick={() => void run(async () => startEvaluation(evaluation.id, accessToken!), 'Evaluation started')}>
                    Start evaluation
                  </Button>
                ) : null}
                {canWrite && evaluation?.status === 'in_progress' ? (
                  <Button
                    variant="outline"
                    loading={saving}
                    onClick={() => void run(async () => markEvaluationReady(evaluation.id, accessToken!), 'Marked ready for decision')}
                  >
                    Mark ready for decision
                  </Button>
                ) : null}
                {canWrite && evaluation?.status === 'ready_for_decision' ? (
                  <Button
                    variant="outline"
                    loading={saving}
                    onClick={() => void run(async () => recordEvaluationComplete(evaluation.id, accessToken!), 'Decision recorded status saved')}
                  >
                    Record evaluation complete
                  </Button>
                ) : null}
                {canWrite ? (
                  <Button
                    loading={reporting}
                    onClick={() =>
                      void (async () => {
                        if (!accessToken) return;
                        setReporting(true);
                        try {
                          await downloadTenderEvaluationReport(tenderId, accessToken);
                          toast({ title: 'Evaluation report downloaded', variant: 'success' });
                        } catch (caught) {
                          toast({
                            title: getApiErrorMessage(caught, 'The evaluation report could not be generated.'),
                            variant: 'error',
                          });
                        } finally {
                          setReporting(false);
                        }
                      })()
                    }
                  >
                    Generate report
                  </Button>
                ) : null}
              </div>
            </div>

            <Alert title="Decision support">{comparison.advisory || DEMO_EVALUATION_ADVISORY}</Alert>

            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground-muted">
                Evaluation overview
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                <KpiCard label="Submitted bids" value={comparison.overview.submittedBids} />
                <KpiCard label="Evidence gaps" value={comparison.overview.evidenceGaps} />
                <KpiCard label="Verification issues" value={comparison.overview.verificationIssues} />
                <KpiCard label="Open reviews" value={comparison.overview.openReviews} />
                <KpiCard label="Pending clarifications" value={comparison.overview.pendingClarifications} />
              </div>
            </section>

            <Card>
              <CardTitle>Comparison columns</CardTitle>
              <p className="mb-3 mt-1 text-sm text-foreground-muted">
                Select 2–{MAX_COLUMNS} submitted bids. Metrics stay separate and are not combined into a winner score.
              </p>
              <div className="flex flex-wrap gap-4">
                {comparison.availableBids.map((bid) => (
                  <Checkbox
                    key={bid.id}
                    label={`${bid.bidderLegalName} (${bid.submissionReference})`}
                    checked={selectedIds.includes(bid.id)}
                    onChange={() => toggleBid(bid.id)}
                  />
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => accessToken && void load(accessToken, selectedIds)}
                  disabled={selectedIds.length < 1}
                >
                  Refresh comparison
                </Button>
                {selectedIds.length >= 2 ? (
                  <Button size="sm" variant="outline" onClick={() => setSideBySide([selectedIds[0], selectedIds[1]])}>
                    Side-by-side first two
                  </Button>
                ) : null}
              </div>
            </Card>

            <Card>
              <CardTitle>Bid comparison</CardTitle>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-0 text-sm">
                  <thead>
                    <tr>
                      <th className="sticky left-0 z-20 border-b border-r border-edge bg-surface-elevated px-3 py-2 text-left font-medium shadow-[2px_0_6px_-4px_rgba(15,23,42,0.35)]">
                        Evaluation dimension
                      </th>
                      {bids.map((bid) => (
                        <th
                          key={bid.id}
                          className="sticky top-0 z-10 min-w-[14rem] border-b border-edge bg-surface-elevated px-3 py-2 text-left font-medium"
                        >
                          <button type="button" className="text-left" onClick={() => setFocusBidId(bid.id)}>
                            <span className="block">{bid.bidderLegalName}</span>
                            <span className="block text-xs font-normal text-foreground-muted">{bid.submissionReference}</span>
                          </button>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <ComparisonRow label="Bid reference" bids={bids} render={(bid) => bid.submissionReference} />
                    <ComparisonRow
                      label="Evidence coverage"
                      bids={bids}
                      render={(bid) => (bid.evidenceCoveragePercent == null ? '—' : `${bid.evidenceCoveragePercent}%`)}
                    />
                    <ComparisonRow
                      label="Verification"
                      bids={bids}
                      render={(bid) => (
                        <Link className="underline" to={bid.links.verification}>
                          {bid.verificationLabel}
                        </Link>
                      )}
                    />
                    <ComparisonRow
                      label="Cross-checks"
                      bids={bids}
                      render={(bid) => (
                        <Link className="underline" to={bid.links.crossChecks}>
                          {bid.crossCheckLabel}
                        </Link>
                      )}
                    />
                    <ComparisonRow
                      label="Open reviews"
                      bids={bids}
                      render={(bid) => (
                        <Link className="underline" to={bid.links.review}>
                          {bid.reviewSummary.open + bid.reviewSummary.inReview}
                        </Link>
                      )}
                    />
                    <ComparisonRow
                      label="Officer Review Priority"
                      bids={bids}
                      render={(bid) =>
                        bid.attention ? (
                          <div>
                            <p>
                              {bid.attention.score} / 100
                            </p>
                            <StatusBadge kind="attention" value={bid.attention.band} />
                          </div>
                        ) : (
                          '—'
                        )
                      }
                    />
                    <ComparisonRow
                      label="Evaluation readiness"
                      bids={bids}
                      render={(bid) => <StatusBadge kind="readiness" value={bid.readiness} />}
                    />
                    <ComparisonRow label="Financial amount" bids={bids} render={() => comparison.financialUnavailableReason} />
                    <ComparisonRow
                      label="Officer decision"
                      bids={bids}
                      render={(bid) =>
                        bid.latestDecision ? (
                          <StatusBadge kind="officerDecision" value={bid.latestDecision.decision} />
                        ) : (
                          'None recorded'
                        )
                      }
                    />
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-xs text-foreground-muted">{comparison.attentionDisclaimer}</p>
            </Card>

            <Card>
              <CardTitle>Requirement comparison</CardTitle>
              <p className="mb-3 mt-1 text-sm text-foreground-muted">
                Statuses come from existing requirement intelligence. Click a cell to inspect supporting evidence.
              </p>
              <div className="overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-0 text-sm">
                  <thead>
                    <tr>
                      <th className="sticky left-0 z-20 border-b border-r border-edge bg-surface-elevated px-3 py-2 text-left font-medium shadow-[2px_0_6px_-4px_rgba(15,23,42,0.35)]">
                        Requirement
                      </th>
                      {bids.map((bid) => (
                        <th key={bid.id} className="min-w-[12rem] border-b border-edge px-3 py-2 text-left font-medium">
                          {bid.bidderLegalName}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {comparison.requirements.map((requirement) => (
                      <tr key={requirement.id}>
                        <th className="sticky left-0 z-10 border-b border-r border-edge bg-surface-elevated px-3 py-2 text-left font-normal">
                          <span className="font-medium">{requirement.name}</span>
                          <span className="ml-2 text-xs text-foreground-muted">
                            {requirement.mandatory ? 'Mandatory' : 'Optional'}
                          </span>
                        </th>
                        {bids.map((bid) => {
                          const cell = bid.requirementCells.find((item) => item.requirementId === requirement.id);
                          return (
                            <td key={bid.id} className="border-b border-edge px-3 py-2">
                              {cell ? (
                                <button type="button" onClick={() => setInspect({ bid, cell })}>
                                  <StatusBadge kind="requirementCell" value={cell.cellStatus} />
                                </button>
                              ) : (
                                '—'
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardTitle>Evaluation checklist</CardTitle>
                <ul className="mt-3 space-y-2 text-sm">
                  {comparison.checklist.map((item) => (
                    <li key={item.id} className="flex items-start gap-2">
                      <span aria-hidden>{item.passed ? '☑' : '☐'}</span>
                      <span>
                        {item.label}
                        <span className="ml-2 text-xs text-foreground-muted">
                          {item.passed ? 'Complete from system state' : 'Outstanding in current evidence'}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-xs text-foreground-muted">
                  Checklist items are derived from stored evidence and reviews. Officers cannot check them off to bypass
                  unresolved issues.
                </p>
              </Card>
              <Card>
                <CardTitle>Decision support</CardTitle>
                {focusBid ? (
                  <div className="mt-3 space-y-2 text-sm">
                    <p>
                      <span className="text-foreground-muted">Bidder</span> {focusBid.bidderLegalName}
                    </p>
                    <p>
                      <span className="text-foreground-muted">Evidence coverage</span>{' '}
                      {focusBid.evidenceCoveragePercent == null ? '—' : `${focusBid.evidenceCoveragePercent}%`}
                    </p>
                    <p>
                      <span className="text-foreground-muted">Verification</span> {focusBid.verificationLabel}
                    </p>
                    <p>
                      <span className="text-foreground-muted">Cross-checks</span> {focusBid.crossCheckLabel}
                    </p>
                    <p>
                      <span className="text-foreground-muted">Open reviews</span>{' '}
                      {focusBid.reviewSummary.open + focusBid.reviewSummary.inReview}
                    </p>
                    <p>
                      <span className="text-foreground-muted">Clarifications</span>{' '}
                      {focusBid.reviewSummary.clarificationRequested}
                    </p>
                    <p>
                      <span className="text-foreground-muted">Officer Review Priority</span>{' '}
                      {focusBid.attention ? `${focusBid.attention.score} / 100 · ${focusBid.attention.bandLabel}` : '—'}
                    </p>
                    <div className="flex flex-wrap gap-2 pt-2">
                      <Button size="sm" variant="outline" onClick={() => navigate(focusBid.links.bid)}>
                        Open bid
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => navigate(focusBid.links.review)}>
                        Reviews
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => navigate(focusBid.links.intelligence)}>
                        Attention
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-foreground-muted">Select a bid column to inspect decision-support facts.</p>
                )}
              </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardTitle>Officer evaluation notes</CardTitle>
                {canWrite && evaluation && evaluation.status !== 'not_started' ? (
                  <form
                    className="mt-3 space-y-3"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void run(async () => {
                        const current = await ensureEvaluation(accessToken!);
                        await createEvaluationNote(
                          current.id,
                          { note, bidSubmissionId: noteBidId || undefined },
                          accessToken!,
                        );
                        setNote('');
                      }, 'Evaluation note recorded');
                    }}
                  >
                    <Select
                      label="Apply to"
                      value={noteBidId}
                      onChange={(event) => setNoteBidId(event.target.value)}
                    >
                      <option value="">Tender-wide note</option>
                      {bids.map((bid) => (
                        <option key={bid.id} value={bid.id}>
                          {bid.bidderLegalName}
                        </option>
                      ))}
                    </Select>
                    <div>
                      <label className={labelClass} htmlFor="evaluation-note">
                        Note
                      </label>
                      <textarea
                        id="evaluation-note"
                        className={`${controlBase} mt-1 min-h-[6rem]`}
                        value={note}
                        onChange={(event) => setNote(event.target.value)}
                        placeholder="Describe the evidence considered. One-word acknowledgements are not accepted."
                      />
                    </div>
                    <Button type="submit" loading={saving}>
                      Record note
                    </Button>
                  </form>
                ) : (
                  <Alert className="mt-3" title={canWrite ? 'Start evaluation first' : 'Read-only'}>
                    {canWrite
                      ? 'Officer notes can be recorded after the evaluation is started.'
                      : 'Reviewers can inspect notes but cannot record officer decisions.'}
                  </Alert>
                )}
                <ul className="mt-4 space-y-3">
                  {comparison.notes.length === 0 ? (
                    <li className="text-sm text-foreground-muted">No evaluation notes yet.</li>
                  ) : (
                    comparison.notes.map((item) => (
                      <li key={item.id} className="rounded-lg border border-edge px-3 py-2 text-sm">
                        <p className="text-xs text-foreground-muted">
                          {item.createdBy.displayName} · {formatDateTime(item.createdAt)}
                          {item.bidReference ? ` · ${item.bidReference}` : ' · Tender-wide'}
                          {item.isLatest ? ' · Latest' : ` · v${item.attemptNumber}`}
                        </p>
                        <p className="mt-1">{item.note}</p>
                      </li>
                    ))
                  )}
                </ul>
              </Card>

              <Card>
                <CardTitle>Officer decision</CardTitle>
                <p className="mt-1 text-xs text-foreground-muted">{comparison.decisionAdvisory || DEMO_DECISION_ADVISORY}</p>
                {canWrite && evaluation && evaluation.status !== 'not_started' && focusBid ? (
                  <form
                    className="mt-3 space-y-3"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void run(async () => {
                        const current = await ensureEvaluation(accessToken!);
                        await createEvaluationDecision(
                          current.id,
                          { bidSubmissionId: focusBid.id, decision, reason },
                          accessToken!,
                        );
                        setReason('');
                      }, 'Officer decision-support record saved');
                    }}
                  >
                    <p className="text-sm">
                      Recording for <span className="font-medium">{focusBid.bidderLegalName}</span>
                    </p>
                    <Select
                      label="Decision-support state"
                      value={decision}
                      onChange={(event) => setDecision(event.target.value as EvaluationDecisionType)}
                      options={EVALUATION_DECISION_OPTIONS}
                    />
                    <div>
                      <label className={labelClass} htmlFor="decision-reason">
                        Reason
                      </label>
                      <textarea
                        id="decision-reason"
                        className={`${controlBase} mt-1 min-h-[6rem]`}
                        value={reason}
                        onChange={(event) => setReason(event.target.value)}
                        placeholder="Explain the officer judgement. This is not an award or rejection."
                      />
                    </div>
                    <Button type="submit" loading={saving}>
                      Record officer decision
                    </Button>
                  </form>
                ) : (
                  <Alert className="mt-3" title={canWrite ? 'Start evaluation first' : 'Read-only'}>
                    {canWrite
                      ? 'Select a compared bid, start the evaluation, then record an officer-entered decision-support state.'
                      : 'Reviewers can inspect decision history but cannot record decisions.'}
                  </Alert>
                )}
                <h3 className="mt-4 text-sm font-semibold">Decision history</h3>
                <ul className="mt-2 space-y-3">
                  {comparison.decisions.length === 0 ? (
                    <li className="text-sm text-foreground-muted">No officer decisions recorded yet.</li>
                  ) : (
                    comparison.decisions.map((item) => (
                      <li key={item.id} className="rounded-lg border border-edge px-3 py-2 text-sm">
                        <p className="text-xs text-foreground-muted">
                          {item.decidedBy.displayName} · {formatDateTime(item.decidedAt)} · {item.bidReference}
                        </p>
                        <div className="mt-1">
                          <StatusBadge kind="officerDecision" value={item.decision} />
                        </div>
                        <p className="mt-1">{item.reason}</p>
                      </li>
                    ))
                  )}
                </ul>
              </Card>
            </div>
          </div>
        ) : null}
      </SessionGate>

      <Drawer
        open={Boolean(inspect)}
        onClose={() => setInspect(undefined)}
        title={inspect ? `${inspect.cell.cellLabel} · ${inspect.cell.name}` : 'Evidence'}
      >
        {inspect ? (
          <div className="space-y-3 text-sm">
            <p>{inspect.cell.explanation}</p>
            <p>
              <span className="text-foreground-muted">Bidder</span> {inspect.bid.bidderLegalName}
            </p>
            <p>
              <span className="text-foreground-muted">Documents</span>
            </p>
            {inspect.cell.documents.length === 0 ? (
              <p>No linked document on this requirement.</p>
            ) : (
              inspect.cell.documents.map((doc) => (
                <p key={doc.id}>
                  <Link className="underline" to={inspect.bid.links.documents}>
                    {doc.originalFilename}
                  </Link>
                </p>
              ))
            )}
            {inspect.cell.verification ? (
              <p>
                Verification: {inspect.cell.verification.source.toUpperCase()} · {inspect.cell.verification.status}{' '}
                <Link className="underline" to={inspect.bid.links.verification}>
                  Open
                </Link>
              </p>
            ) : (
              <p>No verification record for this requirement.</p>
            )}
            {inspect.cell.crossCheck ? (
              <p>
                Cross-check: {inspect.cell.crossCheck.comparisonType.replace(/_/g, ' ↔ ')} · {inspect.cell.crossCheck.status}{' '}
                <Link className="underline" to={inspect.bid.links.crossChecks}>
                  Open
                </Link>
              </p>
            ) : null}
            {inspect.cell.reviews.map((review) => (
              <p key={review.id}>
                Review: {review.title} · {review.status}{' '}
                <Link className="underline" to={`/bharatbid/review/${review.id}`}>
                  Open
                </Link>
              </p>
            ))}
          </div>
        ) : null}
      </Drawer>

      <Drawer open={Boolean(pair?.left && pair?.right)} onClose={() => setSideBySide(null)} title="Side-by-side comparison">
        {pair?.left && pair.right ? (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <SideColumn bid={pair.left} />
            <SideColumn bid={pair.right} />
          </div>
        ) : null}
      </Drawer>
    </PageContainer>
  );
}

function ComparisonRow({
  label,
  bids,
  render,
}: {
  label: string;
  bids: ComparisonBid[];
  render: (bid: ComparisonBid) => ReactNode;
}) {
  return (
    <tr>
      <th className="sticky left-0 z-10 border-b border-r border-edge bg-surface-elevated px-3 py-2 text-left font-normal text-foreground-muted shadow-[2px_0_6px_-4px_rgba(15,23,42,0.35)]">
        {label}
      </th>
      {bids.map((bid) => (
        <td key={bid.id} className="border-b border-edge px-3 py-2 align-top">
          {render(bid)}
        </td>
      ))}
    </tr>
  );
}

function SideColumn({ bid }: { bid: ComparisonBid }) {
  return (
    <div className="space-y-2">
      <h3 className="font-semibold">{bid.bidderLegalName}</h3>
      <p>{bid.submissionReference}</p>
      <p>Evidence coverage: {bid.evidenceCoveragePercent == null ? '—' : `${bid.evidenceCoveragePercent}%`}</p>
      <p>Verification: {bid.verificationLabel}</p>
      <p>Cross-checks: {bid.crossCheckLabel}</p>
      <p>Open reviews: {bid.reviewSummary.open + bid.reviewSummary.inReview}</p>
      <p>Officer Review Priority: {bid.attention ? `${bid.attention.score} / 100` : '—'}</p>
      <p>Readiness: {bid.readinessLabel}</p>
      <Link className="underline" to={bid.links.bid}>
        Open bid detail
      </Link>
    </div>
  );
}
