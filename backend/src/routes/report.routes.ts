import { Router, type RequestHandler } from 'express';

import type { ReportController } from '../controllers/report.controller';
import { PERMISSIONS } from '../rbac/catalog';
import { requirePermission } from '../rbac/middleware';

export function createReportRouter(options: {
  controller: ReportController;
  authenticate: RequestHandler;
}): Router {
  const router = Router();
  router.get(
    '/reports/types',
    options.authenticate,
    requirePermission(PERMISSIONS.REPORTS_GENERATE),
    options.controller.listTypes,
  );
  router.post(
    '/reports/generate',
    options.authenticate,
    requirePermission(PERMISSIONS.REPORTS_GENERATE),
    options.controller.generate,
  );
  return router;
}
