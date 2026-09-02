import { apiGet, apiRequest } from './api';
import type { NotificationItem } from '../components/NotificationList';
import type { NotificationPreference } from '../components/NotificationPreferences';

export interface NotificationListResult {
  items: NotificationItem[];
}

export interface NotificationPreferenceResult {
  categories: string[];
  channels: string[];
  mandatoryCategories: string[];
  preferences: NotificationPreference[];
}

export function listNotifications(token: string, query: { unreadOnly?: boolean } = {}) {
  const search = query.unreadOnly ? '?unreadOnly=true' : '';
  return apiGet<NotificationListResult>(`/api/v1/notifications${search}`, token);
}

export function getUnreadCount(token: string) {
  return apiGet<{ count: number }>('/api/v1/notifications/unread-count', token);
}

export function markNotificationRead(id: string, token: string) {
  return apiRequest<NotificationItem>(`/api/v1/notifications/${id}/read`, { method: 'POST', token });
}

export function markAllNotificationsRead(token: string) {
  return apiRequest<{ count: number }>('/api/v1/notifications/read-all', { method: 'POST', token });
}

export function getNotificationPreferences(token: string) {
  return apiGet<NotificationPreferenceResult>('/api/v1/notifications/preferences', token);
}

export function updateNotificationPreferences(preferences: NotificationPreference[], token: string) {
  return apiRequest<NotificationPreferenceResult>('/api/v1/notifications/preferences', {
    method: 'PUT',
    token,
    body: { preferences },
  });
}
