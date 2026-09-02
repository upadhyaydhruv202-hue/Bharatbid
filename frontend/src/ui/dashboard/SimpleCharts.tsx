import { EmptyState } from '../states/FeedbackStates';

export interface ChartDatum {
  label: string;
  value: number;
}

const CHART_WIDTH = 360;
const CHART_HEIGHT = 180;
const PAD = { top: 12, right: 12, bottom: 36, left: 36 };

function bounds(data: ChartDatum[]) {
  const max = Math.max(...data.map((item) => item.value), 1);
  const innerWidth = CHART_WIDTH - PAD.left - PAD.right;
  const innerHeight = CHART_HEIGHT - PAD.top - PAD.bottom;
  return { max, innerWidth, innerHeight };
}

function normalize(data: ChartDatum[]): ChartDatum[] {
  return data.map((item, index) => ({
    label: item.label || `Item ${index + 1}`,
    value: Number.isFinite(item.value) ? Math.max(0, item.value) : 0,
  }));
}

export function SimpleBarChart({ data, unit, title = 'Bar chart' }: { data: ChartDatum[]; unit?: string; title?: string }) {
  const series = normalize(data);
  if (series.length === 0) {
    return <EmptyState title="No chart data" className="border-0 px-0 py-6" />;
  }

  const { max, innerWidth, innerHeight } = bounds(series);
  const barWidth = innerWidth / series.length;
  const gap = Math.min(12, barWidth * 0.25);

  return (
    <svg
      role="img"
      aria-label={title}
      viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
      className="h-44 w-full text-accent"
    >
      <title>{title}</title>
      {series.map((item, index) => {
        const height = (item.value / max) * innerHeight;
        const x = PAD.left + index * barWidth + gap / 2;
        const y = PAD.top + innerHeight - height;
        const width = Math.max(4, barWidth - gap);
        return (
          <g key={`${item.label}-${index}`}>
            <rect x={x} y={y} width={width} height={height} rx={4} className="fill-current" />
            <text
              x={x + width / 2}
              y={CHART_HEIGHT - 12}
              textAnchor="middle"
              className="fill-foreground-muted text-[10px]"
            >
              {item.label}
            </text>
            <text
              x={x + width / 2}
              y={y - 4}
              textAnchor="middle"
              className="fill-foreground text-[10px]"
            >
              {item.value}
              {unit ? ` ${unit}` : ''}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
