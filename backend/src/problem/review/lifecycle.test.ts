import { describe, expect, it } from 'vitest';

import { ValidationError } from '../../errors';
import { assertReviewTransition, nextStatusForAssessment } from './lifecycle';

describe('review lifecycle', () => {
  it('allows open to in_review and assessed to closed', () => {
    expect(() => assertReviewTransition('open', 'in_review', 'start')).not.toThrow();
    expect(() => assertReviewTransition('assessed', 'closed', 'close')).not.toThrow();
    expect(nextStatusForAssessment('open', 'evidence_sufficient')).toBe('assessed');
    expect(nextStatusForAssessment('in_review', 'requires_clarification')).toBe('clarification_requested');
  });

  it('rejects arbitrary jumps including closing an open item', () => {
    expect(() => assertReviewTransition('open', 'closed', 'close')).toThrow(ValidationError);
    expect(() => assertReviewTransition('open', 'assessed', 'start')).toThrow(ValidationError);
    expect(() => assertReviewTransition('closed', 'open', 'start')).toThrow(ValidationError);
    expect(() => nextStatusForAssessment('closed', 'confirmed')).toThrow(ValidationError);
  });
});
