import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { SessionGate } from '../../auth/SessionGate';
import { useAuth } from '../../auth/AuthProvider';
import { NotificationList } from '../../components/NotificationList';
import { getApiErrorMessage } from '../../services/api';
import {
  getUnreadCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../../services/notifications';
import { Alert, Breadcrumb, Button, PageContainer } from '../../ui';

export function BharatBidNotificationsPage() {
  const { accessToken } = useAuth();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<Awaited<ReturnType<typeof listNotifications>>['items']>([]);

  async function refresh(token: string) {
    setLoading(true);
    setError(undefined);
    try {
      const [list, count] = await Promise.all([listNotifications(token), getUnreadCount(token)]);
      setItems(list.items);
      setUnread(count.count);
    } catch (caught) {
      setError(getApiErrorMessage(caught, 'Unable to load notifications.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (accessToken) {
      void refresh(accessToken);
    }
  }, [accessToken]);

  return (
    <PageContainer
      breadcrumb={
        <Breadcrumb items={[{ label: 'Command Center', to: '/bharatbid' }, { label: 'Notifications' }]} />
      }
      title="Notification center"
      description="In-app procurement notices. DEMO / SYNTHETIC events are labelled. This reuses the existing notification inbox."
      actions={
        <Button
          variant="outline"
          disabled={loading || unread === 0 || !accessToken}
          onClick={() =>
            accessToken &&
            void markAllNotificationsRead(accessToken).then(() => refresh(accessToken))
          }
        >
          Mark all read
        </Button>
      }
    >
      <SessionGate>
        {error ? (
          <Alert variant="error" title="Unable to load notifications" className="mb-6">
            {error}
          </Alert>
        ) : null}
        <NotificationList
          items={items}
          emptyLabel="No procurement notifications yet."
          onRead={(id) => accessToken && void markNotificationRead(id, accessToken).then(() => refresh(accessToken))}
        />
        <p className="mt-6 text-sm">
          <Link className="underline" to="/notifications">
            Open platform notification preferences
          </Link>
        </p>
      </SessionGate>
    </PageContainer>
  );
}
