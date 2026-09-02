export function AttentionBandGauge({
  high,
  moderate,
  low,
  requiringAttention,
}: {
  high: number;
  moderate: number;
  low: number;
  requiringAttention: number;
}) {
  const total = high + moderate + low;
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const segments = [
    { value: high, className: 'stroke-warning', label: 'High' },
    { value: moderate, className: 'stroke-info', label: 'Moderate' },
    { value: low, className: 'stroke-success/70', label: 'Low' },
  ];

  let offset = 0;
  const arcs = segments.map((segment) => {
    const length = total === 0 ? 0 : (segment.value / total) * circumference;
    const item = { ...segment, dash: length, gap: circumference - length, offset };
    offset += length;
    return item;
  });

  return (
    <div className="flex items-center gap-4">
      <svg
        viewBox="0 0 120 120"
        className="h-28 w-28"
        role="img"
        aria-label={`Officer Review Priority. ${requiringAttention} bids requiring attention. High ${high}, moderate ${moderate}, low ${low}.`}
      >
        <title>Officer Review Priority bands</title>
        <circle cx="60" cy="60" r={radius} fill="none" className="stroke-edge" strokeWidth="8" />
        {arcs.map((arc) =>
          arc.dash > 0 ? (
            <circle
              key={arc.label}
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              className={arc.className}
              strokeWidth="8"
              strokeDasharray={`${arc.dash} ${arc.gap}`}
              strokeDashoffset={-arc.offset}
              strokeLinecap="butt"
              transform="rotate(-90 60 60)"
            />
          ) : null,
        )}
        <text x="60" y="56" textAnchor="middle" className="fill-foreground text-xl font-semibold">
          {requiringAttention}
        </text>
        <text x="60" y="74" textAnchor="middle" className="fill-foreground-muted text-[9px]">
          ATTENTION
        </text>
      </svg>
      <ul className="space-y-1 text-xs text-foreground-muted">
        <li>High {high}</li>
        <li>Moderate {moderate}</li>
        <li>Low {low}</li>
      </ul>
    </div>
  );
}
