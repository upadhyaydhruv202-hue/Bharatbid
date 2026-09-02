import { ValidationError } from '../../errors';
import type { TenderEvaluationStatusName } from './types';

const START: Partial<Record<TenderEvaluationStatusName, TenderEvaluationStatusName[]>> = {
  not_started: ['in_progress'],
};

const READY: Partial<Record<TenderEvaluationStatusName, TenderEvaluationStatusName[]>> = {
  in_progress: ['ready_for_decision'],
};

const RECORD: Partial<Record<TenderEvaluationStatusName, TenderEvaluationStatusName[]>> = {
  ready_for_decision: ['decision_recorded'],
};

const ACTIONS = {
  start: START,
  ready: READY,
  record: RECORD,
} as const;

export type EvaluationStatusAction = keyof typeof ACTIONS;

export function assertEvaluationTransition(
  from: TenderEvaluationStatusName,
  to: TenderEvaluationStatusName,
  action: EvaluationStatusAction,
): void {
  const allowed = ACTIONS[action][from] ?? [];
  if (!allowed.includes(to)) {
    throw new ValidationError('This evaluation status change is not allowed', [
      {
        path: 'status',
        message: `Cannot ${action} an evaluation that is ${from.replace(/_/g, ' ')}`,
        code: 'custom',
      },
    ]);
  }
}

export function canRecordDecision(status: TenderEvaluationStatusName): boolean {
  return status === 'in_progress' || status === 'ready_for_decision' || status === 'decision_recorded';
}

export function canAddNote(status: TenderEvaluationStatusName): boolean {
  return status !== 'not_started';
}
