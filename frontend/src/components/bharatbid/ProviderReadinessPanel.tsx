import { Badge } from '../../ui';
import type { ProviderCatalogEntry } from '../../services/bharatbid';

function toneFor(status: string): 'success' | 'info' | 'warning' | 'neutral' {
  if (status === 'SANDBOX') return 'info';
  if (status === 'DEMO') return 'warning';
  if (status === 'READY_FOR_CREDENTIALS') return 'warning';
  return 'neutral';
}

export function ProviderReadinessPanel({ items }: { items: ProviderCatalogEntry[] }) {
  if (items.length === 0) {
    return null;
  }
  return (
    <div>
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-foreground-muted">
        Provider readiness
      </p>
      <ul className="grid gap-2 sm:grid-cols-2">
        {items.map((item) => (
          <li key={item.source} className="rounded-md border border-edge px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-foreground">{item.module}</span>
              <Badge tone={toneFor(item.status)}>{item.status.replaceAll('_', ' ')}</Badge>
            </div>
            <p className="mt-1 text-xs text-foreground-muted">{item.advisory}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
