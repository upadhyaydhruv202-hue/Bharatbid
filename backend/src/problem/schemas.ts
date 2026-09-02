import { z } from 'zod';

import {
  emailSchema,
  idSchema,
  paginationQuerySchema,
  sortQuerySchema,
} from '../schemas/common';
import {
  CIN_PATTERN,
  GSTIN_PATTERN,
  INDIAN_MOBILE_PATTERN,
  PAN_PATTERN,
  PINCODE_PATTERN,
  UDYAM_PATTERN,
  blankToNull,
  normalizeIdentifier,
} from './identifiers';
import {
  BID_SUBMISSION_STATUSES,
  BID_DOCUMENT_CATEGORIES,
  BID_DOCUMENT_EXTRACTION_STATUSES,
  BID_DOCUMENT_STATUSES,
  BID_DOCUMENT_TYPES,
  DEFAULT_DEPARTMENT_NAME,
  DEFAULT_ORGANIZATION_NAME,
  TENDER_REQUIREMENT_TYPES,
  TENDER_STATUSES,
  normalizeTenderCategory,
} from './types';
import {
  SOURCE_SUPPORTED_IDENTIFIERS,
  VERIFIABLE_IDENTIFIER_TYPES,
  VERIFICATION_IDENTIFIER_TYPES,
  VERIFICATION_SOURCES,
  VERIFICATION_STATUSES,
} from './verification/types';
import { CROSS_COMPARISON_TYPES, CROSS_VERIFICATION_STATUSES } from './intelligence/types';
import {
  REVIEW_ASSESSMENT_TYPES,
  REVIEW_ISSUE_TYPES,
  REVIEW_ITEM_STATUSES,
} from './review/types';
import { ATTENTION_BANDS } from './attention/types';
import {
  EVALUATION_DECISION_TYPES,
  TENDER_EVALUATION_STATUSES,
} from './evaluation/types';

function firstQueryValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

const optionalTrimmed = z.preprocess((value) => {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed === '' ? undefined : trimmed;
  }
  return value;
}, z.string().min(1).max(300).optional());

const optionalIdentifier = (pattern: RegExp, message: string) =>
  z.preprocess((value) => {
    const normalized = normalizeIdentifier(typeof value === 'string' ? value : blankToNull(String(value ?? '')));
    return normalized ?? undefined;
  }, z.string().regex(pattern, message).optional());

export const dateInputSchema = z.preprocess((value) => {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    return `${value.trim()}T00:00:00.000Z`;
  }
  return value;
}, z.coerce.date());

export const tenderStatusSchema = z.preprocess((value) => {
  if (typeof value !== 'string') {
    return value;
  }
  return value.trim().toLowerCase().replace(/-/g, '_');
}, z.enum(TENDER_STATUSES));

export const bidStatusSchema = z.preprocess((value) => {
  if (typeof value !== 'string') {
    return value;
  }
  return value.trim().toLowerCase().replace(/-/g, '_');
}, z.enum(BID_SUBMISSION_STATUSES));

export const requirementTypeSchema = z.preprocess((value) => {
  if (typeof value !== 'string') {
    return value;
  }
  return value.trim().toLowerCase().replace(/-/g, '_');
}, z.enum(TENDER_REQUIREMENT_TYPES));

export const tenderCategorySchema = z.preprocess((value) => {
  if (typeof value !== 'string') {
    return value;
  }
  return normalizeTenderCategory(value) ?? value.trim();
}, z.string().refine((value) => Boolean(normalizeTenderCategory(value)), {
  message: 'Category must be Goods, Services, Works, IT, Consultancy, or Other',
}));

export const createTenderBodySchema = z
  .object({
    referenceNumber: z
      .string()
      .trim()
      .min(3)
      .max(64)
      .regex(/^[A-Za-z0-9][A-Za-z0-9/_-]*$/, 'Reference number may contain letters, numbers, /, _, and -'),
    title: z.string().trim().min(3).max(300),
    description: z.string().trim().max(8000).optional().nullable(),
    organizationName: z.string().trim().min(2).max(200).default(DEFAULT_ORGANIZATION_NAME),
    departmentName: z.string().trim().min(2).max(200).default(DEFAULT_DEPARTMENT_NAME),
    category: tenderCategorySchema,
    status: tenderStatusSchema.optional(),
    issueDate: dateInputSchema,
    closingDate: dateInputSchema,
  })
  .superRefine((value, ctx) => {
    if (value.closingDate < value.issueDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['closingDate'],
        message: 'Closing date cannot be earlier than the issue date',
      });
    }
  });

