import type { AttentionBand, AttentionCategory, AttentionFactorType } from './types';

/** Deterministic scoring rules for attention-v1. Not an ML model. */
export const ATTENTION_WEIGHTS: Record<AttentionFactorType, number> = {
  mandatory_evidence_missing: 20,
  optional_evidence_missing: 5,
  evidence_processing: 5,
  verification_mismatch: 20,
  verification_not_found: 10,
  verification_error: 8,
  cross_source_inconsistency: 22,
  evidence_conflict: 18,
  cross_insufficient_evidence: 8,
  cross_source_error: 8,
  officer_review_required: 12,
  requirement_unevaluated: 8,
};

export const ATTENTION_CATEGORY_FOR_TYPE: Record<AttentionFactorType, AttentionCategory> = {
  mandatory_evidence_missing: 'evidence',
  optional_evidence_missing: 'evidence',
  evidence_processing: 'processing',
  verification_mismatch: 'verification',
  verification_not_found: 'source_availability',
  verification_error: 'source_availability',
  cross_source_inconsistency: 'cross',
  evidence_conflict: 'cross',
  cross_insufficient_evidence: 'source_availability',
  cross_source_error: 'source_availability',
  officer_review_required: 'review',
  requirement_unevaluated: 'review',
};

/**
 * Caps prevent one issue class from reaching 100 alone.
 * Evidence (40) cannot fill the scale without verification, cross-check, or review signals.
 */
export const ATTENTION_CATEGORY_CAPS: Record<AttentionCategory, number> = {
  evidence: 40,
  verification: 30,
  cross: 25,
  source_availability: 16,
  review: 24,
  processing: 10,
};

export const ATTENTION_SCORE_MIN = 0;
export const ATTENTION_SCORE_MAX = 100;

export const ATTENTION_BAND_RANGES: Array<{ band: AttentionBand; min: number; max: number }> = [
  { band: 'low_attention', min: 0, max: 20 },
  { band: 'moderate_attention', min: 21, max: 40 },
  { band: 'elevated_attention', min: 41, max: 60 },
  { band: 'high_attention', min: 61, max: 80 },
  { band: 'critical_attention', min: 81, max: 100 },
];

export const RESOLVING_ASSESSMENTS = ['explanation_accepted', 'evidence_sufficient', 'not_applicable'] as const;

export const UNRESOLVED_REVIEW_STATUSES = ['open', 'in_review', 'clarification_requested'] as const;
