import type { PrismaClient } from '@prisma/client';
import cors from 'cors';
import express, { type Application, type Express } from 'express';
import helmet from 'helmet';

import { authenticate as createAuthenticate } from './auth/authenticate';
import { createTokenServiceFromConfig } from './auth/jwt';
import { TokenRevocationStore } from './auth/token-revocation';
import { createLoginRateLimit } from './auth/login-rate-limit';
import { createPasswordResetRateLimit } from './auth/password-reset-rate-limit';
import { PasswordService } from './auth/password';
import { AuditService } from './audit';
import { API_PREFIX } from './constants';
import { AiController } from './controllers/ai.controller';
import { ApiInfoController } from './controllers/api-info.controller';
import { AuditController } from './controllers/audit.controller';
import { AuthController } from './controllers/auth.controller';
import { DocumentController } from './controllers/document.controller';
import { FeaturesController } from './controllers/features.controller';
import { HealthController } from './controllers/health.controller';
import { NotificationController } from './controllers/notification.controller';
import { JobController } from './controllers/job.controller';
import { PdfController } from './controllers/pdf.controller';
import { ReportController } from './controllers/report.controller';
import { RbacController } from './controllers/rbac.controller';
import { StorageController } from './controllers/storage.controller';
import { BharatBidController } from './controllers/bharatbid.controller';
import { BidderService } from './problem/bidder.service';
import { BidSubmissionService } from './problem/bid.service';
import { BidDocumentService } from './problem/bid-document.service';
import { BidVerificationService } from './problem/verification.service';
import { BidIntelligenceService } from './problem/intelligence.service';
import { BidReviewService } from './problem/review.service';
import { BidAttentionService } from './problem/attention.service';
import { BidEvaluationService } from './problem/evaluation.service';
import { BidOperationsService } from './problem/operations.service';
import { TenderService } from './problem/tender.service';
import { VerificationAdapterRegistry } from './problem/verification/registry';
import { createAiService, isAiEnabled, type AIService } from './integrations/ai';
import {
  createDocumentIntelligenceService,
  type DocumentIntelligenceService,
} from './integrations/documents';
import { createEmailService } from './integrations/email';
import { createSmsService } from './integrations/sms';
import { createOtpService, createOtpRateLimit, type OtpService, type OtpCodeGenerator } from './otp';
import { createPdfService } from './integrations/pdf';
import { createReportService, type ReportRegistry, type ReportService } from './integrations/reports';
import { createStorageService } from './integrations/storage';
import { isFeatureEnabled } from './features';
import { createEventBus, type EventBus } from './events';
import { createScheduler, type ScheduleDefinition, type Scheduler } from './scheduler';
import type { DatabaseClient } from './lib/database';
import { errorHandler, notFoundHandler, requestIdMiddleware } from './middleware';
import { createJobQueue, JobService, registerCleanupJob, resolveJobsDir, type JobQueue } from './jobs';
import { IdempotencyStore } from './lib/idempotency';
import { createKvStore, isRedisClient } from './lib/redis';
import { UserRepository, DocumentRepository, NotificationRepository, AuditRepository, TenderRepository, TenderRequirementRepository, BidderRepository, BidSubmissionRepository, BidDocumentRepository, BidVerificationRepository, BidCrossVerificationRepository, BidReviewItemRepository, TenderEvaluationRepository } from './repositories';
import { createHealthRouter } from './routes/health.routes';
import { createV1Router } from './routes/v1.routes';
import { composeHandlers, createCorsOptions, createHelmetOptions, createRateLimitStore, createSecurityRateLimits } from './security';
import { AuthService } from './services/auth.service';
import { HealthService } from './services/health.service';
import { createNotificationService } from './notifications';
import { createObservability, requestLoggingMiddleware, type Observability } from './observability';
import { RbacService } from './services/rbac.service';
import type { AppConfig } from './types/config';
import type { Pingable } from './types/lifecycle';
import { asyncHandler } from './utils/async-handler';
import type { AppLogger } from './utils/logger';

