export const API_PREFIX = '/api/v1';
export const API_VERSION = 'v1';

export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  FEATURE_DISABLED: 'FEATURE_DISABLED',
  CONFLICT: 'CONFLICT',
  RATE_LIMIT: 'RATE_LIMIT',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  TIMEOUT: 'TIMEOUT',
  NOT_READY: 'NOT_READY',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;

export const FILTER_OPERATORS = ['eq', 'neq', 'contains', 'in', 'gte', 'lte'] as const;
export type FilterOperator = (typeof FILTER_OPERATORS)[number];

export const REQUEST_ID = {
  HEADER: 'x-request-id',
  MAX_LENGTH: 128,
  PATTERN: /^[\w.:-]{1,128}$/,
} as const;

export const UPLOAD = {
  MAX_BYTES: 10 * 1024 * 1024,
  MAX_FILENAME_LENGTH: 255,
} as const;

export const STORAGE = {
  MAX_BYTES: UPLOAD.MAX_BYTES,
  MAX_FILENAME_LENGTH: UPLOAD.MAX_FILENAME_LENGTH,
  SIGNED_URL_DEFAULT_SECONDS: 300,
  SIGNED_URL_MAX_SECONDS: 86_400,
} as const;

export const STORAGE_PURPOSES = ['attachment', 'avatar', 'export', 'document', 'report'] as const;
export type StoragePurposeName = (typeof STORAGE_PURPOSES)[number];

export const DOCUMENT = {
  MAX_BYTES: UPLOAD.MAX_BYTES,
  MAX_FILENAME_LENGTH: UPLOAD.MAX_FILENAME_LENGTH,
  MAX_TEXT_CHARS: 100_000,
  DEFAULT_CONFIDENCE_THRESHOLD: 0.7,
  DEFAULT_ASYNC_THRESHOLD_BYTES: 1 * 1024 * 1024,
  JOB_ATTEMPTS: 3,
  JOB_BACKOFF_MS: 0,
} as const;

export const REPORTS = {
  JOB_ATTEMPTS: 3,
  JOB_BACKOFF_MS: 200,
  JOB_TIMEOUT_MS: 60_000,
  MAX_TABLE_ROWS: 200,
  MAX_TABLE_COLUMNS: 12,
  MAX_CHART_POINTS: 24,
  MAX_FACT_KEYS: 40,
  MAX_SECTIONS: 30,
  MAX_SECTION_LINES: 80,
  MAX_NARRATIVE_CHARS: 8_000,
  EMAIL_ATTACH_MAX_BYTES: 1_000_000,
  SIGNED_URL_SECONDS: STORAGE.SIGNED_URL_MAX_SECONDS,
} as const;

export const REPORT_TYPES = ['simple', 'table', 'summary', 'document'] as const;
export type ReportTypeName = (typeof REPORT_TYPES)[number];

export const JOBS = {
  QUEUE_NAME: 'bharatbid',
  FILE_DIR: 'job-queue',
  FILE_POLL_MS: 100,
  DEFAULT_ATTEMPTS: 3,
  DEFAULT_BACKOFF_MS: 200,
  DEFAULT_TIMEOUT_MS: 60_000,
  STATUS_TTL_MS: 24 * 60 * 60 * 1000,
  IDEMPOTENCY_TTL_MS: 24 * 60 * 60 * 1000,
  OTP_TTL_MS: 10 * 60 * 1000,
  OTP_DEFAULT_DIGITS: 6,
  OTP_MIN_DIGITS: 4,
  OTP_MAX_DIGITS: 8,
  OTP_MAX_ATTEMPTS: 5,
  OTP_RESEND_COOLDOWN_MS: 60_000,
  CACHE_DEFAULT_TTL_MS: 60_000,
} as const;

export const JOB_NAMES = {
  EMAIL_SEND: 'email.send',
  SMS_SEND: 'sms.send',
  PDF_GENERATE: 'pdf.generate',
  AI_ANALYZE: 'ai.analyze',
  DOCUMENT_ANALYZE: 'document.analyze',
  DOCUMENT_PROCESS: 'document.process',
  REPORT_GENERATE: 'report.generate',
  CLEANUP: 'cleanup',
  NOTIFICATION_DISPATCH: 'notification.dispatch',
} as const;

export type JobName = (typeof JOB_NAMES)[keyof typeof JOB_NAMES];

export const JOB_STATUSES = ['queued', 'processing', 'completed', 'failed', 'retrying'] as const;
export type JobStatusName = (typeof JOB_STATUSES)[number];

export const AI_GUARDRAILS = {
  MAX_INPUT_CHARS: 100_000,
  MAX_SYSTEM_CHARS: 8_000,
  MAX_MESSAGES: 32,
  MAX_RESULT_CHARS: 4_000,
  LOW_CONFIDENCE_THRESHOLD: 0.6,
  AUDIT_GENERATE: 'ai.generate',
  AUDIT_DECISION: 'ai.decision',
  AUDIT_TOOL: 'ai.tool',
  AUDIT_ACTION: 'ai.action',
} as const;

export const AUDIT = {
  MAX_JSON_CHARS: 4_000,
  MAX_ACTION_CHARS: 128,
  MAX_RESOURCE_CHARS: 64,
  MAX_RESOURCE_ID_CHARS: 128,
  MAX_IP_CHARS: 64,
  MAX_STATUS_CHARS: 64,
} as const;

