import { Link } from 'react-router-dom';

import { StatusBadge } from './StatusBadge';
import {
  DEMO_ATTENTION_ADVISORY,
  attentionFactorHref,
  type AttentionFactor,
  type BidAttentionDetail,
} from '../../services/bharatbid';
import { Alert, Badge, Card, CardTitle } from '../../ui';

export function AttentionMeter({
  score,
  bandLabel,
}: {
  score: number;
  bandLabel: string;
}) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, Math.max(0, score)) / 100) * circumference;
  return (
    <svg
      role="img"
      aria-label={`Officer attention score ${score} of 100, ${bandLabel}`}
      viewBox="0 0 120 120"
      className="h-28 w-28 text-accent"
    >
      <title>{`Officer attention score ${score} of 100, ${bandLabel}`}</title>
      <circle cx="60" cy="60" r={radius} fill="none" className="stroke-edge" strokeWidth="8" />
      <circle
        cx="60"
        cy="60"
        r={radius}
        fill="none"
        className="stroke-current"
        strokeWidth="8"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 60 60)"
      />
      <text x="60" y="56" textAnchor="middle" className="fill-foreground text-xl font-semibold">
        {score}
      </text>
      <text x="60" y="74" textAnchor="middle" className="fill-foreground-muted text-[10px]">
        / 100
      </text>
    </svg>
  );
}

