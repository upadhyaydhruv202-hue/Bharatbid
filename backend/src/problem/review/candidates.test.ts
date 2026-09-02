import { describe, expect, it } from 'vitest';

import { candidatesFromIntelligence } from './candidates';

describe('review candidates', () => {
  it('creates evidence missing and review required candidates without fraud language', () => {
    const candidates = candidatesFromIntelligence({
      items: [
        {
          requirementId: 'req-1',
          name: 'Udyam evidence',
          mandatory: true,
          evidenceStatus: 'evidence_missing',
          evaluation: 'not_evaluated',
          explanation: 'No relevant evidence is associated with this requirement.',
          documents: [],
          verification: null,
          crossCheck: null,
        },
        {
          requirementId: 'req-2',
          name: 'Technical experience',
          mandatory: true,
          evidenceStatus: 'evidence_available',
          evaluation: 'review_required',
          explanation: 'Requires officer assessment.',
          documents: [{ id: 'doc-1' }],
          verification: null,
          crossCheck: null,
        },
      ],
      crossChecks: [
        {
          id: 'cross-1',
          status: 'inconsistent',
          comparisonType: 'gst_mca',
          comparisonLabel: 'GST ↔ MCA',
        },
        {
          id: 'cross-2',
          status: 'insufficient_evidence',
          comparisonType: 'gst_mca',
          comparisonLabel: 'GST ↔ MCA',
        },
      ],
    });
    expect(candidates.map((item) => item.issueType)).toEqual([
      'evidence_missing',
      'review_required',
      'cross_source_inconsistency',
      'source_unavailable',
    ]);
    expect(candidates.some((item) => /fraudulent|fake bidder|criminal/i.test(`${item.title} ${item.actionHint}`))).toBe(
      false,
    );
    expect(candidates.find((item) => item.issueType === 'source_unavailable')?.machineFinding).toBe(
      'INSUFFICIENT_EVIDENCE',
    );
  });
});
