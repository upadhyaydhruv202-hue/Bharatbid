import { Badge, type BadgeTone } from '../../ui';

const TENDER_LABELS: Record<string, string> = {
  draft: 'Draft',
  open: 'Open',
  under_evaluation: 'Under evaluation',
  closed: 'Closed',
  awarded: 'Awarded',
  cancelled: 'Cancelled',
};

const TENDER_TONES: Record<string, BadgeTone> = {
  draft: 'neutral',
  open: 'success',
  under_evaluation: 'info',
  closed: 'warning',
  awarded: 'accent',
  cancelled: 'danger',
};

const BID_LABELS: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  under_review: 'Under review',
  withdrawn: 'Withdrawn',
  finalized: 'Finalized',
};

const BID_TONES: Record<string, BadgeTone> = {
  draft: 'neutral',
  submitted: 'info',
  under_review: 'warning',
  withdrawn: 'danger',
  finalized: 'success',
};

const DOCUMENT_STATUS_LABELS: Record<string, string> = {
  uploaded: 'Uploaded',
  processing: 'Processing',
  ready: 'Ready',
  failed: 'Failed',
  archived: 'Archived',
};

const DOCUMENT_STATUS_TONES: Record<string, BadgeTone> = {
  uploaded: 'info',
  processing: 'warning',
  ready: 'success',
  failed: 'danger',
  archived: 'neutral',
};

const EXTRACTION_STATUS_LABELS: Record<string, string> = {
  not_started: 'Not started',
  queued: 'Queued',
  processing: 'Processing',
  completed: 'Extracted',
  failed: 'Failed',
};

const EXTRACTION_STATUS_TONES: Record<string, BadgeTone> = {
  not_started: 'neutral',
  queued: 'info',
  processing: 'warning',
  completed: 'success',
  failed: 'danger',
};

const VERIFICATION_STATUS_LABELS: Record<string, string> = {
  not_started: 'Not started',
  queued: 'Queued',
  processing: 'Processing',
  matched: 'Matched',
  mismatched: 'Mismatched',
  not_found: 'Not found',
  error: 'Error',
};

const VERIFICATION_STATUS_TONES: Record<string, BadgeTone> = {
  not_started: 'neutral',
  queued: 'info',
  processing: 'warning',
  matched: 'success',
  mismatched: 'warning',
  not_found: 'info',
  error: 'danger',
};

const CROSS_STATUS_LABELS: Record<string, string> = {
  consistent: 'Consistent',
  inconsistent: 'Inconsistent',
  insufficient_evidence: 'Insufficient evidence',
  not_comparable: 'Not comparable',
  error: 'Error',
};

const CROSS_STATUS_TONES: Record<string, BadgeTone> = {
  consistent: 'success',
  inconsistent: 'warning',
  insufficient_evidence: 'info',
  not_comparable: 'neutral',
  error: 'danger',
};

const EVIDENCE_STATUS_LABELS: Record<string, string> = {
  evidence_available: 'Evidence available',
  evidence_missing: 'Evidence missing',
  evidence_processing: 'Evidence processing',
  evidence_conflict: 'Difference detected',
  not_evaluated: 'Not evaluated',
};

const EVIDENCE_STATUS_TONES: Record<string, BadgeTone> = {
  evidence_available: 'success',
  evidence_missing: 'warning',
  evidence_processing: 'info',
  evidence_conflict: 'warning',
  not_evaluated: 'neutral',
};

const EVALUATION_LABELS: Record<string, string> = {
  pass: 'Pass',
  fail: 'Fail',
  review_required: 'Requires officer review',
  not_evaluated: 'Not evaluated',
};

const EVALUATION_TONES: Record<string, BadgeTone> = {
  pass: 'success',
  fail: 'danger',
  review_required: 'warning',
  not_evaluated: 'neutral',
};

const REVIEW_STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  in_review: 'In review',
  clarification_requested: 'Clarification requested',
  assessed: 'Assessed',
  closed: 'Closed',
};

const REVIEW_STATUS_TONES: Record<string, BadgeTone> = {
  open: 'warning',
  in_review: 'info',
  clarification_requested: 'accent',
  assessed: 'success',
  closed: 'neutral',
};

const REVIEW_ISSUE_LABELS: Record<string, string> = {
  evidence_missing: 'Evidence missing',
  verification_mismatch: 'Verification mismatch',
  cross_source_inconsistency: 'Cross-source inconsistency',
  evidence_conflict: 'Evidence conflict',
  review_required: 'Officer review required',
  source_unavailable: 'Source unavailable',
  requirement_unevaluated: 'Requirement unevaluated',
};

const REVIEW_ISSUE_TONES: Record<string, BadgeTone> = {
  evidence_missing: 'warning',
  verification_mismatch: 'warning',
  cross_source_inconsistency: 'warning',
  evidence_conflict: 'warning',
  review_required: 'info',
  source_unavailable: 'neutral',
  requirement_unevaluated: 'neutral',
};

