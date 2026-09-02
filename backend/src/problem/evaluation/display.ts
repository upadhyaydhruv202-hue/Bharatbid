import type { EvidenceStatusName, RequirementEvaluationName } from '../intelligence/types';
import type { RequirementCellStatusName } from './types';

export function requirementCellStatus(
  evidenceStatus: EvidenceStatusName,
  evaluation: RequirementEvaluationName,
): RequirementCellStatusName {
  if (evaluation === 'pass') {
    return 'pass';
  }
  if (evidenceStatus === 'evidence_missing') {
    return 'evidence_missing';
  }
  if (evidenceStatus === 'evidence_processing') {
    return 'processing';
  }
  if (evidenceStatus === 'evidence_conflict') {
    return 'conflict';
  }
  if (evaluation === 'review_required') {
    return 'review_required';
  }
  return 'not_evaluated';
}

export function verificationComparisonLabel(summary: {
  total: number;
  matched: number;
  mismatched: number;
  notFound: number;
  errors: number;
}): string {
  if (summary.total === 0) {
    return 'Not run';
  }
  if (summary.mismatched > 0) {
    return 'Mismatch';
  }
  if (summary.notFound > 0 || summary.errors > 0) {
    return 'Issues';
  }
  if (summary.matched === summary.total) {
    return 'Matched';
  }
  return 'Partial';
}

export function crossCheckComparisonLabel(summary: {
  total: number;
  consistent: number;
  inconsistent: number;
}): string {
  if (summary.total === 0) {
    return 'Not run';
  }
  if (summary.inconsistent > 0) {
    return 'Inconsistent';
  }
  if (summary.consistent === summary.total) {
    return 'Consistent';
  }
  return 'Not comparable';
}
