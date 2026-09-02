import type { EvaluationReadinessName } from './types';

export interface ReadinessInput {
  pendingClarifications: number;
  mandatoryEvidenceMissing: boolean;
  unresolvedBlockingReviews: boolean;
  mandatoryConflicts: boolean;
}

export function evaluationReadiness(input: ReadinessInput): EvaluationReadinessName {
  if (input.pendingClarifications > 0) {
    return 'clarification_pending';
  }
  if (input.mandatoryEvidenceMissing) {
    return 'evidence_incomplete';
  }
  if (input.unresolvedBlockingReviews || input.mandatoryConflicts) {
    return 'review_required';
  }
  return 'ready';
}

export interface ChecklistInput {
  hasRequirements: boolean;
  evidenceInspected: boolean;
  verificationInspected: boolean;
  crossChecksInspected: boolean;
  openReviewsResolved: boolean;
  clarificationsReviewed: boolean;
  notesRecorded: boolean;
}

export interface ChecklistItem {
  id: string;
  label: string;
  passed: boolean;
}

export function evaluationChecklist(input: ChecklistInput): ChecklistItem[] {
  return [
    { id: 'requirements', label: 'Tender requirements reviewed', passed: input.hasRequirements },
    { id: 'evidence', label: 'Bid evidence inspected', passed: input.evidenceInspected },
    { id: 'verification', label: 'Government-source verification inspected', passed: input.verificationInspected },
    { id: 'cross_checks', label: 'Cross-source checks inspected', passed: input.crossChecksInspected },
    { id: 'open_reviews', label: 'Open review items resolved', passed: input.openReviewsResolved },
    { id: 'clarifications', label: 'Clarifications reviewed', passed: input.clarificationsReviewed },
    { id: 'notes', label: 'Officer evaluation notes recorded', passed: input.notesRecorded },
  ];
}
