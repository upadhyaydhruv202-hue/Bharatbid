import { Router, type RequestHandler } from 'express';

import type { ApiInfoController } from '../controllers/api-info.controller';
import type { AuditController } from '../controllers/audit.controller';
import type { AuthController } from '../controllers/auth.controller';
import type { FeaturesController } from '../controllers/features.controller';
import type { AiController } from '../controllers/ai.controller';
import type { DocumentController } from '../controllers/document.controller';
import type { BharatBidController } from '../controllers/bharatbid.controller';
import type { JobController } from '../controllers/job.controller';
import type { NotificationController } from '../controllers/notification.controller';
import type { PdfController } from '../controllers/pdf.controller';
import type { ReportController } from '../controllers/report.controller';
import type { RbacController } from '../controllers/rbac.controller';
import type { StorageController } from '../controllers/storage.controller';
import type { SecurityRateLimits } from '../security';
import { createAiRouter } from './ai.routes';
import { createAuditRouter } from './audit.routes';
import { createAuthRouter } from './auth.routes';
import { createDocumentRouter } from './document.routes';
import { createFeaturesRouter } from './features.routes';
import { createBharatBidRouter } from './bharatbid.routes';
import { createJobRouter } from './job.routes';
import { createNotificationRouter } from './notification.routes';
import { createPdfRouter } from './pdf.routes';
import { createReportRouter } from './report.routes';
import { createRbacRouter } from './rbac.routes';
import { createStorageRouter } from './storage.routes';

export function createV1Router(options: {
  apiInfoController: ApiInfoController;
  authController: AuthController;
  auditController: AuditController;
  rbacController: RbacController;
  aiController: AiController;
  documentController: DocumentController;
  notificationController: NotificationController;
  pdfController: PdfController;
  reportController: ReportController;
  storageController: StorageController;
  featuresController: FeaturesController;
  jobController: JobController;
  bharatBidController: BharatBidController;
  authenticate: RequestHandler;
  authenticateAi: RequestHandler;
  authenticateAdmin: RequestHandler;
  loginRateLimit: RequestHandler;
  otpRateLimit: RequestHandler;
  passwordResetRateLimit: RequestHandler;
  rateLimits: SecurityRateLimits;
  documentMaxBytes?: number;
  storageMaxBytes?: number;
}): Router {
  const router = Router();
  router.get('/', options.rateLimits.publicApi, options.apiInfoController.getInfo);
  router.use(
    createFeaturesRouter({
      controller: options.featuresController,
      publicRateLimit: options.rateLimits.publicApi,
    }),
  );
  router.use(
    '/auth',
    createAuthRouter({
      controller: options.authController,
      authenticate: options.authenticate,
      loginRateLimit: options.loginRateLimit,
      otpRateLimit: options.otpRateLimit,
      passwordResetRateLimit: options.passwordResetRateLimit,
      publicRateLimit: options.rateLimits.publicApi,
      authenticationRateLimit: options.rateLimits.authentication,
    }),
  );
  router.use(
    createRbacRouter({
      controller: options.rbacController,
      authenticate: options.authenticateAdmin,
    }),
  );
  router.use(
    createAuditRouter({
      controller: options.auditController,
      authenticate: options.authenticateAdmin,
    }),
  );
  router.use(
    createAiRouter({
      controller: options.aiController,
      authenticate: options.authenticateAi,
    }),
  );
  router.use(
    createDocumentRouter({
      controller: options.documentController,
      authenticate: options.authenticate,
      uploadRateLimit: options.rateLimits.fileUpload,
      maxBytes: options.documentMaxBytes,
    }),
  );
  router.use(
    createNotificationRouter({
      controller: options.notificationController,
      authenticate: options.authenticate,
    }),
  );
  router.use(
    createPdfRouter({
      controller: options.pdfController,
      authenticate: options.authenticate,
    }),
  );
  router.use(
    createReportRouter({
      controller: options.reportController,
      authenticate: options.authenticate,
    }),
  );
  router.use(
    createStorageRouter({
      controller: options.storageController,
      authenticate: options.authenticate,
      uploadRateLimit: options.rateLimits.fileUpload,
      maxBytes: options.storageMaxBytes,
    }),
  );
  router.use(
    createJobRouter({
      controller: options.jobController,
      authenticate: options.authenticate,
    }),
  );
  router.use(
    createBharatBidRouter({
      controller: options.bharatBidController,
      authenticate: options.authenticate,
      documentMaxBytes: options.documentMaxBytes,
    }),
  );
  return router;
}