export const updateTenderBodySchema = z
  .object({
    title: z.string().trim().min(3).max(300).optional(),
    description: z.string().trim().max(8000).optional().nullable(),
    organizationName: z.string().trim().min(2).max(200).optional(),
    departmentName: z.string().trim().min(2).max(200).optional(),
    category: tenderCategorySchema.optional(),
    issueDate: dateInputSchema.optional(),
    closingDate: dateInputSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'At least one field is required' });

export const updateTenderStatusBodySchema = z.object({
  status: tenderStatusSchema,
});

export const tenderIdParamsSchema = z.object({
  id: idSchema,
});

export const tenderRequirementParamsSchema = z.object({
  tenderId: idSchema,
  id: idSchema,
});

const optionalSearch = z.preprocess((value) => {
  const scalar = firstQueryValue(value);
  if (typeof scalar !== 'string') {
    return undefined;
  }
  const trimmed = scalar.trim();
  return trimmed === '' ? undefined : trimmed.slice(0, 100);
}, z.string().min(1).max(100).optional());

export const tenderListQuerySchema = paginationQuerySchema.merge(sortQuerySchema).extend({
  q: optionalSearch,
  search: optionalSearch,
  sort: z.preprocess((value) => firstQueryValue(value), z.string().min(1).max(64).optional()),
  order: z.preprocess((value) => {
    const scalar = firstQueryValue(value);
    return typeof scalar === 'string' ? scalar.trim().toLowerCase() : scalar;
  }, z.enum(['asc', 'desc']).optional()),
  status: z.preprocess((value) => {
    const scalar = firstQueryValue(value);
    return scalar === '' || scalar === undefined ? undefined : scalar;
  }, tenderStatusSchema.optional()),
  category: z.preprocess((value) => {
    const scalar = firstQueryValue(value);
    if (typeof scalar !== 'string' || scalar.trim() === '') {
      return undefined;
    }
    return normalizeTenderCategory(scalar) ?? scalar.trim();
  }, tenderCategorySchema.optional()),
});

export const reorderRequirementBodySchema = z.object({
  direction: z.enum(['up', 'down']),
});

export const createTenderRequirementBodySchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(4000).optional().nullable(),
  requirementType: requirementTypeSchema,
  mandatory: z.boolean().optional(),
  active: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(10_000).optional(),
});

export const updateTenderRequirementBodySchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(4000).optional().nullable(),
    requirementType: requirementTypeSchema.optional(),
    mandatory: z.boolean().optional(),
    active: z.boolean().optional(),
    sortOrder: z.number().int().min(0).max(10_000).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'At least one field is required' });

export const createBidderBodySchema = z.object({
  legalName: z.string().trim().min(2).max(300),
  tradeName: optionalTrimmed.nullable().optional(),
  pan: optionalIdentifier(PAN_PATTERN, 'PAN must look like ABCDE1234F'),
  gstin: optionalIdentifier(GSTIN_PATTERN, 'GSTIN must be a 15-character GST identification number'),
  cin: optionalIdentifier(CIN_PATTERN, 'CIN must be a 21-character company identification number'),
  udyamRegistrationNumber: optionalIdentifier(UDYAM_PATTERN, 'Udyam number must look like UDYAM-TN-02-0001234'),
  registeredAddress: z.string().trim().max(500).optional().nullable(),
  city: optionalTrimmed.nullable().optional(),
  state: optionalTrimmed.nullable().optional(),
  pincode: z.preprocess((value) => {
    const normalized = blankToNull(typeof value === 'string' ? value : undefined);
    return normalized ?? undefined;
  }, z.string().regex(PINCODE_PATTERN, 'PIN code must be a 6-digit Indian postal code').optional()),
  contactName: optionalTrimmed.nullable().optional(),
  contactEmail: z.preprocess((value) => {
    const normalized = blankToNull(typeof value === 'string' ? value : undefined);
    return normalized ? normalized.toLowerCase() : undefined;
  }, emailSchema.optional()),
  contactPhone: z.preprocess((value) => {
    const normalized = blankToNull(typeof value === 'string' ? value : undefined);
    return normalized ?? undefined;
  }, z.string().regex(INDIAN_MOBILE_PATTERN, 'Phone must be an Indian mobile number in E.164 (for example +919876543210)').optional()),
});

