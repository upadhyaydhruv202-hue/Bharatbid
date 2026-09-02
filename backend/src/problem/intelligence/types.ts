import type { VerificationSourceModeName, VerificationSourceName } from '../verification/types';

export const CROSS_COMPARISON_TYPES = ['gst_mca', 'gst_udyam', 'mca_udyam'] as const;
export type CrossComparisonTypeName = (typeof CROSS_COMPARISON_TYPES)[number];

export const CROSS_VERIFICATION_STATUSES = [
  'consistent',
  'inconsistent',
  'insufficient_evidence',
  'not_comparable',
  'error',
] as const;
export type CrossVerificationStatusName = (typeof CROSS_VERIFICATION_STATUSES)[number];

export const CROSS_SOURCE_BASES = ['demo', 'external', 'mixed'] as const;
export type CrossSourceBasisName = (typeof CROSS_SOURCE_BASES)[number];

export const CROSS_FIELD_OUTCOMES = [
  'exact_match',
  'normalized_match',
  'difference',
  'missing_from_left',
  'missing_from_right',
  'not_comparable',
] as const;
export type CrossFieldOutcomeName = (typeof CROSS_FIELD_OUTCOMES)[number];

export const EVIDENCE_STATUSES = [
  'evidence_available',
  'evidence_missing',
  'evidence_processing',
  'evidence_conflict',
  'not_evaluated',
] as const;
export type EvidenceStatusName = (typeof EVIDENCE_STATUSES)[number];

export const REQUIREMENT_EVALUATIONS = ['pass', 'fail', 'review_required', 'not_evaluated'] as const;
export type RequirementEvaluationName = (typeof REQUIREMENT_EVALUATIONS)[number];

export const COMPARISON_SOURCE_PAIRS: Record<
  CrossComparisonTypeName,
  { left: VerificationSourceName; right: VerificationSourceName; label: string }
> = {
  gst_mca: { left: 'gst', right: 'mca', label: 'GST ↔ MCA' },
  gst_udyam: { left: 'gst', right: 'udyam', label: 'GST ↔ Udyam' },
  mca_udyam: { left: 'mca', right: 'udyam', label: 'MCA ↔ Udyam' },
};

export const CROSS_COMPARISON_LABELS: Record<CrossComparisonTypeName, string> = {
  gst_mca: 'GST ↔ MCA',
  gst_udyam: 'GST ↔ Udyam',
  mca_udyam: 'MCA ↔ Udyam',
};

export const DEMO_CROSS_ADVISORY =
  'Demo source — simulated verification data. Not an official government response.';

export const MIXED_SOURCE_ADVISORY =
  'Mixed source basis — at least one underlying check is simulated. This result is not an official government verification.';

export const INSUFFICIENT_NOT_FOUND =
  'A source record was not found in the available demo source. This does not by itself establish bidder invalidity.';

export interface CrossFieldComparison {
  field: string;
  label: string;
  outcome: CrossFieldOutcomeName;
  leftValue: string | null;
  rightValue: string | null;
  note: string;
}

export function comparisonTypeForSources(
  a: VerificationSourceName,
  b: VerificationSourceName,
): CrossComparisonTypeName | null {
  const pair = [a, b].sort().join('_');
  if (pair === 'gst_mca') return 'gst_mca';
  if (pair === 'gst_udyam') return 'gst_udyam';
  if (pair === 'mca_udyam') return 'mca_udyam';
  return null;
}

export function sourceBasis(
  left: VerificationSourceModeName,
  right: VerificationSourceModeName,
): CrossSourceBasisName {
  if (left === right) {
    return left;
  }
  return 'mixed';
}
