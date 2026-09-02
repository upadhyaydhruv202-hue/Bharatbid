import { createAiService } from '../integrations/ai';
import { createDocumentIntelligenceService } from '../integrations/documents';
import { createEmailService } from '../integrations/email';
import { createSmsService } from '../integrations/sms';
import { createPdfService } from '../integrations/pdf';
import { createReportService } from '../integrations/reports';
import { createStorageService } from '../integrations/storage';
import { createDatabaseClient } from '../lib/database';
import { IdempotencyStore } from '../lib/idempotency';
import { createKvStore, createRedisClient } from '../lib/redis';
import { AuditRepository, DocumentRepository, NotificationRepository, UserRepository } from '../repositories';
import { AuditService } from '../audit';
import { createNotificationService } from '../notifications';
import type { Closable } from '../types/lifecycle';
import { isFeatureEnabled } from '../features';
import type { AppConfig } from '../types/config';
import type { AppLogger } from '../utils/logger';
import { registerCleanupJob } from './cleanup';
import { resolveJobsDir } from './paths';
import { createJobQueue, type JobQueue } from './queue';

export interface BackgroundWorker extends Closable {
  readonly jobs: JobQueue;
  start(): void;
}

export function createBackgroundWorker(options: {
  config: AppConfig;
  logger: AppLogger;
}): BackgroundWorker {
  const { config, logger } = options;
  const database = config.databaseUrl
    ? createDatabaseClient({
        url: config.databaseUrl,
        poolMax: config.databasePoolMax,
        poolTimeoutSeconds: config.databasePoolTimeoutSeconds,
      })
    : null;
  const prisma = database?.prisma ?? null;
  const redis = config.redisUrl ? createRedisClient(config.redisUrl) : null;
  const kv = createKvStore(redis);
  const idempotency = new IdempotencyStore(kv);
  const jobs = createJobQueue({
    logger,
    redisUrl: config.redisUrl,
    jobsDir: config.redisUrl ? undefined : resolveJobsDir(),
    defaultAttempts: config.jobs.maxAttempts,
    defaultBackoffMs: config.jobs.backoffMs,
    defaultTimeoutMs: config.jobs.timeoutMs,
    processJobs: true,
  });
  registerCleanupJob(jobs, kv);
  const audit = prisma ? new AuditService(new AuditRepository(prisma), logger) : undefined;
  const storage = createStorageService(config, { prisma, audit });
  const aiService = createAiService({ config, logger, jobs, audit });
  const emailService = createEmailService({ config, logger, jobs, idempotency, ai: aiService });
  const smsService = createSmsService({ config, jobs, idempotency });
  createPdfService({ storage, jobs });

  let notificationService = null as ReturnType<typeof createNotificationService> | null;
  if (prisma) {
    const users = new UserRepository(prisma);
    notificationService = createNotificationService({
      notifications: new NotificationRepository(prisma),
      users,
      email: emailService,
      sms: smsService,
      jobs,
      idempotency,
      config,
      audit,
    });
    createDocumentIntelligenceService({
      config,
      logger,
      documents: new DocumentRepository(prisma),
      storage,
      ai: aiService,
      jobs,
      onAnalyzed: isFeatureEnabled(config, 'notifications')
        ? (event) => {
            void notificationService
              ?.notify({
                userId: event.userId,
                type: event.requiresReview ? 'warning' : 'success',
                title: 'Document analysis finished',
                body: `Your ${event.documentType} document is ${event.status}.`,
              })
              .catch((error: unknown) => {
                logger.warn({ err: error, documentId: event.documentId }, 'Failed to record document notification');
              });
          }
        : undefined,
    });
  }

  createReportService({
    storage,
    jobs,
    email: emailService,
    notifications: notificationService,
    appName: config.app.name,
    audit,
  });

  return {
    name: 'workers',
    jobs,
    start() {
      logger.info(
        {
          env: config.nodeEnv,
          redisConfigured: Boolean(config.redisUrl),
          databaseConfigured: Boolean(config.databaseUrl),
          queueBackend: jobs.backend,
        },
        'Workers process started',
      );

      if (jobs.backend === 'memory') {
        logger.warn(
          'Job queue is in-memory; this process cannot share jobs with the API. Unset test mode or set REDIS_URL / use the file queue.',
        );
      }

      if (!database) {
        logger.warn('DATABASE_URL is not set; document.process processors are not registered');
      }
    },
    async close() {
      await jobs.close();
      await redis?.close();
      await database?.close();
    },
  };
}