export const updateBidderBodySchema = createBidderBodySchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, { message: 'At least one field is required' });

export const bidderIdParamsSchema = z.object({
  id: idSchema,
});

export const bidderListQuerySchema = paginationQuerySchema.extend({
  q: optionalSearch,
  search: optionalSearch,
  state: z.preprocess((value) => {
    const scalar = firstQueryValue(value);
    if (typeof scalar !== 'string') {
      return undefined;
    }
    const trimmed = scalar.trim();
    return trimmed === '' ? undefined : trimmed.slice(0, 120);
  }, z.string().min(1).max(120).optional()),
  city: z.preprocess((value) => {
    const scalar = firstQueryValue(value);
    if (typeof scalar !== 'string') {
      return undefined;
    }
    const trimmed = scalar.trim();
    return trimmed === '' ? undefined : trimmed.slice(0, 120);
  }, z.string().min(1).max(120).optional()),
  hasUdyam: z.preprocess((value) => {
    const scalar = firstQueryValue(value);
    if (scalar === true || scalar === 'true') {
      return true;
    }
    if (scalar === false || scalar === 'false') {
      return false;
    }
    return undefined;
  }, z.boolean().optional()),
  completeness: z.preprocess((value) => {
    const scalar = firstQueryValue(value);
    return typeof scalar === 'string' && scalar.trim() !== '' ? scalar.trim().toLowerCase() : undefined;
  }, z.enum(['complete', 'incomplete']).optional()),
});

export const createBidBodySchema = z.object({
  tenderId: idSchema.optional(),
  bidderId: idSchema,
});

export const updateBidBodySchema = z
  .object({
    status: bidStatusSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'At least one field is required' });

export const bidIdParamsSchema = z.object({
  id: idSchema,
});

export const bidListQuerySchema = paginationQuerySchema.extend({
  tenderId: z.preprocess((value) => {
    const scalar = firstQueryValue(value);
    return scalar === '' || scalar === undefined ? undefined : scalar;
  }, idSchema.optional()),
  bidderId: z.preprocess((value) => {
    const scalar = firstQueryValue(value);
    return scalar === '' || scalar === undefined ? undefined : scalar;
  }, idSchema.optional()),
  status: z.preprocess((value) => {
    const scalar = firstQueryValue(value);
    return scalar === '' || scalar === undefined ? undefined : scalar;
  }, bidStatusSchema.optional()),
  q: optionalSearch,
  search: optionalSearch,
});

export const bidDocumentTypeSchema = z.preprocess((value) => {
  if (typeof value !== 'string') {
    return value;
  }
  return value.trim().toLowerCase().replace(/-/g, '_');
}, z.enum(BID_DOCUMENT_TYPES));

export const bidDocumentStatusSchema = z.preprocess((value) => {
  if (typeof value !== 'string') {
    return value;
  }
  return value.trim().toLowerCase().replace(/-/g, '_');
}, z.enum(BID_DOCUMENT_STATUSES));

export const bidDocumentExtractionStatusSchema = z.preprocess((value) => {
  if (typeof value !== 'string') {
    return value;
  }
  return value.trim().toLowerCase().replace(/-/g, '_');
}, z.enum(BID_DOCUMENT_EXTRACTION_STATUSES));

export const bidDocumentCategorySchema = z.preprocess((value) => {
  if (typeof value !== 'string') {
    return value;
  }
  return value.trim().toLowerCase();
}, z.enum(BID_DOCUMENT_CATEGORIES));

