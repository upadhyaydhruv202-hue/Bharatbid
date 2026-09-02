import { Router, type RequestHandler } from 'express';

import type { NotificationController } from '../controllers/notification.controller';
import { PERMISSIONS } from '../rbac/catalog';
import { requirePermission } from '../rbac/middleware';

export function createNotificationRouter(options: {
  controller: NotificationController;
  authenticate: RequestHandler;
}): Router {
  const router = Router();
  const read = [options.authenticate, requirePermission(PERMISSIONS.NOTIFICATIONS_READ)];
  const write = [options.authenticate, requirePermission(PERMISSIONS.NOTIFICATIONS_WRITE)];

  router.get('/notifications', ...read, options.controller.list);
  router.get('/notifications/unread-count', ...read, options.controller.unreadCount);
  router.get('/notifications/preferences', ...read, options.controller.getPreferences);
  router.put('/notifications/preferences', ...read, options.controller.updatePreferences);
  router.get('/notifications/deliveries/:id', ...write, options.controller.getDelivery);
  router.post('/notifications/send', ...write, options.controller.send);
  router.post('/notifications', ...write, options.controller.create);
  router.post('/notifications/read-all', ...read, options.controller.markAllRead);
  router.post('/notifications/:id/read', ...read, options.controller.markRead);

  return router;
}
