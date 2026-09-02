import { z } from 'zod';

import { JOBS } from '../constants';
import { requestIdSchema } from '../schemas/common';

export const jobIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9._:-]+$/, 'Job IDs may contain letters, numbers, dots, underscores, colons, and dashes');

export const jobIdParamsSchema = z.object({
  jobId: jobIdSchema,
});

export const cleanupJobPayloadSchema = z.object({
  maxAgeMs: z.number().int().min(1).max(7 * 24 * 60 * 60 * 1000).optional(),
  requestId: requestIdSchema.optional(),
});

export type CleanupJobPayload = z.infer<typeof cleanupJobPayloadSchema>;

export const DEFAULT_CLEANUP_MAX_AGE_MS = JOBS.STATUS_TTL_MS;