export const bidDocumentIdParamsSchema = z.object({
  bidId: idSchema,
  id: idSchema,
});

export const createBidDocumentBodySchema = z.object({
  documentType: bidDocumentTypeSchema,
  tenderRequirementId: z.preprocess((value) => {
    if (value === undefined || value === null || value === '' || value === 'unmapped') {
      return null;
    }
    return value;
  }, idSchema.nullable().optional()),
});

export const linkBidDocumentRequirementBodySchema = z.object({
  tenderRequirementId: z.preprocess((value) => {
    if (value === undefined || value === null || value === '' || value === 'unmapped') {
      return null;
    }
    return value;
  }, idSchema.nullable()),
});

export const bidDocumentDownloadQuerySchema = z.object({
  disposition: z.preprocess((value) => {
    const scalar = firstQueryValue(value);
    return typeof scalar === 'string' ? scalar.trim().toLowerCase() : scalar;
  }, z.enum(['inline', 'attachment']).optional()),
});

export const bidDocumentListQuerySchema = paginationQuerySchema.extend({
  documentType: z.preprocess((value) => {
    const scalar = firstQueryValue(value);
    return scalar === '' || scalar === undefined ? undefined : scalar;
  }, bidDocumentTypeSchema.optional()),
  category: z.preprocess((value) => {
    const scalar = firstQueryValue(value);
    return scalar === '' || scalar === undefined ? undefined : scalar;
  }, bidDocumentCategorySchema.optional()),
  status: z.preprocess((value) => {
    const scalar = firstQueryValue(value);
    return scalar === '' || scalar === undefined ? undefined : scalar;
  }, bidDocumentStatusSchema.optional()),
  extractionStatus: z.preprocess((value) => {
    const scalar = firstQueryValue(value);
    return scalar === '' || scalar === undefined ? undefined : scalar;
  }, bidDocumentExtractionStatusSchema.optional()),
  tenderRequirementId: z.preprocess((value) => {
    const scalar = firstQueryValue(value);
    if (scalar === 'unmapped') {
      return 'unmapped';
    }
    return scalar === '' || scalar === undefined ? undefined : scalar;
  }, z.union([idSchema, z.literal('unmapped')]).optional()),
  currentOnly: z.preprocess((value) => {
    const scalar = firstQueryValue(value);
    if (scalar === true || scalar === 'true') {
      return true;
    }
    if (scalar === false || scalar === 'false') {
      return false;
    }
    return undefined;
  }, z.boolean().optional()),
  sort: z.preprocess((value) => firstQueryValue(value), z.enum(['newest', 'oldest', 'name', 'type']).optional()),
});

export type CreateTenderBody = z.infer<typeof createTenderBodySchema>;
export type UpdateTenderBody = z.infer<typeof updateTenderBodySchema>;
export type CreateBidderBody = z.infer<typeof createBidderBodySchema>;
export type UpdateBidderBody = z.infer<typeof updateBidderBodySchema>;
export type CreateBidBody = z.infer<typeof createBidBodySchema>;
export type TenderListQuery = z.infer<typeof tenderListQuerySchema>;
export type BidderListQuery = z.infer<typeof bidderListQuerySchema>;
export type BidListQuery = z.infer<typeof bidListQuerySchema>;
export type BidDocumentListQuery = z.infer<typeof bidDocumentListQuerySchema>;
export type CreateBidDocumentBody = z.infer<typeof createBidDocumentBodySchema>;

export const verificationSourceSchema = z.preprocess((value) => {
  if (typeof value !== 'string') {
    return value;
  }
  return value.trim().toLowerCase();
}, z.enum(VERIFICATION_SOURCES));

export const verificationIdentifierTypeSchema = z.preprocess((value) => {
  if (typeof value !== 'string') {
    return value;
  }
  return value.trim().toLowerCase();
}, z.enum(VERIFICATION_IDENTIFIER_TYPES));

export const verifiableIdentifierTypeSchema = z.preprocess((value) => {
  if (typeof value !== 'string') {
    return value;
  }
  return value.trim().toLowerCase();
}, z.enum(VERIFIABLE_IDENTIFIER_TYPES));