export function BidIntelligencePanel({
  bidId,
  intelligence,
}: {
  bidId: string;
  intelligence: BidAttentionDetail;
}) {
  const maxPoints = Math.max(...intelligence.factors.map((factor) => factor.originalPoints), 1);
  return (
    <div className="space-y-6">
      <Alert title="Decision-support only">{intelligence.advisory || DEMO_ATTENTION_ADVISORY}</Alert>
      <p className="text-xs uppercase tracking-wide text-foreground-muted">{intelligence.demoLabel}</p>
      <div className="grid gap-4 lg:grid-cols-[auto,1fr]">
        <Card className="flex items-center gap-4 p-5">
          <AttentionMeter score={intelligence.score} bandLabel={intelligence.bandLabel} />
          <div>
            <p className="text-xs uppercase tracking-wide text-foreground-muted">Review priority</p>
            <p className="mt-1 text-2xl font-semibold">
              {intelligence.score} / 100
            </p>
            <div className="mt-2">
              <StatusBadge kind="attention" value={intelligence.band} />
            </div>
            <p className="mt-3 max-w-sm text-sm text-foreground-muted">{intelligence.scoreHint}</p>
          </div>
        </Card>
        <div className="grid gap-3 sm:grid-cols-2">
          <SummaryTile label="Evidence Coverage" value={coverageLabel(intelligence.evidenceCoveragePercent)} />
          <SummaryTile label="Open issues" value={String(intelligence.openIssues)} />
          <SummaryTile label="Pending clarifications" value={String(intelligence.pendingClarifications)} />
          <SummaryTile label="Scoring rules" value={intelligence.modelVersion} />
        </div>
      </div>
      {intelligence.coverage || intelligence.reviewRisk || intelligence.officerAdvisory ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {intelligence.coverage ? (
            <Card>
              <CardTitle className="mb-2">Evidence &amp; Compliance Coverage</CardTitle>
              <p className="text-2xl font-semibold">{intelligence.coverage.score} / 100</p>
              <p className="mt-2 text-sm text-foreground-muted">{intelligence.coverage.disclaimer}</p>
              <ul className="mt-3 space-y-1 text-sm">
                {intelligence.coverage.factors.map((factor) => (
                  <li key={factor.id}>
                    <span className="font-medium">{factor.points > 0 ? `+${factor.points}` : factor.points}</span>
                    {' · '}
                    {factor.label}
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
          {intelligence.reviewRisk ? (
            <Card>
              <CardTitle className="mb-2">Procurement Review Risk</CardTitle>
              <p className="text-2xl font-semibold">{intelligence.reviewRisk.label}</p>
              <p className="mt-2 text-sm text-foreground-muted">{intelligence.reviewRisk.explanation}</p>
            </Card>
          ) : null}
          {intelligence.officerAdvisory ? (
            <Card className="lg:col-span-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-foreground-muted">AI Recommendation</p>
              <CardTitle className="mb-2 mt-1">Officer advisory</CardTitle>
              <p className="text-sm">{intelligence.officerAdvisory.text}</p>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-foreground-muted">
                {intelligence.officerAdvisory.bullets.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-foreground-muted">
                AI assists. Officers decide. {intelligence.officerAdvisory.disclaimer}
              </p>
            </Card>
          ) : null}
        </div>
      ) : null}
      {intelligence.makeInIndia || intelligence.oemAuthorization || intelligence.informationGaps?.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {intelligence.makeInIndia ? (
            <Card>
              <CardTitle className="mb-2">Make in India / local content</CardTitle>
              <p className="text-sm font-medium">{intelligence.makeInIndia.declaredClass.replace(/_/g, ' ')}</p>
              <p className="mt-2 text-sm text-foreground-muted">{intelligence.makeInIndia.explanation}</p>
            </Card>
          ) : null}
          {intelligence.oemAuthorization ? (
            <Card>
              <CardTitle className="mb-2">OEM authorization</CardTitle>
              <p className="text-sm font-medium">{intelligence.oemAuthorization.outcome.replace(/_/g, ' ')}</p>
              <p className="mt-2 text-sm text-foreground-muted">{intelligence.oemAuthorization.explanation}</p>
            </Card>
          ) : null}
        </div>
      ) : null}
      {intelligence.digiLockerDemo && intelligence.digiLockerDemo.length > 0 ? (
        <Card>
          <CardTitle className="mb-2">DEMO DigiLocker-style authenticity</CardTitle>
          <p className="mb-3 text-sm text-foreground-muted">This is a synthetic demonstration result and is not connected to DigiLocker.</p>
          <ul className="space-y-1 text-sm">
            {intelligence.digiLockerDemo.map((item) => (
              <li key={item.documentId}>
                {item.documentFilename}: {item.status.replace(/_/g, ' ')}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
      {intelligence.informationGaps && intelligence.informationGaps.length > 0 ? (
        <Card>
          <CardTitle className="mb-2">Missing / inconsistent information</CardTitle>
          <ul className="list-disc space-y-1 pl-5 text-sm text-foreground-muted">
            {intelligence.informationGaps.map((gap) => (
              <li key={gap.id}>{gap.description}</li>
            ))}
          </ul>
        </Card>
      ) : null}
      {intelligence.history.length > 1 ? (
        <Card>
          <CardTitle className="mb-3">Attention score history</CardTitle>
          <ol className="space-y-3">
            {intelligence.history.map((entry) => (
              <li key={`${entry.label}-${entry.score}`}>
                <p className="text-sm font-medium">
                  {entry.score} — {entry.label}
                </p>
                <p className="text-sm text-foreground-muted">{entry.reason}</p>
              </li>
            ))}
          </ol>
        </Card>
      ) : null}
      <Card>
        <CardTitle className="mb-1">Why this score?</CardTitle>
        <p className="mb-4 text-sm text-foreground-muted">
          Machine signals and human review signals are listed separately. Click a factor to inspect the underlying evidence.
        </p>
        {intelligence.factors.length === 0 ? (
          <p className="text-sm text-foreground-muted">No attention-triggering conditions on this bid. That means low review priority, not a trusted-bidder score.</p>
        ) : (
          <ul className="space-y-3">
            {intelligence.factors.map((factor) => (
              <li key={factor.id}>
                <FactorRow bidId={bidId} factor={factor} maxPoints={maxPoints} />
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 text-sm font-medium">
          Current total {intelligence.score}
          {intelligence.unadjustedScore !== intelligence.score
            ? ` · before officer adjustments ${intelligence.unadjustedScore}`
            : ''}
        </p>
      </Card>
    </div>
  );
}

function FactorRow({
  bidId,
  factor,
  maxPoints,
}: {
  bidId: string;
  factor: AttentionFactor;
  maxPoints: number;
}) {
  const width = `${Math.max(8, (factor.originalPoints / maxPoints) * 100)}%`;
  return (
    <Link
      to={attentionFactorHref(bidId, factor)}
      className="block rounded-md border border-edge p-3 hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      aria-label={`${factor.source.label}: ${factor.originLabel}, ${factor.currentPoints} current points`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">{factor.source.label}</p>
        <div className="flex items-center gap-2">
          <Badge tone={factor.origin === 'machine' ? 'info' : 'accent'}>{factor.originLabel}</Badge>
          <span className="text-sm tabular-nums">
            {factor.currentPoints === factor.originalPoints
              ? `+${factor.currentPoints}`
              : `+${factor.originalPoints} → ${factor.currentPoints}`}
          </span>
        </div>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded bg-edge" aria-hidden="true">
        <div className="h-full rounded bg-accent" style={{ width }} />
      </div>
      <p className="mt-2 text-sm text-foreground-muted">{factor.description}</p>
      {factor.adjustmentReason ? (
        <p className="mt-1 text-xs text-foreground-muted">{factor.adjustmentReason}</p>
      ) : null}
    </Link>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <p className="text-xs uppercase tracking-wide text-foreground-muted">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </Card>
  );
}

function coverageLabel(value: number | null): string {
  return value === null ? '—' : `${value}%`;
}
