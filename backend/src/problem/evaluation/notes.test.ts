import { describe, expect, it } from 'vitest';

import { ValidationError } from '../../errors';
import { assertDecisionReason, assertEvaluationNote } from './notes';

describe('evaluation notes', () => {
  it('requires a substantive officer explanation', () => {
    expect(() => assertEvaluationNote('ok')).toThrow(ValidationError);
    expect(() => assertEvaluationNote('short')).toThrow(ValidationError);
    expect(assertEvaluationNote('Technical documentation requires additional clarification before evaluation.')).toContain(
      'Technical documentation',
    );
  });

  it('requires a written decision reason', () => {
    expect(() => assertDecisionReason('fine')).toThrow(ValidationError);
    expect(assertDecisionReason('Clarification is required on Udyam evidence before further evaluation.')).toContain(
      'Clarification',
    );
  });
});