export const verificationStatusSchema = z.preprocess((value) => {
  if (typeof value !== 'string') {
    return value;
  }
  return value.trim().toLowerCase().replace(/-/g, '_');
}, z.enum(VERIFICATION_STATUSES));

export const verificationIdParamsSchema = z.object({
  bidId: idSchema,
  id: idSchema,
});

export const createVerificationBodySchema = z.object({
  source: verificationSourceSchema,
  identifierType: verifiableIdentifierTypeSchema,
  identifier: z.preprocess((value) => {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }
    return typeof value === 'string' ? value.trim() : value;
  }, z.string().min(5).max(40).optional()),
  documentId: z.preprocess((value) => {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }
    return value;
  }, idSchema.optional()),
}).strict().superRefine((body, ctx) => {
  const supported = SOURCE_SUPPORTED_IDENTIFIERS[body.source];
  if (supported && !supported.includes(body.identifierType)) {
    ctx.addIssue({
      code: 'custom',
      path: ['identifierType'],
      message: 'Identifier type is not supported for this DEMO source',
    });
  }
});

export const verificationListQuerySchema = paginationQuerySchema.extend({
  source: z.preprocess((value) => {
    const scalar = firstQueryValue(value);
    return scalar === '' || scalar === undefined ? undefined : scalar;
  }, verificationSourceSchema.optional()),
  status: z.preprocess((value) => {
    const scalar = firstQueryValue(value);
    return scalar === '' || scalar === undefined ? undefined : scalar;
  }, verificationStatusSchema.optional()),
  identifierType: z.preprocess((value) => {
    const scalar = firstQueryValue(value);
    return scalar === '' || scalar === undefined ? undefined : scalar;
  }, verificationIdentifierTypeSchema.optional()),
  latestOnly: z.preprocess((value) => {
    const scalar = firstQueryValue(value);
    if (scalar === true || scalar === 'true') {
      return true;
    }
    if (scalar === false || scalar === 'false') {
      return false;
    }
    return undefined;
  }, z.boolean().optional()),
});

export type CreateVerificationBody = z.infer<typeof createVerificationBodySchema>;
export type VerificationListQuery = z.infer<typeof verificationListQuerySchema>;

export const crossVerificationIdParamsSchema = z.object({
  bidId: idSchema,
  id: idSchema,
});

export const createCrossVerificationBodySchema = z
  .object({
    leftVerificationId: z.preprocess((value) => {
      if (value === undefined || value === null || value === '') {
        return undefined;
      }
      return value;
    }, idSchema.optional()),
    rightVerificationId: z.preprocess((value) => {
      if (value === undefined || value === null || value === '') {
        return undefined;
      }
      return value;
    }, idSchema.optional()),
    comparisonType: z.preprocess((value) => {
      if (typeof value !== 'string' || value.trim() === '') {
        return undefined;
      }
      return value.trim().toLowerCase().replace(/-/g, '_').replace('↔', '_');
    }, z.enum(CROSS_COMPARISON_TYPES).optional()),
  })
  .strict()
  .refine((value) => Boolean(value.leftVerificationId) === Boolean(value.rightVerificationId), {
    message: 'Provide both verification IDs or neither',
    path: ['leftVerificationId'],
  });

export const crossVerificationListQuerySchema = z.object({
  latestOnly: z.preprocess((value) => {
    const scalar = firstQueryValue(value);
    if (scalar === true || scalar === 'true') {
      return true;
    }
    if (scalar === false || scalar === 'false') {
      return false;
    }
    return undefined;
  }, z.boolean().optional()),
});

export type CreateCrossVerificationBody = z.infer<typeof createCrossVerificationBodySchema>;

export const reviewIssueTypeSchema = z.preprocess((value) => {
  if (typeof value !== 'string') {
    return value;
  }
  return value.trim().toLowerCase().replace(/-/g, '_');
}, z.enum(REVIEW_ISSUE_TYPES));