export const AUDIT_ACTIONS = {
  USER_LOGIN: 'user.login',
  USER_CREATED: 'user.created',
  AI_ACTION_REQUESTED: AI_GUARDRAILS.AUDIT_GENERATE,
  AI_TOOL_EXECUTED: AI_GUARDRAILS.AUDIT_TOOL,
  FILE_UPLOADED: 'file.uploaded',
  REPORT_GENERATED: 'report.generated',
  NOTIFICATION_SENT: 'notification.sent',
  TENDER_CREATED: 'tender.created',
  TENDER_UPDATED: 'tender.updated',
  TENDER_STATUS_CHANGED: 'tender.status.changed',
  TENDER_REQUIREMENT_CREATED: 'tender.requirement.created',
  TENDER_REQUIREMENT_UPDATED: 'tender.requirement.updated',
  TENDER_REQUIREMENT_ACTIVATED: 'tender.requirement.activated',
  TENDER_REQUIREMENT_DEACTIVATED: 'tender.requirement.deactivated',
  TENDER_REQUIREMENT_REORDERED: 'tender.requirement.reordered',
  BIDDER_CREATED: 'bidder.created',
  BIDDER_UPDATED: 'bidder.updated',
  BID_CREATED: 'bid.created',
  BID_UPDATED: 'bid.updated',
  BID_SUBMITTED: 'bid.submitted',
  BID_STATUS_CHANGED: 'bid.status.changed',
  DOCUMENT_UPLOADED: 'document.uploaded',
  DOCUMENT_UPDATED: 'document.updated',
  DOCUMENT_VERSION_CREATED: 'document.version.created',
  DOCUMENT_REQUIREMENT_LINKED: 'document.requirement.linked',
  DOCUMENT_ARCHIVED: 'document.archived',
  DOCUMENT_DOWNLOADED: 'document.downloaded',
  DOCUMENT_EXTRACTION_STARTED: 'document.extraction.started',
  DOCUMENT_EXTRACTION_COMPLETED: 'document.extraction.completed',
  DOCUMENT_EXTRACTION_FAILED: 'document.extraction.failed',
  VERIFICATION_REQUESTED: 'verification.requested',
  VERIFICATION_COMPLETED: 'verification.completed',
  VERIFICATION_MISMATCHED: 'verification.mismatched',
  VERIFICATION_NOT_FOUND: 'verification.not_found',
  VERIFICATION_FAILED: 'verification.failed',
  VERIFICATION_RETRIED: 'verification.retried',
  CROSS_VERIFICATION_REQUESTED: 'cross_verification.requested',
  CROSS_VERIFICATION_COMPLETED: 'cross_verification.completed',
  CROSS_VERIFICATION_INCONSISTENT: 'cross_verification.inconsistent',
  REQUIREMENT_EVALUATION_COMPLETED: 'requirement.evaluation.completed',
  REVIEW_ITEM_CREATED: 'review_item.created',
  REVIEW_OPENED: 'review.opened',
  REVIEW_STARTED: 'review.started',
  REVIEW_ASSESSMENT_CREATED: 'review.assessment.created',
  REVIEW_ASSESSMENT_UPDATED: 'review.assessment.updated',
  CLARIFICATION_REQUESTED: 'clarification.requested',
  CLARIFICATION_RESPONDED: 'clarification.responded',
  CLARIFICATION_CANCELLED: 'clarification.cancelled',
  REVIEW_CLOSED: 'review.closed',
  EVALUATION_CREATED: 'evaluation.created',
  EVALUATION_STARTED: 'evaluation.started',
  EVALUATION_NOTE_CREATED: 'evaluation.note.created',
  EVALUATION_DECISION_RECORDED: 'evaluation.decision.recorded',
  EVALUATION_STATUS_CHANGED: 'evaluation.status.changed',
  EVALUATION_REPORT_GENERATED: 'evaluation.report.generated',
} as const;

export const SCHEDULER = {
  DEFAULT_NAME: 'tick',
  DEFAULT_TRIGGER: 'scheduled',
  NAME_PATTERN: /^[a-zA-Z][a-zA-Z0-9._-]{0,63}$/,
} as const;

export const NOTIFICATION_CHANNELS = ['email', 'in_app', 'sms', 'push', 'webhook'] as const;
export type NotificationChannelName = (typeof NOTIFICATION_CHANNELS)[number];

export const NOTIFICATION_PRIORITIES = ['low', 'normal', 'high', 'critical'] as const;
export type NotificationPriorityName = (typeof NOTIFICATION_PRIORITIES)[number];

export const NOTIFICATION_CATEGORIES = [
  'order_updates',
  'security_alerts',
  'reports',
  'marketing',
  'system',
] as const;
export type NotificationCategoryName = (typeof NOTIFICATION_CATEGORIES)[number];

export const NOTIFICATION_DELIVERY_STATUSES = ['queued', 'processing', 'sent', 'failed', 'retrying'] as const;
export type NotificationDeliveryStatusName = (typeof NOTIFICATION_DELIVERY_STATUSES)[number];

export const NOTIFICATIONS = {
  DISPATCH_JOB: 'notification.dispatch',
  MANDATORY_CATEGORIES: ['security_alerts'] as const,
  HIGH_PRIORITIES: ['high', 'critical'] as const,
  DEFAULT_ATTEMPTS: 3,
  HIGH_ATTEMPTS: 5,
  LOW_ATTEMPTS: 2,
  WEBHOOK_TIMEOUT_MS: 5_000,
  SMS_TIMEOUT_MS: 10_000,
  MAX_TEMPLATE_CHARS: 8_000,
  MAX_DATA_KEYS: 40,
} as const;
