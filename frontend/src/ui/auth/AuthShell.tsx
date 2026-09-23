import type { ReactNode } from 'react';

import { ProcurementDepthVisual } from './ProcurementDepthVisual';

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="bb-auth-shell grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
      <div className="hidden lg:block">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground-muted">BharatBid AI</p>
        <h1 className="mt-3 max-w-xl text-3xl font-semibold tracking-tight text-foreground">
          Secure Procurement Compliance Platform
        </h1>
        <p className="mt-4 max-w-lg text-sm leading-6 text-foreground-muted">
          Organize tender evidence, verification, and officer review in one workspace. BharatBid is an independent
          procurement compliance product. It is not a Government of India service and does not award or reject bids.
        </p>
        <ProcurementDepthVisual className="mt-10" />
      </div>
      <div className="mx-auto w-full max-w-md lg:mx-0">{children}</div>
    </div>
  );
}