export const reviewItemStatusSchema = z.preprocess((value) => {
  if (typeof value !== 'string') {
    return value;
  }
  return value.trim().toLowerCase().replace(/-/g, '_');
}, z.enum(REVIEW_ITEM_STATUSES));

export const reviewAssessmentTypeSchema = z.preprocess((value) => {
  if (typeof value !== 'string') {
    return value;
  }
  return value.trim().toLowerCase().replace(/-/g, '_');
}, z.enum(REVIEW_ASSESSMENT_TYPES));

export const crossVerificationStatusSchema = z.preprocess((value) => {
  if (typeof value !== 'string') {
    return value;
  }
  return value.trim().toLowerCase().replace(/-/g, '_');
}, z.enum(CROSS_VERIFICATION_STATUSES));

export const reviewIdParamsSchema = z.object({
  id: idSchema,
});

export const reviewClarificationParamsSchema = z.object({
  id: idSchema,
  clarificationId: idSchema,
});

export const bidReviewParamsSchema = z.object({
  bidId: idSchema,
  id: idSchema,
});

export const reviewListQuerySchema = z.preprocess((value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return value;
  }
  const record = { ...(value as Record<string, unknown>) };
  if (record.limit !== undefined && record.pageSize === undefined) {
    record.pageSize = record.limit;
  }
  if (record.order !== undefined && record.sortOrder === undefined) {
    record.sortOrder = record.order;
  }
  if (record.bidSubmissionId !== undefined && record.bidId === undefined) {
    record.bidId = record.bidSubmissionId;
  }
  return record;
}, paginationQuerySchema.extend({
  tenderId: z.preprocess((value) => {
    const scalar = firstQueryValue(value);
    return scalar === '' || scalar === undefined ? undefined : scalar;
  }, idSchema.optional()),
  bidId: z.preprocess((value) => {
    const scalar = firstQueryValue(value);
    return scalar === '' || scalar === undefined ? undefined : scalar;
  }, idSchema.optional()),
  bidderId: z.preprocess((value) => {
    const scalar = firstQueryValue(value);
    return scalar === '' || scalar === undefined ? undefined : scalar;
  }, idSchema.optional()),
  status: z.preprocess((value) => {
    const scalar = firstQueryValue(value);
    return scalar === '' || scalar === undefined ? undefined : scalar;
  }, reviewItemStatusSchema.optional()),
  issueType: z.preprocess((value) => {
    const scalar = firstQueryValue(value);
    return scalar === '' || scalar === undefined ? undefined : scalar;
  }, reviewIssueTypeSchema.optional()),
  mandatory: z.preprocess((value) => {
    const scalar = firstQueryValue(value);
    if (scalar === true || scalar === 'true') {
      return true;
    }
    if (scalar === false || scalar === 'false') {
      return false;
    }
    return undefined;
  }, z.boolean().optional()),
  verificationState: z.preprocess((value) => {
    const scalar = firstQueryValue(value);
    return scalar === '' || scalar === undefined ? undefined : scalar;
  }, verificationStatusSchema.optional()),
  crossCheckState: z.preprocess((value) => {
    const scalar = firstQueryValue(value);
    return scalar === '' || scalar === undefined ? undefined : scalar;
  }, crossVerificationStatusSchema.optional()),
  q: optionalSearch,
  search: optionalSearch,
  sortOrder: z.preprocess((value) => {
    const scalar = firstQueryValue(value);
    return typeof scalar === 'string' && scalar.trim() !== '' ? scalar.trim().toLowerCase() : undefined;
  }, z.enum(['asc', 'desc']).optional()),
}));

export const createReviewAssessmentBodySchema = z
  .object({
    assessment: reviewAssessmentTypeSchema,
    note: z.string().min(1).max(4000),
  })
  .strict();

export const createReviewClarificationBodySchema = z
  .object({
    message: z.string().min(1).max(4000),
    reason: z.string().trim().max(300).optional(),
    requiredInformation: z.string().trim().max(1000).optional(),
  })
  .strict();

export const respondReviewClarificationBodySchema = z
  .object({
    response: z.string().min(1).max(4000),
  })
  .strict();

