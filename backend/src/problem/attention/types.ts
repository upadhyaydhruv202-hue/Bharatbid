export const ATTENTION_MODEL_VERSION = 'attention-v1';

export const ATTENTION_FACTOR_TYPES = [
  'mandatory_evidence_missing',
  'optional_evidence_missing',
  'evidence_processing',
  'verification_mismatch',
  'verification_not_found',
  'verification_error',
  'cross_source_inconsistency',
  'evidence_conflict',
  'cross_insufficient_evidence',
  'cross_source_error',
  'officer_review_required',
  'requirement_unevaluated',
] as const;
export type AttentionFactorType = (typeof ATTENTION_FACTOR_TYPES)[number];

export const ATTENTION_CATEGORIES = [
  'evidence',
  'verification',
  'cross',
  'source_availability',
  'review',
  'processing',
] as const;
export type AttentionCategory = (typeof ATTENTION_CATEGORIES)[number];

export const ATTENTION_ORIGINS = ['machine', 'human'] as const;
export type AttentionOrigin = (typeof ATTENTION_ORIGINS)[number];

export const ATTENTION_BANDS = [
  'low_attention',
  'moderate_attention',
  'elevated_attention',
  'high_attention',
  'critical_attention',
] as const;
export type AttentionBand = (typeof ATTENTION_BANDS)[number];

export const ATTENTION_BAND_LABELS: Record<AttentionBand, string> = {
  low_attention: 'Low attention',
  moderate_attention: 'Moderate attention',
  elevated_attention: 'Elevated attention',
  high_attention: 'High attention',
  critical_attention: 'Critical attention',
};

export const ATTENTION_SOURCE_KINDS = [
  'requirement',
  'verification',
  'cross_check',
  'review',
  'document',
] as const;
export type AttentionSourceKind = (typeof ATTENTION_SOURCE_KINDS)[number];

export const DEMO_ATTENTION_ADVISORY =
  'Decision-support only: This indicator prioritizes bids for human review using available evidence, verification, cross-check and review signals. It does not determine bidder eligibility, fraud, rejection or award.';

export const DEMO_ATTENTION_SCORE_HINT =
  'Review-priority indicator based on available evidence, verification, cross-check and review signals.';

export interface AttentionRequirementSignal {
  id: string;
  name: string;
  mandatory: boolean;
  evidenceStatus: string;
  evaluation: string;
  verificationId?: string | null;
  verificationSource?: string | null;
  crossVerificationId?: string | null;
  comparisonType?: string | null;
}

export interface AttentionVerificationSignal {
  id: string;
  source: string;
  status: string;
}

export interface AttentionCrossSignal {
  id: string;
  comparisonType: string;
  status: string;
  leftSource: string;
  rightSource: string;
}

export interface AttentionReviewSignal {
  id: string;
  issueType: string;
  status: string;
  title: string;
  mandatory: boolean;
  fingerprint: string;
  requirementId?: string | null;
  verificationId?: string | null;
  verificationSource?: string | null;
  crossVerificationId?: string | null;
  comparisonType?: string | null;
  latestAssessment?: string | null;
  clarificationStatus?: 'requested' | 'responded' | null;
  updatedAt?: string | null;
}

export interface AttentionDocumentSignal {
  id: string;
  tenderRequirementId?: string | null;
  extractionStatus: string;
}

export interface AttentionInput {
  requirements: AttentionRequirementSignal[];
  verifications: AttentionVerificationSignal[];
  crossChecks: AttentionCrossSignal[];
  reviews: AttentionReviewSignal[];
  documents: AttentionDocumentSignal[];
}

export interface AttentionFactorSource {
  kind: AttentionSourceKind;
  id: string;
  label: string;
}

export interface AttentionFactor {
  id: string;
  type: AttentionFactorType;
  category: AttentionCategory;
  origin: AttentionOrigin;
  originalPoints: number;
  currentPoints: number;
  description: string;
  adjustmentReason: string | null;
  source: AttentionFactorSource;
  clusterKeys: string[];
}

export interface AttentionHistoryEntry {
  score: number;
  label: string;
  reason: string;
}

export interface AttentionResult {
  modelVersion: typeof ATTENTION_MODEL_VERSION;
  score: number;
  unadjustedScore: number;
  band: AttentionBand;
  bandLabel: string;
  factors: AttentionFactor[];
  openIssues: number;
  pendingClarifications: number;
  history: AttentionHistoryEntry[];
}
