import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { useAuth } from './AuthProvider';
import { NotificationBell } from '../components/NotificationBell';
import { hasPermission } from '../lib/rbac';
import { roleLabel } from '../lib/roles';
import {
  getUnreadCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../services/notifications';
import { Button } from '../ui';

export function AuthStatus() {
  const { user, isAuthenticated, logout, pending, accessToken } = useAuth();
  const canReadNotifications = hasPermission(user, 'notifications.read');
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<Awaited<ReturnType<typeof listNotifications>>['items']>([]);

  useEffect(() => {
    if (!accessToken || !canReadNotifications) {
      return;
    }
    void Promise.all([listNotifications(accessToken, { unreadOnly: true }), getUnreadCount(accessToken)])
      .then(([list, count]) => {
        setItems(list.items.slice(0, 5));
        setUnread(count.count);
      })
      .catch(() => {
        setItems([]);
        setUnread(0);
      });
  }, [accessToken, canReadNotifications]);

  if (!isAuthenticated) {
    return (
      <Link
        to="/login"
        className="rounded-lg px-2 py-1 text-xs font-medium text-foreground hover:bg-surface-muted"
      >
        Sign in
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {canReadNotifications && accessToken ? (
        <NotificationBell
          items={items}
          unreadCount={unread}
          onRead={(id) =>
            void markNotificationRead(id, accessToken).then(() =>
              Promise.all([listNotifications(accessToken, { unreadOnly: true }), getUnreadCount(accessToken)]).then(
                ([list, count]) => {
                  setItems(list.items.slice(0, 5));
                  setUnread(count.count);
                },
              ),
            )
          }
          onReadAll={() =>
            void markAllNotificationsRead(accessToken).then(() => {
              setItems([]);
              setUnread(0);
            })
          }
        />
      ) : null}
      <span className="hidden max-w-[12rem] truncate text-xs text-foreground-muted sm:inline">
        {user?.displayName ?? user?.email}
        <span className="mt-0.5 block text-[10px] uppercase tracking-wide">{roleLabel(user)}</span>
      </span>
      <Button variant="ghost" size="sm" loading={pending} onClick={() => void logout()}>
        Sign out
      </Button>
    </div>
  );
}
