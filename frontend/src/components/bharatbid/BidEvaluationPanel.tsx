import { Link } from 'react-router-dom';

import { formatDateTime, StatusBadge } from './StatusBadge';
import type { BidEvaluationSummary } from '../../services/bharatbid';
import { Alert, Card, CardTitle } from '../../ui';

export function BidEvaluationPanel({
  summary,
  canWrite,
}: {
  summary: BidEvaluationSummary | null;
  canWrite: boolean;
}) {
  if (!summary) {
    return (
      <Card>
        <CardTitle>Evaluation</CardTitle>
        <p className="mt-2 text-sm text-foreground-muted">No evaluation snapshot is available for this bid yet.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Alert title="Decision support">{summary.advisory}</Alert>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-foreground-muted">AI Recommendation</p>
          <CardTitle className="mt-1">Decision support</CardTitle>
          <p className="mt-2 text-sm text-foreground-muted">{summary.decisionAdvisory}</p>
          <p className="mt-2 text-xs text-foreground-muted">AI assists. Officers decide.</p>
        </Card>
        <Card>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-foreground-muted">
            Procurement Officer Decision
          </p>
          <CardTitle className="mt-1">Latest officer decision</CardTitle>
          <div className="mt-2">
            {summary.latestDecision ? (
              <StatusBadge kind="officerDecision" value={summary.latestDecision.decision} />
            ) : (
              <p className="text-sm text-foreground-muted">None recorded</p>
            )}
          </div>
        </Card>
      </div>
      <Card>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <CardTitle>Officer evaluation</CardTitle>
          <Link className="text-sm underline" to={summary.comparisonPath}>
            Open tender comparison
          </Link>
        </div>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-foreground-muted">Evaluation status</dt>
            <dd className="mt-1">
              {summary.evaluation ? (
                <StatusBadge kind="tenderEvaluation" value={summary.evaluation.status} />
              ) : (
                'Not started'
              )}
            </dd>
          </div>
          <div>
            <dt className="text-foreground-muted">Evaluation readiness</dt>
            <dd className="mt-1">
              {summary.readiness ? <StatusBadge kind="readiness" value={summary.readiness} /> : 'Not available'}
            </dd>
          </div>
          <div>
            <dt className="text-foreground-muted">Latest officer decision</dt>
            <dd className="mt-1">
              {summary.latestDecision ? (
                <StatusBadge kind="officerDecision" value={summary.latestDecision.decision} />
              ) : (
                'None recorded'
              )}
            </dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-foreground-muted">{summary.decisionAdvisory}</p>
        {!canWrite ? (
          <p className="mt-2 text-xs text-foreground-muted">Reviewers can inspect this record but cannot change it.</p>
        ) : null}
      </Card>
      <Card>
        <CardTitle>Officer notes</CardTitle>
        <ul className="mt-3 space-y-3">
          {summary.notes.length === 0 ? (
            <li className="text-sm text-foreground-muted">No evaluation notes for this bid.</li>
          ) : (
            summary.notes.map((item) => (
              <li key={item.id} className="rounded-lg border border-edge px-3 py-2 text-sm">
                <p className="text-xs text-foreground-muted">
                  {item.createdBy.displayName} · {formatDateTime(item.createdAt)}
                </p>
                <p className="mt-1">{item.note}</p>
              </li>
            ))
          )}
        </ul>
      </Card>
      <Card>
        <CardTitle>Decision history</CardTitle>
        <ul className="mt-3 space-y-3">
          {summary.decisions.length === 0 ? (
            <li className="text-sm text-foreground-muted">No officer decision-support records for this bid.</li>
          ) : (
            summary.decisions.map((item) => (
              <li key={item.id} className="rounded-lg border border-edge px-3 py-2 text-sm">
                <p className="text-xs text-foreground-muted">
                  {item.decidedBy.displayName} · {formatDateTime(item.decidedAt)}
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
  );
}
