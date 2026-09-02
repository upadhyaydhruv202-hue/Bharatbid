import { useEffect, useState } from 'react';

import { SessionGate } from '../auth/SessionGate';
import { useAuth } from '../auth/AuthProvider';
import { NotificationBell } from '../components/NotificationBell';
import { NotificationList, type NotificationItem } from '../components/NotificationList';
import { NotificationPreferences, type NotificationPreference } from '../components/NotificationPreferences';
import { getApiErrorMessage } from '../services/api';
import {
  getNotificationPreferences,
  getUnreadCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  updateNotificationPreferences,
} from '../services/notifications';
import { Alert, Breadcrumb, Button, PageContainer } from '../ui';

export function NotificationsPage() {
  const { accessToken } = useAuth();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const [mandatoryCategories, setMandatoryCategories] = useState<string[]>(['security_alerts']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  async function withToken<T>(run: (token: string) => Promise<T>): Promise<T | undefined> {
    if (!accessToken) {
      setError('Sign in to continue.');
      return undefined;
    }
    setLoading(true);
    setError(undefined);
    try {
      return await run(accessToken);
    } catch (caught) {
      setError(toErrorMessage(caught));
      return undefined;
    } finally {
      setLoading(false);
    }
  }

  async function refresh(accessToken: string) {
    const [list, unread, prefs] = await Promise.all([
      listNotifications(accessToken),
      getUnreadCount(accessToken),
      getNotificationPreferences(accessToken),
    ]);
    setItems(list.items);
    setUnreadCount(unread.count);
    setPreferences(prefs.preferences);
    setMandatoryCategories(prefs.mandatoryCategories);
  }

  useEffect(() => {
    if (accessToken) {
      void withToken(refresh);
    }
  }, [accessToken]);

  return (
    <PageContainer
      breadcrumb={<Breadcrumb items={[{ label: 'Command Center', to: '/bharatbid' }, { label: 'Notifications' }]} />}
      title="Notification preferences"
      description="In-app history, unread state, and channel preferences for this demonstration account. Delivery adapters are not live production channels."
      actions={
        <NotificationBell
          items={items.slice(0, 5)}
          unreadCount={unreadCount}
          onRead={(id) => void withToken(async (accessToken) => {
            await markNotificationRead(id, accessToken);
            await refresh(accessToken);
          })}
          onReadAll={() => void withToken(async (accessToken) => {
            await markAllNotificationsRead(accessToken);
            await refresh(accessToken);
          })}
        />
      }
    >
      <SessionGate title="Sign in to view notifications">
      <div className="mb-6 flex flex-wrap gap-2">
        <Button disabled={loading} onClick={() => void withToken(refresh)}>
          Refresh inbox
        </Button>
        <Button
          variant="outline"
          disabled={loading}
          onClick={() => void withToken(async (accessToken) => {
            await markAllNotificationsRead(accessToken);
            await refresh(accessToken);
          })}
        >
          Mark all read
        </Button>
      </div>

      {error ? (
        <Alert variant="error" title="Request failed" className="mb-6">
          {error}
        </Alert>
      ) : null}

      <NotificationList
        items={items}
        onRead={(id) => void withToken(async (accessToken) => {
          await markNotificationRead(id, accessToken);
          await refresh(accessToken);
        })}
      />

      <section className="mt-8 space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Preferences</h2>
        <NotificationPreferences
          preferences={preferences}
          mandatoryCategories={mandatoryCategories}
          onChange={(preference) =>
            void withToken(async (accessToken) => {
              await updateNotificationPreferences([preference], accessToken);
              await refresh(accessToken);
            })
          }
        />
      </section>
      </SessionGate>
    </PageContainer>
  );
}

function toErrorMessage(error: unknown): string {
  return getApiErrorMessage(error, 'Unable to reach the API');
}
