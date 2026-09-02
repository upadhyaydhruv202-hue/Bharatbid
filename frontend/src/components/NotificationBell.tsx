import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { NotificationList, type NotificationItem } from './NotificationList';

export function NotificationBell({
  items,
  unreadCount,
  onRead,
  onReadAll,
  inboxHref = '/bharatbid/notifications',
}: {
  items: NotificationItem[];
  unreadCount: number;
  onRead?: (id: string) => void;
  onReadAll?: () => void;
  inboxHref?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const label = unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications';

  useEffect(() => {
    if (!open) {
      return;
    }
    function onPointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        className="relative rounded-lg border border-edge bg-surface-elevated px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-info"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((current) => !current)}
      >
        Notifications
        {unreadCount > 0 ? (
          <span className="ml-2 inline-flex min-w-5 items-center justify-center rounded-full bg-info px-1.5 text-[10px] font-semibold text-white">
            {unreadCount}
            <span className="sr-only"> unread</span>
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="absolute right-0 z-20 mt-2 w-80 rounded-xl border border-edge bg-surface-elevated p-3 shadow-lg">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">Inbox</p>
            {onReadAll && unreadCount > 0 ? (
              <button type="button" className="text-xs text-info hover:underline" onClick={onReadAll}>
                Mark all read
              </button>
            ) : null}
          </div>
          <NotificationList items={items} onRead={onRead} emptyLabel="No notifications yet" />
          <Link
            className="mt-2 inline-block text-xs underline"
            to={inboxHref}
            onClick={() => setOpen(false)}
          >
            Open notification center
          </Link>
        </div>
      ) : null}
    </div>
  );
}