export interface CreateAppOptions {
  config: AppConfig;
  logger: AppLogger;
  database?: Pingable | null;
  redis?: Pingable | null;
  ai?: Pingable | null;
  aiService?: AIService | null;
  documentService?: DocumentIntelligenceService | null;
  events?: EventBus | null;
  jobs?: JobQueue | null;
  scheduler?: Scheduler | null;
  schedules?: ScheduleDefinition[];
  otpService?: OtpService | null;
  otpGenerator?: OtpCodeGenerator;
  reportRegistry?: ReportRegistry;
  reportService?: ReportService | null;
  observability?: Observability;
}

export interface AppContext {
  app: Express;
  healthService: HealthService;
  jobs: JobQueue;
  scheduler: Scheduler | null;
  observability: Observability;
}

export function createApp(options: CreateAppOptions): AppContext {
  const app = express();
  const observability = options.observability ?? createObservability();
  const prisma = getPrisma(options.database);
  const events = options.events ?? createEventBus(options.logger);
  const tokenService =
    options.config.jwt.accessSecret && options.config.jwt.refreshSecret
      ? createTokenServiceFromConfig(options.config)
      : null;
  const users = prisma ? new UserRepository(prisma) : null;
  const rateLimitStore = createRateLimitStore(options.redis);
  const kv = createKvStore(isRedisClient(options.redis) ? options.redis : null);
  const revocation = tokenService
    ? new TokenRevocationStore(kv, tokenService.accessExpiresInSeconds * 1000)
    : null;
  const auditRepository = prisma ? new AuditRepository(prisma) : null;
  const auditService = new AuditService(auditRepository, options.logger);
  const authService =
    prisma && tokenService
      ? new AuthService({
          prisma,
          passwordService: new PasswordService(options.config.auth.password),
          tokenService,
          defaultRole: options.config.auth.defaultRole,
          revocation,
          audit: auditService,
        })
      : null;
  const idempotency = new IdempotencyStore(kv);
  const jobs =
    options.jobs ??
    createJobQueue({
      logger: options.logger,
      redisUrl: options.config.redisUrl,
      jobsDir: options.config.redisUrl || options.config.isTest ? undefined : resolveJobsDir(),
      defaultAttempts: options.config.jobs.maxAttempts,
      defaultBackoffMs: options.config.jobs.backoffMs,
      defaultTimeoutMs: options.config.jobs.timeoutMs,
      processJobs: options.config.jobs.process,
      metrics: observability.metrics,
    });
  registerCleanupJob(jobs, kv);

  const aiService =
    options.aiService === undefined
      ? createAiService({
          config: options.config,
          logger: options.logger,
          jobs,
          audit: auditService,
          metrics: observability.metrics,
        })
      : options.aiService;
  const aiPing = options.ai === undefined ? (isAiEnabled(options.config) ? aiService : null) : options.ai;

  const storage = createStorageService(options.config, { prisma, audit: auditService });
  const emailService = createEmailService({
    config: options.config,
    logger: options.logger,
    jobs,
    idempotency,
    ai: aiService,
  });
  const smsService = createSmsService({
    config: options.config,
    jobs,
    idempotency,
  });
  const otpService =
    options.otpService === undefined
      ? isFeatureEnabled(options.config, 'otp')
        ? createOtpService({
            config: options.config,
            logger: options.logger,
            kv,
            generator: options.otpGenerator,
            email: emailService,
            sms: smsService,
          })
        : null
      : options.otpService;
  const pdfService = createPdfService({
    storage,
    jobs,
  });
  const notificationService =
    prisma && users
      ? createNotificationService({
          notifications: new NotificationRepository(prisma),
          users,
          email: emailService,
          sms: smsService,
          jobs,
          idempotency,
          config: options.config,
          audit: auditService,
          metrics: observability.metrics,
        })
      : null;
  const documentService =
    options.documentService === undefined
      ? prisma
        ? createDocumentIntelligenceService({
            config: options.config,
            logger: options.logger,
            documents: new DocumentRepository(prisma),
            storage,
            ai: aiService,
            jobs,
            onAnalyzed: (event) => {
              if (isFeatureEnabled(options.config, 'notifications') && notificationService) {
                void notificationService
                  .notify({
                    userId: event.userId,
                    type: event.requiresReview ? 'warning' : 'success',
                    title: 'Document analysis finished',
                    body: `Your ${event.documentType} document is ${event.status}.`,
                  })
                  .catch((error: unknown) => {
                    options.logger.warn(
                      { err: error, documentId: event.documentId },
                      'Failed to record document notification',
                    );
                  });
              }
            },
          })
        : null
      : options.documentService;

  const reportService =
    options.reportService === undefined
      ? createReportService({
          storage,
          jobs,
          notifications: notificationService,
          email: emailService,
          registry: options.reportRegistry,
          appName: options.config.app.name,
          audit: auditService,
        })
      : options.reportService;

  const healthService = new HealthService({
    serviceName: options.config.app.name,
    environment: options.config.nodeEnv,
    database: options.database,
    redis: options.redis,
    ai: aiPing,
  });

  const healthController = new HealthController(healthService);
  const apiInfoController = new ApiInfoController(options.config);
  const featuresController = new FeaturesController(options.config);
  const authController = new AuthController(authService, otpService);
  const auditController = new AuditController(prisma ? auditService : null);
  const rbacController = new RbacController(prisma ? new RbacService(prisma) : null);
  const aiController = new AiController(aiService);
  const documentController = new DocumentController(documentService);
  const notificationController = new NotificationController(notificationService);
  const pdfEnabled = isFeatureEnabled(options.config, 'pdf');
  const pdfController = new PdfController(pdfEnabled ? pdfService : null, storage);
  const reportController = new ReportController(pdfEnabled ? reportService : null, storage);
  const storageController = new StorageController(
    storage,
    options.config.storage.signingSecret ??
      options.config.jwt.accessSecret ??
      (options.config.isProduction ? '' : 'dev-storage-signing-secret'),
  );
  const jobController = new JobController(new JobService(jobs));
  const tenderService = prisma
    ? new TenderService({
        tenders: new TenderRepository(prisma),
        requirements: new TenderRequirementRepository(prisma),
        bids: new BidSubmissionRepository(prisma),
        audit: auditService,
        auditEvents: auditRepository,
      })
    : null;
  const bidderService = prisma ? new BidderService(new BidderRepository(prisma), auditService, auditRepository) : null;
  const bidService = prisma
    ? new BidSubmissionService(
        new BidSubmissionRepository(prisma),
        new TenderRepository(prisma),
        new BidderRepository(prisma),
        auditService,
        auditRepository,
        notificationService,
      )
    : null;
  const bidDocumentService = prisma
    ? new BidDocumentService(
        new BidDocumentRepository(prisma),
        new BidSubmissionRepository(prisma),
        new TenderRequirementRepository(prisma),
        storage,
        auditService,
        auditRepository,
        options.config.documents.maxBytes,
      )
    : null;
  const bidVerificationService = prisma
    ? new BidVerificationService(
        new BidVerificationRepository(prisma),
        new BidSubmissionRepository(prisma),
        new BidderRepository(prisma),
        new BidDocumentRepository(prisma),
        new VerificationAdapterRegistry(),
        auditService,
        auditRepository,
        notificationService,
      )
    : null;
  const bidIntelligenceService = prisma
    ? new BidIntelligenceService(
        new BidCrossVerificationRepository(prisma),
        new BidVerificationRepository(prisma),
        new BidDocumentRepository(prisma),
        new BidSubmissionRepository(prisma),
        new TenderRequirementRepository(prisma),
        auditService,
        auditRepository,
      )
    : null;
  const bidReviewService =
    prisma && bidIntelligenceService
      ? new BidReviewService(
          new BidReviewItemRepository(prisma),
          new BidSubmissionRepository(prisma),
          bidIntelligenceService,
          auditService,
          auditRepository,
          notificationService,
        )
      : null;
  const bidAttentionService = prisma
    ? new BidAttentionService(
        new BidSubmissionRepository(prisma),
        new BidReviewItemRepository(prisma),
        new BidVerificationRepository(prisma),
        new BidCrossVerificationRepository(prisma),
        new BidDocumentRepository(prisma),
        new TenderRequirementRepository(prisma),
      )
    : null;
  const bidEvaluationService =
    prisma && bidAttentionService
      ? new BidEvaluationService(
          new TenderEvaluationRepository(prisma),
          new TenderRepository(prisma),
          new BidSubmissionRepository(prisma),
          new TenderRequirementRepository(prisma),
          new BidDocumentRepository(prisma),
          new BidVerificationRepository(prisma),
          new BidCrossVerificationRepository(prisma),
          new BidReviewItemRepository(prisma),
          bidAttentionService,
          auditService,
          auditRepository,
          notificationService,
        )
      : null;
  const bidOperationsService =
    prisma && tenderService && bidAttentionService && bidEvaluationService && bidReviewService && auditRepository
      ? new BidOperationsService(
          tenderService,
          new TenderRepository(prisma),
          new BidderRepository(prisma),
          new BidSubmissionRepository(prisma),
          bidReviewService,
          bidAttentionService,
          bidEvaluationService,
          new TenderEvaluationRepository(prisma),
          auditRepository,
          storage,
          auditService,
          { demoMode: options.config.demoMode, nodeEnv: options.config.nodeEnv },
        )
      : null;
  const bharatBidController = new BharatBidController(
    tenderService,
    bidderService,
    bidService,
    bidDocumentService,
    bidVerificationService,
    bidIntelligenceService,
    bidReviewService,
    bidAttentionService,
    bidEvaluationService,
    bidOperationsService,
  );
  const authenticate = createAuthenticate({ tokenService, users, revocation });
  const rateLimits = createSecurityRateLimits({
    store: rateLimitStore,
    config: options.config,
    logger: options.logger,
  });
  const authenticateUser = composeHandlers(authenticate, rateLimits.authenticated);
  const authenticateAi = composeHandlers(authenticateUser, rateLimits.ai);
  const authenticateAdmin = composeHandlers(authenticateUser, rateLimits.admin);
  const loginRateLimit = createLoginRateLimit({
    store: rateLimitStore,
    config: options.config,
    logger: options.logger,
  });
  const otpRateLimit = createOtpRateLimit({
    store: rateLimitStore,
    config: options.config,
    logger: options.logger,
  });
  const passwordResetRateLimit = createPasswordResetRateLimit({
    store: rateLimitStore,
    config: options.config,
    logger: options.logger,
  });

  applyBaseMiddleware(app, options.config, options.logger, observability.metrics);
  app.use(createHealthRouter(healthController));
  app.use(
    API_PREFIX,
    createV1Router({
      apiInfoController,
      featuresController,
      authController,
      auditController,
      rbacController,
      aiController,
      documentController,
      notificationController,
      pdfController,
      reportController,
      storageController,
      jobController,
      bharatBidController,
      authenticate: authenticateUser,
      authenticateAi,
      authenticateAdmin,
      loginRateLimit,
      otpRateLimit,
      passwordResetRateLimit,
      rateLimits,
      documentMaxBytes: options.config.documents.maxBytes,
      storageMaxBytes: options.config.storage.maxBytes,
    }),
  );
  app.use(asyncHandler(notFoundHandler));
  app.use(errorHandler(options.logger, options.config.isProduction, observability.errors));

  const scheduler =
    options.scheduler === undefined
      ? createScheduler({
          config: options.config,
          logger: options.logger,
          events,
          schedules: options.schedules,
        })
      : options.scheduler;
  if (scheduler && !options.config.isTest) {
    scheduler.start();
  }

  return { app, healthService, jobs, scheduler, observability };
}

function applyBaseMiddleware(
  app: Application,
  config: AppConfig,
  logger: AppLogger,
  metrics?: Observability['metrics'] | null,
): void {
  app.disable('x-powered-by');
  if (config.isProduction) {
    app.set('trust proxy', 1);
  }
  app.use(helmet(createHelmetOptions(config)));
  app.use(cors(createCorsOptions(config)));
  app.use(requestIdMiddleware);
  app.use(requestLoggingMiddleware(logger, metrics));
  app.use(express.json({ limit: config.requestBodyLimit }));
  app.use(express.urlencoded({ extended: false, limit: config.requestBodyLimit }));
}

function getPrisma(database?: Pingable | null): PrismaClient | null {
  if (!database || !('prisma' in database)) {
    return null;
  }

  return (database as DatabaseClient).prisma;
}
