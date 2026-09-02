import { Router, type RequestHandler } from 'express';

import type { StorageController } from '../controllers/storage.controller';
import { createFileUploadMiddleware } from '../middleware/file-upload';
import { PERMISSIONS } from '../rbac/catalog';
import { requirePermission } from '../rbac/middleware';

export function createStorageRouter(options: {
  controller: StorageController;
  authenticate: RequestHandler;
  uploadRateLimit?: RequestHandler;
  maxBytes?: number;
}): Router {
  const router = Router();
  const upload = createFileUploadMiddleware(options.maxBytes);

  router.get('/storage/download', options.controller.download);
  router.post(
    '/files',
    options.authenticate,
    requirePermission(PERMISSIONS.FILES_WRITE),
    ...(options.uploadRateLimit ? [options.uploadRateLimit] : []),
    upload,
    options.controller.upload,
  );
  router.get(
    '/files/:id',
    options.authenticate,
    requirePermission(PERMISSIONS.FILES_READ),
    options.controller.getById,
  );
  router.get(
    '/files/:id/content',
    options.authenticate,
    requirePermission(PERMISSIONS.FILES_READ),
    options.controller.downloadContent,
  );
  router.post(
    '/files/:id/url',
    options.authenticate,
    requirePermission(PERMISSIONS.FILES_READ),
    options.controller.signedUrl,
  );
  router.delete(
    '/files/:id',
    options.authenticate,
    requirePermission(PERMISSIONS.FILES_WRITE),
    options.controller.remove,
  );

  return router;
}
