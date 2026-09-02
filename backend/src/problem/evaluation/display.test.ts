import { describe, expect, it } from 'vitest';

import { requirementCellStatus, verificationComparisonLabel, crossCheckComparisonLabel } from './display';

describe('requirement cell display', () => {
  it('keeps EVIDENCE_MISSING instead of converting to FAIL', () => {
    expect(requirementCellStatus('evidence_missing', 'not_evaluated')).toBe('evidence_missing');
    expect(requirementCellStatus('evidence_missing', 'fail')).toBe('evidence_missing');
  });

  it('maps pass, conflict, processing, and review without inventing FAIL', () => {
    expect(requirementCellStatus('evidence_available', 'pass')).toBe('pass');
    expect(requirementCellStatus('evidence_conflict', 'review_required')).toBe('conflict');
    expect(requirementCellStatus('evidence_processing', 'review_required')).toBe('processing');
    expect(requirementCellStatus('evidence_available', 'review_required')).toBe('review_required');
    expect(requirementCellStatus('not_evaluated', 'not_evaluated')).toBe('not_evaluated');
  });
});

describe('comparison labels', () => {
  it('labels verification and cross-check summaries without ranking', () => {
    expect(verificationComparisonLabel({ total: 2, matched: 2, mismatched: 0, notFound: 0, errors: 0 })).toBe('Matched');
    expect(verificationComparisonLabel({ total: 2, matched: 1, mismatched: 1, notFound: 0, errors: 0 })).toBe('Mismatch');
    expect(crossCheckComparisonLabel({ total: 1, consistent: 1, inconsistent: 0 })).toBe('Consistent');
    expect(crossCheckComparisonLabel({ total: 1, consistent: 0, inconsistent: 1 })).toBe('Inconsistent');
  });
});
