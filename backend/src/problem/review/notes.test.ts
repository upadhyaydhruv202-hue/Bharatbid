import { describe, expect, it } from 'vitest';

import { ValidationError } from '../../errors';
import { assertClarificationMessage, assertOfficerNote } from './notes';

describe('officer notes', () => {
  it('requires a substantial explanation for important assessments', () => {
    expect(() => assertOfficerNote('confirmed', 'ok')).toThrow(ValidationError);
    expect(() => assertOfficerNote('explanation_accepted', 'yes')).toThrow(ValidationError);
    expect(() => assertOfficerNote('evidence_sufficient', 'fine')).toThrow(ValidationError);
    const note = assertOfficerNote(
      'explanation_accepted',
      'GST uses an abbreviated company suffix while MCA contains the expanded legal name.',
    );
    expect(note).toContain('abbreviated company suffix');
  });

  it('rejects trivial clarification messages', () => {
    expect(() => assertClarificationMessage('ok')).toThrow(ValidationError);
    expect(
      assertClarificationMessage('Please provide the current Udyam Registration Certificate.'),
    ).toContain('Udyam');
  });
});
