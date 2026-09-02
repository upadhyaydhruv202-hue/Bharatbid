import { cn } from '../../../ui/cn';

export function BrandMark({ className, size = 28 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={cn('shrink-0 text-info', className)}
      aria-hidden
    >
      <rect x="1.5" y="1.5" width="29" height="29" rx="8" fill="none" className="stroke-edge" strokeWidth="1" />
      <circle cx="8" cy="8" r="1.6" className="fill-info bb-pulse-soft" />
      <circle cx="24" cy="10" r="1.4" className="fill-current" />
      <circle cx="10" cy="23" r="1.4" className="fill-current" />
      <circle cx="22" cy="23" r="1.5" className="fill-info" />
      <path
        d="M8 8 L16 14 L24 10 M16 14 L10 23 M16 14 L22 23"
        fill="none"
        className="stroke-info/70"
        strokeWidth="1.2"
      />
      <text x="16" y="18.5" textAnchor="middle" className="fill-foreground" fontSize="9" fontWeight="700">
        B
      </text>
    </svg>
  );
}
