import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { SessionGate } from '../../auth/SessionGate';
import { useAuth } from '../../auth/AuthProvider';
import { ConfirmActionModal } from '../../components/bharatbid/ConfirmActionModal';
import { formatDateTime, REVIEW_ASSESSMENT_OPTIONS, StatusBadge } from '../../components/bharatbid/StatusBadge';
import { hasPermission } from '../../lib/rbac';
import { getApiErrorMessage } from '../../services/api';
import {
  DEMO_CLARIFICATION_ADVISORY,
  DEMO_REVIEW_ADVISORY,
  cancelOfficerClarification,
  closeOfficerReview,
  createOfficerAssessment,
  createOfficerClarification,
  getOfficerReview,
  listOfficerReviewActivity,
  respondOfficerClarification,
  startOfficerReview,
  type OfficerReviewDetail,
  type TenderActivityItem,
} from '../../services/bharatbid';
import {
  ActivityFeed,
  Alert,
  Breadcrumb,
  Button,
  Card,
  CardTitle,
  ErrorState,
  LoadingState,
  Modal,
  PageContainer,
  Select,
  useToast,
} from '../../ui';
import { controlBase, labelClass } from '../../ui/styles';

const NOTE_MIN = 20;

export function ReviewDetailPage() {
  const { id = '' } = useParams();
  const { accessToken, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [review, setReview] = useState<OfficerReviewDetail>();
  const [activity, setActivity] = useState<TenderActivityItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const [assessment, setAssessment] = useState('explanation_accepted');
  const [note, setNote] = useState('');
  const [clarifyOpen, setClarifyOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [requiredInformation, setRequiredInformation] = useState('');
  const [instructions, setInstructions] = useState('');
  const [demoRespond, setDemoRespond] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const canWrite = hasPermission(user, 'bids.write');

  async function load(token: string) {
    setLoading(true);
    setError(undefined);
    try {
      const [detail, events] = await Promise.all([getOfficerReview(id, token), listOfficerReviewActivity(id, token)]);
      setReview(detail);
      setActivity(events);
    } catch (caught) {
      setError(getApiErrorMessage(caught, 'Review information could not be loaded. Please try again.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (accessToken && id) {
      void load(accessToken);
    }
  }, [accessToken, id]);

  async function run(action: () => Promise<OfficerReviewDetail>, success: string) {
    if (!accessToken) return;
    setSaving(true);
    try {
      const next = await action();
      setReview(next);
      setActivity(await listOfficerReviewActivity(id, accessToken));
      toast({ title: success, variant: 'success' });
    } catch (caught) {
      toast({ title: getApiErrorMessage(caught, 'Action failed'), variant: 'error' });
    } finally {
      setSaving(false);
    }
  }

  async function onAssess(event: FormEvent) {
    event.preventDefault();
    if (note.trim().length < NOTE_MIN) {
      toast({
        title: 'This assessment needs a written explanation of at least 20 characters.',
        variant: 'error',
      });
      return;
    }
    await run(
      () => createOfficerAssessment(id, accessToken as string, { assessment, note }),
      'Officer assessment recorded',
    );
    setNote('');
  }

  const openClarification = review?.clarifications.find((item) => item.status === 'requested');
  const mutable = canWrite && review && review.status !== 'closed';

  return (
    <PageContainer
      width="wide"
      breadcrumb={
        <Breadcrumb
          items={[
            { label: 'Command Center', to: '/bharatbid' },
            { label: 'Officer review', to: '/bharatbid/review' },
            { label: review?.title ?? 'Review item' },
          ]}
        />
      }
      title={review?.title ?? 'Review item'}
      description="Machine findings stay unchanged. Officer assessments are a separate human record."
      actions={
        <div className="flex flex-wrap gap-2">
          {mutable && review.status === 'open' ? (
            <Button
              loading={saving}
              onClick={() => void run(() => startOfficerReview(id, accessToken as string), 'Review started')}
            >
              Start review
            </Button>
          ) : null}
          {mutable && review.status === 'assessed' ? (
            <Button variant="outline" onClick={() => setCloseOpen(true)}>
              Close review
            </Button>
          ) : null}
          <Button variant="outline" onClick={() => navigate('/bharatbid/review')}>
            Back to queue
          </Button>
        </div>
      }
    >
      <SessionGate title="Sign in to inspect officer reviews">
        {loading ? <LoadingState label="Loading review item…" /> : null}
        {error ? <ErrorState message={error} onRetry={() => accessToken && void load(accessToken)} /> : null}
        {review && !loading ? (
          <div className="space-y-6">
            <Alert title="Decision support only">{review.advisory || DEMO_REVIEW_ADVISORY}</Alert>
            <Card>
              <CardTitle className="mb-4">Bid / tender context</CardTitle>
              <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
                <Meta
                  label="Bid"
                  value={
                    <Link className="underline" to={`/bharatbid/bids/${review.bidSubmissionId}/review`}>
                      {review.bidReference}
                    </Link>
                  }
                />
                <Meta
                  label="Tender"
                  value={
                    <Link className="underline" to={`/bharatbid/tenders/${review.tenderId}`}>
                      {review.tenderReference}
                    </Link>
                  }
                />
                <Meta
                  label="Bidder"
                  value={
                    <Link className="underline" to={`/bharatbid/bidders/${review.bidderId}`}>
                      {review.bidderLegalName}
                    </Link>
                  }
                />
                <Meta label="Requirement" value={review.requirement?.name ?? review.requirementName ?? '—'} />
              </dl>
            </Card>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <CardTitle>Review finding</CardTitle>
                  <StatusBadge kind="review" value={review.status} />
                  <StatusBadge kind="issue" value={review.issueType} />
                </div>
                <dl className="grid gap-3 text-sm">
                  <Meta label="What happened?" value={review.whyCreated} />
                  <Meta label="Why does it matter?" value={review.whyItMatters} />
                  <Meta label="What can the officer inspect?" value={review.inspectHint} />
                  <Meta label="What can the officer do?" value={review.actionHint} />
                </dl>
              </Card>
              <Card>
                <CardTitle className="mb-3">Machine finding</CardTitle>
                <p className="text-lg font-semibold">{review.machineFinding.replace(/_/g, ' ')}</p>
                <p className="mt-2 text-sm text-foreground-muted">{review.machineExplanation}</p>
                <p className="mt-3 text-xs text-foreground-muted">
                  This machine result is immutable. Recording an assessment does not rewrite it.
                </p>
                {review.latestAssessment ? (
                  <div className="mt-4 rounded-lg border border-edge p-3">
                    <p className="text-xs uppercase tracking-wide text-foreground-muted">Officer assessment</p>
                    <div className="mt-2">
                      <StatusBadge kind="assessment" value={review.latestAssessment.assessment} />
                    </div>
                    <p className="mt-2 text-sm">{review.latestAssessment.note}</p>
                    <p className="mt-1 text-xs text-foreground-muted">
                      {review.latestAssessment.officerName} · {formatDateTime(review.latestAssessment.assessedAt)} ·
                      attempt {review.latestAssessment.attemptNumber}
                    </p>
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-foreground-muted">No officer assessment has been recorded yet.</p>
                )}
              </Card>
            </div>

            <Card>
              <CardTitle className="mb-3">Evidence</CardTitle>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => navigate(`/bharatbid/bids/${review.bidSubmissionId}/requirements`)}
                >
                  View requirement
                </Button>
                {review.document ? (
                  <Button variant="outline" onClick={() => navigate(`/bharatbid/bids/${review.bidSubmissionId}`)}>
                    View {review.document.originalFilename}
                  </Button>
                ) : null}
                {review.verification ? (
                  <Button
                    variant="outline"
                    onClick={() => navigate(`/bharatbid/bids/${review.bidSubmissionId}/verification`)}
                  >
                    View {review.verification.sourceDisplayName} verification
                  </Button>
                ) : null}
                {review.crossVerification ? (
                  <Button
                    variant="outline"
                    onClick={() => navigate(`/bharatbid/bids/${review.bidSubmissionId}/cross-checks`)}
                  >
                    View {review.crossVerification.leftSourceDisplayName} ↔{' '}
                    {review.crossVerification.rightSourceDisplayName}
                  </Button>
                ) : null}
              </div>
              {review.verification ? (
                <p className="mt-3 text-sm text-foreground-muted">
                  Source {review.verification.sourceDisplayName} · {review.verification.status.replace(/_/g, ' ')} · mode{' '}
                  {review.verification.sourceMode}
                </p>
              ) : null}
              {review.crossVerification ? (
                <p className="mt-2 text-sm">
                  Cross-check {review.crossVerification.comparisonType.replace(/_/g, ' ↔ ')} ·{' '}
                  <StatusBadge kind="cross" value={review.crossVerification.status} />
                </p>
              ) : null}
            </Card>

            {mutable ? (
              <Card>
                <CardTitle className="mb-3">Record officer assessment</CardTitle>
                <form className="space-y-3" onSubmit={(event) => void onAssess(event)}>
                  <Select
                    label="Assessment"
                    value={assessment}
                    onChange={(event) => setAssessment(event.target.value)}
                  >
                    {REVIEW_ASSESSMENT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                  <div>
                    <label className={labelClass} htmlFor="officer-note">
                      Officer note
                    </label>
                    <textarea
                      id="officer-note"
                      className={`${controlBase} mt-1 min-h-[6rem]`}
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                      placeholder="Explain the evidence considered. One-word acknowledgements are not accepted."
                    />
                  </div>
                  <Button type="submit" loading={saving}>
                    Record assessment
                  </Button>
                </form>
              </Card>
            ) : (
              <Alert title="Read-only review">
                {canWrite
                  ? 'This review item is closed. Previous assessments remain visible and cannot be silently edited.'
                  : 'Reviewers can inspect evidence, assessments, and clarifications, but cannot change the workflow.'}
              </Alert>
            )}

            <Card>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <CardTitle>Clarification</CardTitle>
                {mutable ? (
                  <Button variant="outline" onClick={() => setClarifyOpen(true)}>
                    Request clarification
                  </Button>
                ) : null}
              </div>
              <p className="mb-3 text-xs text-foreground-muted">{DEMO_CLARIFICATION_ADVISORY}</p>
              {review.clarifications.length === 0 ? (
                <p className="text-sm text-foreground-muted">No clarification has been requested for this item.</p>
              ) : (
                <ul className="space-y-3">
                  {review.clarifications.map((item) => (
                    <li key={item.id} className="rounded-lg border border-edge p-3 text-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge kind="clarification" value={item.status} />
                        <span className="text-xs text-foreground-muted">DEMO / SYNTHETIC</span>
                      </div>
                      <p className="mt-2">{item.message}</p>
                      <p className="mt-1 text-xs text-foreground-muted">
                        Requested by {item.requestedByName} · {formatDateTime(item.requestedAt)}
                      </p>
                      {item.response ? (
                        <p className="mt-2 rounded-md bg-surface p-2">
                          {item.response}
                          <span className="mt-1 block text-xs text-foreground-muted">
                            {item.respondedByName} · {formatDateTime(item.respondedAt)}
                          </span>
                        </p>
                      ) : null}
                      {mutable && item.status === 'requested' ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button variant="outline" onClick={() => setDemoRespond(true)}>
                            Record DEMO response
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() =>
                              void run(
                                () => cancelOfficerClarification(id, item.id, accessToken as string),
                                'Clarification cancelled',
                              )
                            }
                          >
                            Cancel request
                          </Button>
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            {review.assessments.length > 1 ? (
              <Card>
                <CardTitle className="mb-3">Assessment history</CardTitle>
                <ul className="space-y-2 text-sm">
                  {review.assessments.map((item) => (
                    <li key={item.id} className="rounded-lg border border-edge p-3">
                      <StatusBadge kind="assessment" value={item.assessment} />
                      <p className="mt-2">{item.note}</p>
                      <p className="mt-1 text-xs text-foreground-muted">
                        Attempt {item.attemptNumber}
                        {item.isLatest ? ' · latest' : ''} · {item.officerName} · {formatDateTime(item.assessedAt)}
                      </p>
                    </li>
                  ))}
                </ul>
              </Card>
            ) : null}

            <ActivityFeed
              title="Activity"
              emptyTitle="No recorded review activity yet."
              items={activity.map((item) => ({
                id: item.id,
                title: item.actorName ? `${item.actorName} ${item.title}` : `System: ${item.title}`,
                timestamp: formatDateTime(item.timestamp),
              }))}
            />
          </div>
        ) : null}
      </SessionGate>

      <Modal
        open={clarifyOpen}
        onClose={() => setClarifyOpen(false)}
        title="Request clarification"
        description="Stored in-app only. No bidder email or government message is sent."
        footer={
          <>
            <Button variant="outline" onClick={() => setClarifyOpen(false)}>
              Cancel
            </Button>
            <Button
              loading={saving}
              onClick={() => {
                const message = [reason, requiredInformation, instructions].filter((part) => part.trim()).join('\n\n');
                if (message.trim().length < NOTE_MIN) {
                  toast({
                    title: 'Describe the information required in at least 20 characters.',
                    variant: 'error',
                  });
                  return;
                }
                void run(
                  () =>
                    createOfficerClarification(id, accessToken as string, {
                      message,
                    }),
                  'Clarification stored in-app',
                ).then(() => {
                  setClarifyOpen(false);
                  setReason('');
                  setRequiredInformation('');
                  setInstructions('');
                });
              }}
            >
              Store clarification
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Alert title="DEMO / SYNTHETIC">{DEMO_CLARIFICATION_ADVISORY}</Alert>
          <Field label="Reason" id="clarify-reason" value={reason} onChange={setReason} />
          <Field
            label="Required information"
            id="clarify-required"
            value={requiredInformation}
            onChange={setRequiredInformation}
          />
          <Field
            label="Additional instructions"
            id="clarify-instructions"
            value={instructions}
            onChange={setInstructions}
          />
        </div>
      </Modal>

      <ConfirmActionModal
        open={demoRespond}
        title="Record a DEMO response?"
        description="This stores a synthetic in-app reply. It does not mean a real bidder was contacted."
        confirmLabel="Record DEMO response"
        cancelLabel="Cancel"
        loading={saving}
        onClose={() => setDemoRespond(false)}
        onConfirm={() => {
          if (!openClarification || !accessToken) return;
          void run(
            () =>
              respondOfficerClarification(
                id,
                openClarification.id,
                accessToken,
                'Supporting project completion evidence is attached in this DEMO response for officer inspection.',
              ),
            'DEMO clarification response recorded',
          ).then(() => setDemoRespond(false));
        }}
      />

      <ConfirmActionModal
        open={closeOpen}
        title="Close this review item?"
        description="Closure records that the officer finished this decision-support item. It does not approve, reject, or award the bid."
        confirmLabel="Close review"
        cancelLabel="Keep open"
        loading={saving}
        onClose={() => setCloseOpen(false)}
        onConfirm={() => {
          void run(() => closeOfficerReview(id, accessToken as string), 'Review closed').then(() => setCloseOpen(false));
        }}
      />
    </PageContainer>
  );
}

function Meta({ label, value }: { label: string; value: string | null | undefined | ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-foreground-muted">{label}</dt>
      <dd className="mt-1">{value || '—'}</dd>
    </div>
  );
}

function Field({
  label,
  id,
  value,
  onChange,
}: {
  label: string;
  id: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className={labelClass} htmlFor={id}>
        {label}
      </label>
      <textarea
        id={id}
        className={`${controlBase} mt-1 min-h-[4rem]`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
