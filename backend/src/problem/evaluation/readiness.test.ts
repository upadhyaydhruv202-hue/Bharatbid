import { describe, expect, it } from 'vitest';

import { evaluationChecklist, evaluationReadiness } from './readiness';

describe('evaluation readiness', () => {
  it('prioritizes clarification, then missing evidence, then unresolved review', () => {
    expect(
      evaluationReadiness({
        pendingClarifications: 1,
        mandatoryEvidenceMissing: true,
        unresolvedBlockingReviews: true,
        mandatoryConflicts: false,
      }),
    ).toBe('clarification_pending');
    expect(
      evaluationReadiness({
        pendingClarifications: 0,
        mandatoryEvidenceMissing: true,
        unresolvedBlockingReviews: true,
        mandatoryConflicts: false,
      }),
    ).toBe('evidence_incomplete');
    expect(
      evaluationReadiness({
        pendingClarifications: 0,
        mandatoryEvidenceMissing: false,
        unresolvedBlockingReviews: true,
        mandatoryConflicts: false,
      }),
    ).toBe('review_required');
    expect(
      evaluationReadiness({
        pendingClarifications: 0,
        mandatoryEvidenceMissing: false,
        unresolvedBlockingReviews: false,
        mandatoryConflicts: false,
      }),
    ).toBe('ready');
  });

  it('derives checklist from system state rather than officer checkboxes', () => {
    const items = evaluationChecklist({
      hasRequirements: true,
      evidenceInspected: true,
      verificationInspected: true,
      crossChecksInspected: false,
      openReviewsResolved: false,
      clarificationsReviewed: true,
      notesRecorded: false,
    });
    expect(items.find((item) => item.id === 'cross_checks')?.passed).toBe(false);
    expect(items.find((item) => item.id === 'open_reviews')?.passed).toBe(false);
    expect(items.find((item) => item.id === 'notes')?.passed).toBe(false);
    expect(items.find((item) => item.id === 'requirements')?.passed).toBe(true);
  });
});
