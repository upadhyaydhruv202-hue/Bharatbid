import { cn } from '../../../ui/cn';

export type NetworkVariant = 'login' | 'command';

export function ProcurementNetwork({
  variant = 'command',
  className,
}: {
  variant?: NetworkVariant;
  className?: string;
}) {
  const login = variant === 'login';
  return (
    <svg
      viewBox="0 0 640 360"
      className={cn('h-auto w-full text-info', className)}
      role="img"
      aria-label="Procurement flow: Tender, Bid, Evidence, Verification, Officer Review, Evaluation"
    >
      <title>Procurement intelligence network</title>
      <g fill="none" className="stroke-info/40" strokeWidth="1.25">
        <path className="bb-flow" d="M320 28 L180 92 M320 28 L320 92 M320 28 L460 92" />
        <path className="bb-flow" d="M180 92 L320 148 M320 92 L320 148 M460 92 L320 148" />
        <path className="bb-flow" d="M320 148 L240 198 M320 148 L400 198" />
        <path className="bb-flow" d="M240 198 L320 248 M400 198 L320 248" />
        <path className="bb-flow" d="M320 248 L320 304" />
      </g>
      <NetworkNode x={320} y={28} label="Tender" delay="0s" />
      <NetworkNode x={180} y={92} label="Bid" delay="0.4s" />
      <NetworkNode x={320} y={92} label="Bid" delay="0.7s" />
      <NetworkNode x={460} y={92} label="Bid" delay="1s" />
      <NetworkNode x={320} y={148} label="Evidence" delay="0.3s" />
      <NetworkNode x={240} y={198} label="GST" sub="DEMO SOURCE" delay="0.9s" />
      <NetworkNode x={400} y={198} label="MCA" sub="DEMO SOURCE" delay="1.2s" />
      <NetworkNode x={320} y={248} label={login ? 'Cross-check' : 'Review'} delay="0.5s" />
      <NetworkNode x={320} y={304} label="Evaluation" delay="0.2s" />
    </svg>
  );
}

function NetworkNode({
  x,
  y,
  label,
  sub,
  delay,
}: {
  x: number;
  y: number;
  label: string;
  sub?: string;
  delay: string;
}) {
  return (
    <g className="bb-float" style={{ animationDelay: delay }}>
      <circle cx={x} cy={y} r="11" className="fill-surface-elevated stroke-info/60" strokeWidth="1.5" />
      <circle cx={x} cy={y} r="3.5" className="fill-info bb-pulse-soft" />
      <text x={x} y={y - 16} textAnchor="middle" className="fill-foreground text-[10px] font-semibold">
        {label}
      </text>
      {sub ? (
        <text x={x} y={y + 22} textAnchor="middle" className="fill-warning text-[8px] font-semibold">
          {sub}
        </text>
      ) : null}
    </g>
  );
}
