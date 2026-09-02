export function VerificationGraph({
  sources,
}: {
  sources: Array<{ source: string; sourceMode?: string }>;
}) {
  if (sources.length === 0) {
    return null;
  }
  const unique = Array.from(new Map(sources.map((item) => [item.source.toUpperCase(), item])).values());
  const width = 280;
  const height = 140;
  const cx = width / 2;
  const cy = height / 2 + 8;
  const radius = 46;
  const points = unique.slice(0, 3).map((item, index) => {
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / Math.min(unique.length, 3);
    return {
      ...item,
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius,
    };
  });

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="mx-auto h-36 w-full max-w-xs text-info" role="img" aria-label="DEMO SOURCE verification graph">
      <title>DEMO SOURCE verification relationships</title>
      <text x={cx} y={16} textAnchor="middle" className="fill-warning text-[9px] font-semibold">
        DEMO SOURCE
      </text>
      {points.map((point, index) => {
        const next = points[(index + 1) % points.length];
        if (!next || points.length < 2) {
          return null;
        }
        return (
          <line
            key={`${point.source}-${next.source}`}
            x1={point.x}
            y1={point.y}
            x2={next.x}
            y2={next.y}
            className="bb-flow stroke-info/40"
            strokeWidth="1.2"
          />
        );
      })}
      <circle cx={cx} cy={cy} r="10" className="fill-surface-elevated stroke-info/70" strokeWidth="1.4" />
      <text x={cx} y={cy + 3} textAnchor="middle" className="fill-foreground text-[8px] font-semibold">
        BID
      </text>
      {points.map((point) => (
        <g key={point.source}>
          <circle cx={point.x} cy={point.y} r="11" className="fill-surface-elevated stroke-info/60" strokeWidth="1.4" />
          <circle cx={point.x} cy={point.y} r="3" className="fill-info bb-pulse-soft" />
          <text x={point.x} y={point.y - 16} textAnchor="middle" className="fill-foreground text-[9px] font-semibold">
            {point.source.toUpperCase()}
          </text>
        </g>
      ))}
    </svg>
  );
}
