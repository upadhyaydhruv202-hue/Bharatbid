export const TENDER_EVALUATION_STATUSES = [
  'not_started',
  'in_progress',
  'ready_for_decision',
  'decision_recorded',
] as const;

export type TenderEvaluationStatusName = (typeof TENDER_EVALUATION_STATUSES)[number];

export const EVALUATION_DECISION_TYPES = [
  'accepted_for_further_evaluation',
  'requires_clarification',
  'not_recommended_for_further_evaluation',
] as const;

export type EvaluationDecisionTypeName = (typeof EVALUATION_DECISION_TYPES)[number];

export const EVALUATION_READINESS_STATUSES = [
  'ready',
  'review_required',
  'evidence_incomplete',
  'clarification_pending',
] as const;

export type EvaluationReadinessName = (typeof EVALUATION_READINESS_STATUSES)[number];

export const REQUIREMENT_CELL_STATUSES = [
  'pass',
  'evidence_missing',
  'processing',
  'conflict',
  'review_required',
  'not_evaluated',
] as const;

export type RequirementCellStatusName = (typeof REQUIREMENT_CELL_STATUSES)[number];

export const EVALUABLE_BID_STATUSES = ['submitted', 'under_review', 'finalized'] as const;

export const MAX_COMPARISON_BIDS = 4;
export const DEFAULT_COMPARISON_BIDS = 3;

export const EVALUATION_STATUS_LABELS: Record<TenderEvaluationStatusName, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  ready_for_decision: 'Ready for decision',
  decision_recorded: 'Decision recorded',
};

export const EVALUATION_DECISION_LABELS: Record<EvaluationDecisionTypeName, string> = {
  accepted_for_further_evaluation: 'Accepted for further evaluation',
  requires_clarification: 'Requires clarification',
  not_recommended_for_further_evaluation: 'Not recommended for further evaluation',
};

export const EVALUATION_READINESS_LABELS: Record<EvaluationReadinessName, string> = {
  ready: 'READY',
  review_required: 'REVIEW_REQUIRED',
  evidence_incomplete: 'EVIDENCE_INCOMPLETE',
  clarification_pending: 'CLARIFICATION_PENDING',
};

export const REQUIREMENT_CELL_LABELS: Record<RequirementCellStatusName, string> = {
  pass: 'PASS',
  evidence_missing: 'EVIDENCE_MISSING',
  processing: 'PROCESSING',
  conflict: 'CONFLICT',
  review_required: 'REVIEW_REQUIRED',
  not_evaluated: 'NOT_EVALUATED',
};

export const DEMO_EVALUATION_ADVISORY =
  'This workspace supports human procurement evaluation using available evidence and system findings. Final procurement decisions remain with authorized officers. BharatBid does not automatically rank bidders, select winners, reject bids, or award tenders.';

export const DEMO_DECISION_ADVISORY =
  'Officer-entered decision-support record. This is not an award, rejection, disqualification, or automated system decision.';

export const FINANCIAL_UNAVAILABLE = 'Not available in current bid data';
