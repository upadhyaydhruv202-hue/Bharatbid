import { cn } from '../../../ui/cn';

export function LiveStatusIndicator({
  label = 'SYSTEM OPERATIONAL',
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <p className={cn('inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-success', className)}>
      <span className="relative inline-flex h-2 w-2" aria-hidden>
        <span className="bb-pulse-soft absolute inset-0 rounded-full bg-success/40" />
        <span className="relative h-2 w-2 rounded-full bg-success" />
      </span>
      {label}
    </p>
  );
}