export type ReviewListQuery = z.infer<typeof reviewListQuerySchema>;
export type CreateReviewAssessmentBody = z.infer<typeof createReviewAssessmentBodySchema>;
export type CreateReviewClarificationBody = z.infer<typeof createReviewClarificationBodySchema>;
export type RespondReviewClarificationBody = z.infer<typeof respondReviewClarificationBodySchema>;

export const attentionBandSchema = z.preprocess((value) => {
  if (typeof value !== 'string') {
    return value;
  }
  return value.trim().toLowerCase().replace(/-/g, '_');
}, z.enum(ATTENTION_BANDS));

export const attentionListQuerySchema = z.preprocess((value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return value;
  }
  const record = { ...(value as Record<string, unknown>) };
  if (record.limit !== undefined && record.pageSize === undefined) {
    record.pageSize = record.limit;
  }
  if (record.order !== undefined && record.sortOrder === undefined) {
    record.sortOrder = record.order;
  }
  delete record.score;
  delete record.factorPoints;
  return record;
}, paginationQuerySchema.extend({
  tenderId: z.preprocess((value) => {
    const scalar = firstQueryValue(value);
    return scalar === '' || scalar === undefined ? undefined : scalar;
  }, idSchema.optional()),
  bidderId: z.preprocess((value) => {
    const scalar = firstQueryValue(value);
    return scalar === '' || scalar === undefined ? undefined : scalar;
  }, idSchema.optional()),
  status: z.preprocess((value) => {
    const scalar = firstQueryValue(value);
    return scalar === '' || scalar === undefined ? undefined : scalar;
  }, bidStatusSchema.optional()),
  category: z.preprocess((value) => {
    const scalar = firstQueryValue(value);
    return scalar === '' || scalar === undefined ? undefined : scalar;
  }, tenderCategorySchema.optional()),
  band: z.preprocess((value) => {
    const scalar = firstQueryValue(value);
    return scalar === '' || scalar === undefined ? undefined : scalar;
  }, attentionBandSchema.optional()),
  reviewStatus: z.preprocess((value) => {
    const scalar = firstQueryValue(value);
    return scalar === '' || scalar === undefined ? undefined : scalar;
  }, reviewItemStatusSchema.optional()),
  verificationState: z.preprocess((value) => {
    const scalar = firstQueryValue(value);
    return scalar === '' || scalar === undefined ? undefined : scalar;
  }, verificationStatusSchema.optional()),
  clarificationState: z.preprocess((value) => {
    const scalar = firstQueryValue(value);
    return typeof scalar === 'string' && scalar.trim() !== '' ? scalar.trim().toLowerCase() : undefined;
  }, z.enum(['requested', 'responded', 'none']).optional()),
  q: optionalSearch,
  search: optionalSearch,
  sortBy: z.preprocess((value) => {
    const scalar = firstQueryValue(value);
    return typeof scalar === 'string' && scalar.trim() !== '' ? scalar.trim().toLowerCase().replace(/-/g, '_') : undefined;
  }, z.enum(['score', 'evidence_coverage', 'last_activity', 'open_reviews', 'closing_date']).optional()),
  sortOrder: z.preprocess((value) => {
    const scalar = firstQueryValue(value);
    return typeof scalar === 'string' && scalar.trim() !== '' ? scalar.trim().toLowerCase() : undefined;
  }, z.enum(['asc', 'desc']).optional()),
}));

export type AttentionListQuery = z.infer<typeof attentionListQuerySchema>;

export const evaluationStatusSchema = z.preprocess((value) => {
  if (typeof value !== 'string') {
    return value;
  }
  return value.trim().toLowerCase().replace(/-/g, '_');
}, z.enum(TENDER_EVALUATION_STATUSES));

export const evaluationDecisionTypeSchema = z.preprocess((value) => {
  if (typeof value !== 'string') {
    return value;
  }
  return value.trim().toLowerCase().replace(/-/g, '_');
}, z.enum(EVALUATION_DECISION_TYPES));

export const evaluationIdParamsSchema = z.object({ id: idSchema }).strict();