const ASSESSMENT_LABELS: Record<string, string> = {
  confirmed: 'Confirmed',
  explanation_accepted: 'Explanation accepted',
  evidence_sufficient: 'Evidence sufficient',
  evidence_insufficient: 'Evidence insufficient',
  requires_clarification: 'Requires clarification',
  not_applicable: 'Not applicable',
};

const ASSESSMENT_TONES: Record<string, BadgeTone> = {
  confirmed: 'warning',
  explanation_accepted: 'success',
  evidence_sufficient: 'success',
  evidence_insufficient: 'warning',
  requires_clarification: 'info',
  not_applicable: 'neutral',
};

const CLARIFICATION_LABELS: Record<string, string> = {
  requested: 'Requested',
  responded: 'Responded',
  cancelled: 'Cancelled',
};

const CLARIFICATION_TONES: Record<string, BadgeTone> = {
  requested: 'info',
  responded: 'success',
  cancelled: 'neutral',
};

const ATTENTION_BAND_LABELS: Record<string, string> = {
  low_attention: 'Low attention',
  moderate_attention: 'Moderate attention',
  elevated_attention: 'Elevated attention',
  high_attention: 'High attention',
  critical_attention: 'Critical attention',
};

const ATTENTION_BAND_TONES: Record<string, BadgeTone> = {
  low_attention: 'success',
  moderate_attention: 'info',
  elevated_attention: 'warning',
  high_attention: 'warning',
  critical_attention: 'danger',
};

const TENDER_EVALUATION_LABELS: Record<string, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  ready_for_decision: 'Ready for decision',
  decision_recorded: 'Decision recorded',
};

const TENDER_EVALUATION_TONES: Record<string, BadgeTone> = {
  not_started: 'neutral',
  in_progress: 'info',
  ready_for_decision: 'warning',
  decision_recorded: 'success',
};

const READINESS_LABELS: Record<string, string> = {
  ready: 'Ready',
  review_required: 'Review required',
  evidence_incomplete: 'Evidence incomplete',
  clarification_pending: 'Clarification pending',
};

const READINESS_TONES: Record<string, BadgeTone> = {
  ready: 'success',
  review_required: 'warning',
  evidence_incomplete: 'danger',
  clarification_pending: 'info',
};

const OFFICER_DECISION_LABELS: Record<string, string> = {
  accepted_for_further_evaluation: 'Accepted for further evaluation',
  requires_clarification: 'Requires clarification',
  not_recommended_for_further_evaluation: 'Not recommended for further evaluation',
};

const OFFICER_DECISION_TONES: Record<string, BadgeTone> = {
  accepted_for_further_evaluation: 'success',
  requires_clarification: 'info',
  not_recommended_for_further_evaluation: 'warning',
};

const REQUIREMENT_CELL_LABELS: Record<string, string> = {
  pass: 'PASS',
  evidence_missing: 'EVIDENCE_MISSING',
  processing: 'PROCESSING',
  conflict: 'CONFLICT',
  review_required: 'REVIEW_REQUIRED',
  not_evaluated: 'NOT_EVALUATED',
};

const REQUIREMENT_CELL_TONES: Record<string, BadgeTone> = {
  pass: 'success',
  evidence_missing: 'warning',
  processing: 'info',
  conflict: 'danger',
  review_required: 'warning',
  not_evaluated: 'neutral',
};

const KIND_MAP = {
  tender: { labels: TENDER_LABELS, tones: TENDER_TONES },
  bid: { labels: BID_LABELS, tones: BID_TONES },
  document: { labels: DOCUMENT_STATUS_LABELS, tones: DOCUMENT_STATUS_TONES },
  extraction: { labels: EXTRACTION_STATUS_LABELS, tones: EXTRACTION_STATUS_TONES },
  verification: { labels: VERIFICATION_STATUS_LABELS, tones: VERIFICATION_STATUS_TONES },
  cross: { labels: CROSS_STATUS_LABELS, tones: CROSS_STATUS_TONES },
  evidence: { labels: EVIDENCE_STATUS_LABELS, tones: EVIDENCE_STATUS_TONES },
  evaluation: { labels: EVALUATION_LABELS, tones: EVALUATION_TONES },
  review: { labels: REVIEW_STATUS_LABELS, tones: REVIEW_STATUS_TONES },
  issue: { labels: REVIEW_ISSUE_LABELS, tones: REVIEW_ISSUE_TONES },
  assessment: { labels: ASSESSMENT_LABELS, tones: ASSESSMENT_TONES },
  clarification: { labels: CLARIFICATION_LABELS, tones: CLARIFICATION_TONES },
  attention: { labels: ATTENTION_BAND_LABELS, tones: ATTENTION_BAND_TONES },
  tenderEvaluation: { labels: TENDER_EVALUATION_LABELS, tones: TENDER_EVALUATION_TONES },
  readiness: { labels: READINESS_LABELS, tones: READINESS_TONES },
  officerDecision: { labels: OFFICER_DECISION_LABELS, tones: OFFICER_DECISION_TONES },
  requirementCell: { labels: REQUIREMENT_CELL_LABELS, tones: REQUIREMENT_CELL_TONES },
} as const;

