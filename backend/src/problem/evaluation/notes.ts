import { ValidationError } from '../../errors';
import { normalizeOfficerNote } from '../review/notes';

const TRIVIAL = /^(ok|okay|yes|no|fine|done|noted|agreed|lgtm|\.+|-+)$/i;

export function assertEvaluationNote(note: string): string {
  const normalized = normalizeOfficerNote(note);
  if (normalized.length < 20) {
    throw new ValidationError('Evaluation notes need a written explanation', [
      {
        path: 'note',
        message: 'Provide at least 20 characters describing the evidence considered',
        code: 'custom',
      },
    ]);
  }
  if (TRIVIAL.test(normalized)) {
    throw new ValidationError('Evaluation notes need a written explanation', [
      { path: 'note', message: 'A one-word acknowledgement is not sufficient', code: 'custom' },
    ]);
  }
  return normalized;
}

export function assertDecisionReason(reason: string): string {
  const normalized = normalizeOfficerNote(reason);
  if (normalized.length < 20) {
    throw new ValidationError('Officer decisions need a written reason', [
      {
        path: 'reason',
        message: 'Provide at least 20 characters explaining the officer judgement',
        code: 'custom',
      },
    ]);
  }
  if (TRIVIAL.test(normalized)) {
    throw new ValidationError('Officer decisions need a written reason', [
      { path: 'reason', message: 'A one-word acknowledgement is not sufficient', code: 'custom' },
    ]);
  }
  return normalized;
}
