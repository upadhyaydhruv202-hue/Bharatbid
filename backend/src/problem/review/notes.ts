import { ValidationError } from '../../errors';
import { ASSESSMENTS_REQUIRING_NOTE, type ReviewAssessmentTypeName } from './types';

const TRIVIAL = /^(ok|okay|yes|no|fine|done|noted|agreed|lgtm|\.+|-+)$/i;

export function normalizeOfficerNote(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

export function assertOfficerNote(assessment: ReviewAssessmentTypeName, note: string): string {
  const normalized = normalizeOfficerNote(note);
  const required = ASSESSMENTS_REQUIRING_NOTE.includes(assessment) || assessment === 'requires_clarification';
  if (!required) {
    if (!normalized) {
      throw new ValidationError('A short officer note is required', [
        { path: 'note', message: 'Explain the assessment', code: 'custom' },
      ]);
    }
    return normalized;
  }
  if (normalized.length < 20) {
    throw new ValidationError('This assessment needs a written explanation', [
      { path: 'note', message: 'Provide at least 20 characters describing the evidence considered', code: 'custom' },
    ]);
  }
  if (TRIVIAL.test(normalized)) {
    throw new ValidationError('This assessment needs a written explanation', [
      { path: 'note', message: 'A one-word acknowledgement is not sufficient', code: 'custom' },
    ]);
  }
  return normalized;
}

export function assertClarificationMessage(message: string): string {
  const normalized = normalizeOfficerNote(message);
  if (normalized.length < 20) {
    throw new ValidationError('Clarification requests need a clear instruction', [
      { path: 'message', message: 'Describe the information required in at least 20 characters', code: 'custom' },
    ]);
  }
  if (TRIVIAL.test(normalized)) {
    throw new ValidationError('Clarification requests need a clear instruction', [
      { path: 'message', message: 'A one-word request is not sufficient', code: 'custom' },
    ]);
  }
  return normalized;
}
