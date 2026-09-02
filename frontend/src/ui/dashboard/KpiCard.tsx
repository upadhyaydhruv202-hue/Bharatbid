import type { ReactNode } from 'react';

import { cn } from '../cn';
import { Card, CardDescription, CardHeader } from '../primitives/Card';
import { Skeleton } from '../primitives/Skeleton';

export interface KpiCardProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  delta?: { label: string; trend?: 'up' | 'down' | 'flat' };
  loading?: boolean;
  interactive?: boolean;
  className?: string;
}

export function KpiCard({ label, value, hint, delta, loading, interactive, className }: KpiCardProps) {
  return (
    <Card className={cn(interactive && 'transition-colors hover:border-accent/30', className)}>
      <CardHeader className="mb-2">
        <CardDescription className="uppercase tracking-wide">{label}</CardDescription>
      </CardHeader>
      {loading ? (
        <Skeleton className="h-8 w-24" />
      ) : (
        <p className="text-2xl font-semibold tracking-tight text-foreground">{value}</p>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
        {delta ? (
          <span
            className={cn(
              delta.trend === 'down' && 'text-danger',
              delta.trend === 'up' && 'text-success',
              (!delta.trend || delta.trend === 'flat') && 'text-foreground-muted',
            )}
          >
            {delta.label}
          </span>
        ) : null}
        {hint ? <span className="text-foreground-muted">{hint}</span> : null}
      </div>
    </Card>
  );
}