export function formatDate(value: string | null | undefined): string {
  if (!value) {
    return '—';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(date);
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return '—';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export function StatusBadge({
  value,
  kind,
}: {
  value: string;
  kind: keyof typeof KIND_MAP;
}) {
  const { labels, tones } = KIND_MAP[kind];
  return <Badge tone={tones[value] ?? 'neutral'}>{labels[value] ?? value.replace(/_/g, ' ')}</Badge>;
}

export function PresenceLabel({ value }: { value: 'provided' | 'not_provided' | boolean | string | null | undefined }) {
  const provided =
    value === true ||
    value === 'provided' ||
    (typeof value === 'string' && value !== 'not_provided' && value.trim().length > 0);
  return <span>{provided ? 'Provided' : 'Not provided'}</span>;
}

export const TENDER_STATUS_OPTIONS = Object.entries(TENDER_LABELS).map(([value, label]) => ({ value, label }));

export const BID_STATUS_OPTIONS = Object.entries(BID_LABELS).map(([value, label]) => ({ value, label }));

export const TENDER_CATEGORY_OPTIONS = [
  { value: 'Goods', label: 'Goods' },
  { value: 'Services', label: 'Services' },
  { value: 'Works', label: 'Works' },
  { value: 'IT', label: 'IT' },
  { value: 'Consultancy', label: 'Consultancy' },
  { value: 'Other', label: 'Other' },
];
export const REQUIREMENT_TYPE_OPTIONS = [
  { value: 'statutory', label: 'Statutory' },
  { value: 'eligibility', label: 'Eligibility' },
  { value: 'document', label: 'Document' },
  { value: 'financial', label: 'Financial' },
  { value: 'technical', label: 'Technical' },
  { value: 'organizational', label: 'Organizational' },
  { value: 'declaration', label: 'Declaration' },
  { value: 'tender_specific', label: 'Tender-specific' },
  { value: 'other', label: 'Other' },
];

export const BID_DOCUMENT_TYPE_OPTIONS = [
  { value: 'pan', label: 'PAN' },
  { value: 'gst_certificate', label: 'GST Certificate' },
  { value: 'cin', label: 'CIN' },
  { value: 'udyam_certificate', label: 'Udyam Certificate' },
  { value: 'financial_statement', label: 'Financial Statement' },
  { value: 'turnover_certificate', label: 'Turnover Certificate' },
  { value: 'bank_certificate', label: 'Bank Certificate' },
  { value: 'technical_qualification', label: 'Technical Qualification' },
  { value: 'experience_certificate', label: 'Experience Certificate' },
  { value: 'oem_authorization', label: 'OEM Authorization' },
  { value: 'product_datasheet', label: 'Product Datasheet' },
  { value: 'incorporation_certificate', label: 'Incorporation Certificate' },
  { value: 'authorization_letter', label: 'Authorization Letter' },
  { value: 'affidavit', label: 'Affidavit' },
  { value: 'declaration', label: 'Declaration' },
  { value: 'bid_form', label: 'Bid Form' },
  { value: 'tender_response', label: 'Tender Response' },
  { value: 'price_schedule', label: 'Price Schedule' },
  { value: 'epfo_certificate', label: 'EPFO Certificate' },
  { value: 'esic_certificate', label: 'ESIC Certificate' },
  { value: 'nsic_certificate', label: 'NSIC Certificate' },
  { value: 'dpiit_certificate', label: 'DPIIT Recognition' },
  { value: 'bis_licence', label: 'BIS Licence' },
  { value: 'other', label: 'Other Supporting Document' },
];

export const BID_DOCUMENT_CATEGORY_FILTERS = [
  { value: '', label: 'All' },
  { value: 'identity', label: 'Identity' },
  { value: 'financial', label: 'Financial' },
  { value: 'technical', label: 'Technical' },
  { value: 'legal', label: 'Legal' },
  { value: 'procurement', label: 'Procurement' },
  { value: 'other', label: 'Other' },
];

export const REVIEW_STATUS_OPTIONS = Object.entries(REVIEW_STATUS_LABELS).map(([value, label]) => ({ value, label }));

export const REVIEW_ISSUE_OPTIONS = Object.entries(REVIEW_ISSUE_LABELS).map(([value, label]) => ({ value, label }));

export const REVIEW_ASSESSMENT_OPTIONS = Object.entries(ASSESSMENT_LABELS).map(([value, label]) => ({ value, label }));

export const VERIFICATION_STATE_OPTIONS = Object.entries(VERIFICATION_STATUS_LABELS).map(([value, label]) => ({
  value,
  label,
}));

export const CROSS_CHECK_STATE_OPTIONS = Object.entries(CROSS_STATUS_LABELS).map(([value, label]) => ({
  value,
  label,
}));

export const ATTENTION_BAND_OPTIONS = Object.entries(ATTENTION_BAND_LABELS).map(([value, label]) => ({
  value,
  label,
}));

export const EVALUATION_DECISION_OPTIONS = Object.entries(OFFICER_DECISION_LABELS).map(([value, label]) => ({
  value,
  label,
}));
