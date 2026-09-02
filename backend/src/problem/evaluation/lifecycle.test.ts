import { describe, expect, it } from 'vitest';

import { ValidationError } from '../../errors';
import { assertEvaluationTransition, canAddNote, canRecordDecision } from './lifecycle';

describe('evaluation lifecycle', () => {
  it('allows explicit officer transitions only', () => {
    expect(() => assertEvaluationTransition('not_started', 'in_progress', 'start')).not.toThrow();
    expect(() => assertEvaluationTransition('in_progress', 'ready_for_decision', 'ready')).not.toThrow();
    expect(() => assertEvaluationTransition('ready_for_decision', 'decision_recorded', 'record')).not.toThrow();
  });

  it('does not auto-complete from evidence or skip states', () => {
    expect(() => assertEvaluationTransition('not_started', 'decision_recorded', 'record')).toThrow(ValidationError);
    expect(() => assertEvaluationTransition('in_progress', 'decision_recorded', 'record')).toThrow(ValidationError);
    expect(() => assertEvaluationTransition('not_started', 'ready_for_decision', 'ready')).toThrow(ValidationError);
  });

  it('allows notes and decisions only after start', () => {
    expect(canAddNote('not_started')).toBe(false);
    expect(canAddNote('in_progress')).toBe(true);
    expect(canRecordDecision('not_started')).toBe(false);
    expect(canRecordDecision('in_progress')).toBe(true);
    expect(canRecordDecision('decision_recorded')).toBe(true);
  });
});
