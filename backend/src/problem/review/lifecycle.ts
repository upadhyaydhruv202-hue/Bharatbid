import { ValidationError } from '../../errors';
import type { ReviewItemStatusName } from './types';

const START: Partial<Record<ReviewItemStatusName, ReviewItemStatusName[]>> = {
  open: ['in_review'],
};

const ASSESS: Partial<Record<ReviewItemStatusName, ReviewItemStatusName[]>> = {
  open: ['assessed', 'clarification_requested'],
  in_review: ['assessed', 'clarification_requested'],
  clarification_requested: ['clarification_requested'],
  assessed: ['assessed', 'clarification_requested'],
};

const REQUEST_CLARIFICATION: Partial<Record<ReviewItemStatusName, ReviewItemStatusName[]>> = {
  open: ['clarification_requested'],
  in_review: ['clarification_requested'],
  assessed: ['clarification_requested'],
};

const AFTER_RESPONSE: Partial<Record<ReviewItemStatusName, ReviewItemStatusName[]>> = {
  clarification_requested: ['in_review'],
};

const CLOSE: Partial<Record<ReviewItemStatusName, ReviewItemStatusName[]>> = {
  assessed: ['closed'],
};

export function assertReviewTransition(
  from: ReviewItemStatusName,
  to: ReviewItemStatusName,
  kind: 'start' | 'assess' | 'clarify' | 'respond' | 'close',
): void {
  const table =
    kind === 'start'
      ? START
      : kind === 'assess'
        ? ASSESS
        : kind === 'clarify'
          ? REQUEST_CLARIFICATION
          : kind === 'respond'
            ? AFTER_RESPONSE
            : CLOSE;
  const allowed = table[from] ?? [];
  if (!allowed.includes(to)) {
    throw new ValidationError('That review status change is not allowed', [
      { path: 'status', message: `Cannot move from ${from} to ${to}`, code: 'custom' },
    ]);
  }
}

export function nextStatusForAssessment(
  current: ReviewItemStatusName,
  assessment: 'requires_clarification' | string,
): ReviewItemStatusName {
  const to = assessment === 'requires_clarification' ? 'clarification_requested' : 'assessed';
  assertReviewTransition(current, to, 'assess');
  return to;
}