export const evaluationListQuerySchema = paginationQuerySchema.merge(sortQuerySchema).extend({
  status: z.preprocess((value) => {
    const scalar = firstQueryValue(value);
    return scalar === '' || scalar === undefined ? undefined : scalar;
  }, tenderStatusSchema.optional()),
  category: z.preprocess((value) => {
    const scalar = firstQueryValue(value);
    return scalar === '' || scalar === undefined ? undefined : scalar;
  }, tenderCategorySchema.optional()),
  q: optionalSearch,
  search: optionalSearch,
});

export const createEvaluationBodySchema = z
  .object({
    tenderId: idSchema,
  })
  .strict();

export const createEvaluationNoteBodySchema = z
  .object({
    note: z.string().min(1).max(4000),
    bidSubmissionId: idSchema.optional(),
  })
  .strict();

export const createEvaluationDecisionBodySchema = z
  .object({
    bidSubmissionId: idSchema,
    decision: evaluationDecisionTypeSchema,
    reason: z.string().min(1).max(4000),
  })
  .strict();

export const evaluationComparisonQuerySchema = z.object({
  bidIds: z.preprocess((value) => {
    const scalar = firstQueryValue(value);
    if (typeof scalar !== 'string' || scalar.trim() === '') {
      return undefined;
    }
    return scalar
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);
  }, z.array(idSchema).max(4).optional()),
});

export type EvaluationListQuery = z.infer<typeof evaluationListQuerySchema>;
export type CreateEvaluationBody = z.infer<typeof createEvaluationBodySchema>;
export type CreateEvaluationNoteBody = z.infer<typeof createEvaluationNoteBodySchema>;
export type CreateEvaluationDecisionBody = z.infer<typeof createEvaluationDecisionBodySchema>;
export type EvaluationComparisonQuery = z.infer<typeof evaluationComparisonQuerySchema>;

export const dashboardQuerySchema = z.object({
  tenderId: z.preprocess((value) => {
    const scalar = firstQueryValue(value);
    return scalar === '' || scalar === undefined ? undefined : scalar;
  }, idSchema.optional()),
});

export const activityQuerySchema = paginationQuerySchema.extend({
  tenderId: z.preprocess((value) => {
    const scalar = firstQueryValue(value);
    return scalar === '' || scalar === undefined ? undefined : scalar;
  }, idSchema.optional()),
  bidId: z.preprocess((value) => {
    const scalar = firstQueryValue(value);
    return scalar === '' || scalar === undefined ? undefined : scalar;
  }, idSchema.optional()),
  bidderId: z.preprocess((value) => {
    const scalar = firstQueryValue(value);
    return scalar === '' || scalar === undefined ? undefined : scalar;
  }, idSchema.optional()),
  eventType: optionalTrimmed,
  actor: z.preprocess((value) => {
    const scalar = firstQueryValue(value);
    return scalar === '' || scalar === undefined ? undefined : scalar;
  }, z.enum(['officer', 'system']).optional()),
  from: z.preprocess((value) => {
    const scalar = firstQueryValue(value);
    return scalar === '' || scalar === undefined ? undefined : scalar;
  }, z.coerce.date().optional()),
  to: z.preprocess((value) => {
    const scalar = firstQueryValue(value);
    return scalar === '' || scalar === undefined ? undefined : scalar;
  }, z.coerce.date().optional()),
});

export const searchQuerySchema = z.object({
  q: z.preprocess((value) => {
    const scalar = firstQueryValue(value);
    return typeof scalar === 'string' ? scalar.trim() : scalar;
  }, z.string().min(2).max(120)),
});

export const evaluationReportQuerySchema = z.object({
  kind: z.preprocess((value) => {
    const scalar = firstQueryValue(value);
    return scalar === '' || scalar === undefined ? 'evaluation' : scalar;
  }, z.enum(['evaluation', 'evidence', 'verification', 'review', 'decision']).default('evaluation')),
});

export type DashboardQuery = z.infer<typeof dashboardQuerySchema>;
export type ActivityQuery = z.infer<typeof activityQuerySchema>;
export type SearchQuery = z.infer<typeof searchQuerySchema>;
export type EvaluationReportQuery = z.infer<typeof evaluationReportQuerySchema>;
