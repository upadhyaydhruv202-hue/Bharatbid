import type { ReactNode } from 'react';

import { Card, CardHeader, CardTitle } from '../primitives/Card';
import { EmptyState } from '../states/FeedbackStates';

export interface ActivityItem {
  id: string;
  title: string;
  description?: ReactNode;
  timestamp?: string;
  meta?: ReactNode;
}

export function ActivityFeed({
  title = 'Recent activity',
  items,
  emptyTitle = 'No activity yet',
}: {
  title?: string;
  items: ActivityItem[];
  emptyTitle?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      {items.length === 0 ? (
        <EmptyState title={emptyTitle} className="border-0 px-0 py-6" />
      ) : (
        <ol className="relative space-y-3 before:absolute before:bottom-2 before:left-[5px] before:top-2 before:w-px before:bg-edge">
          {items.map((item) => (
            <li key={item.id} className="relative border-b border-edge pb-3 pl-5 last:border-0 last:pb-0">
              <span className="absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full border border-info/50 bg-info/80" aria-hidden />
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{item.title}</p>
                  {item.description ? <p className="mt-1 text-sm text-foreground-muted">{item.description}</p> : null}
                  {item.meta ? <p className="mt-1 text-xs text-foreground-muted">{item.meta}</p> : null}
                </div>
                {item.timestamp ? <time className="shrink-0 text-xs text-foreground-muted">{item.timestamp}</time> : null}
              </div>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
