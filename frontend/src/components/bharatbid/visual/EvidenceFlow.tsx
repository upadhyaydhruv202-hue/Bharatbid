export function EvidenceFlow({
  available,
  missing,
  processing,
  conflicts,
  reviewRequired,
}: {
  available: number;
  missing: number;
  processing: number;
  conflicts: number;
  reviewRequired: number;
}) {
  const steps = [
    { label: 'Available', value: available },
    { label: 'Missing', value: missing },
    { label: 'Processing', value: processing, live: processing > 0 },
    { label: 'Conflict', value: conflicts },
    { label: 'Review Required', value: reviewRequired },
  ];

  return (
    <div className="mt-4">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground-muted">
        Documents → Extraction → Evidence → Requirement → Review
      </p>
      <ol className="flex flex-wrap items-center gap-2 text-[11px]">
        {steps.map((step, index) => (
          <li key={step.label} className="flex items-center gap-2">
            <span className="rounded-full border border-edge bg-surface-elevated px-2.5 py-1 shadow-sm">
              <span className="font-semibold text-foreground">{step.label}</span>
              <span className={`ml-1 text-foreground-muted ${step.live ? 'bb-pulse-soft' : ''}`}>{step.value}</span>
            </span>
            {index < steps.length - 1 ? (
              <span className="text-info/60" aria-hidden>
                →
              </span>
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  );
}
