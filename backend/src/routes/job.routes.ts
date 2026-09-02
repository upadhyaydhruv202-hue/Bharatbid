import { Router, type RequestHandler } from 'express';

import type { JobController } from '../controllers/job.controller';
import { PERMISSIONS } from '../rbac/catalog';
import { requirePermission } from '../rbac/middleware';

export function createJobRouter(options: {
  controller: JobController;
  authenticate: RequestHandler;
}): Router {
  const router = Router();
  router.get(
    '/jobs/:jobId',
    options.authenticate,
    requirePermission(PERMISSIONS.JOBS_READ),
    options.controller.getById,
  );
  return router;
}
