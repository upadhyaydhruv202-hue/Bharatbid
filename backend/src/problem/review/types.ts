export const REVIEW_ISSUE_TYPES = [
  'evidence_missing',
  'verification_mismatch',
  'cross_source_inconsistency',
  'evidence_conflict',
  'review_required',
  'source_unavailable',
  'requirement_unevaluated',
] as const;
export type ReviewIssueTypeName = (typeof REVIEW_ISSUE_TYPES)[number];

export const REVIEW_ITEM_STATUSES = [
  'open',
  'in_review',
  'clarification_requested',
  'assessed',
  'closed',
] as const;
export type ReviewItemStatusName = (typeof REVIEW_ITEM_STATUSES)[number];

export const REVIEW_ASSESSMENT_TYPES = [
  'confirmed',
  'explanation_accepted',
  'evidence_sufficient',
  'evidence_insufficient',
  'requires_clarification',
  'not_applicable',
] as const;
export type ReviewAssessmentTypeName = (typeof REVIEW_ASSESSMENT_TYPES)[number];

export const REVIEW_CLARIFICATION_STATUSES = ['requested', 'responded', 'cancelled'] as const;
export type ReviewClarificationStatusName = (typeof REVIEW_CLARIFICATION_STATUSES)[number];

export const ASSESSMENTS_REQUIRING_NOTE: ReviewAssessmentTypeName[] = [
  'confirmed',
  'explanation_accepted',
  'evidence_sufficient',
  'evidence_insufficient',
  'not_applicable',
];

export const REVIEW_ISSUE_LABELS: Record<ReviewIssueTypeName, string> = {
  evidence_missing: 'Evidence missing',
  verification_mismatch: 'Verification mismatch',
  cross_source_inconsistency: 'Cross-source inconsistency',
  evidence_conflict: 'Evidence conflict',
  review_required: 'Officer review required',
  source_unavailable: 'Source unavailable',
  requirement_unevaluated: 'Requirement unevaluated',
};

export const REVIEW_STATUS_LABELS: Record<ReviewItemStatusName, string> = {
  open: 'Open',
  in_review: 'In review',
  clarification_requested: 'Clarification requested',
  assessed: 'Assessed',
  closed: 'Closed',
};

export const REVIEW_ASSESSMENT_LABELS: Record<ReviewAssessmentTypeName, string> = {
  confirmed: 'Confirmed',
  explanation_accepted: 'Explanation accepted',
  evidence_sufficient: 'Evidence sufficient',
  evidence_insufficient: 'Evidence insufficient',
  requires_clarification: 'Requires clarification',
  not_applicable: 'Not applicable',
};

export const DEMO_REVIEW_ADVISORY =
  'Decision support only. Officer assessments do not approve, reject, or award a bid.';

export const DEMO_CLARIFICATION_ADVISORY =
  'DEMO / SYNTHETIC — this clarification is stored in-app. No bidder email or government message was sent.';
