import { describe, expect, it } from 'vitest';

import { evaluateRequirement, ruleForRequirement } from './requirements';
import type { RequirementEvidence } from './requirements';

const gstDocument = {
  id: 'doc-gst',
  originalFilename: 'DEMO_GST_Certificate.txt',
  documentType: 'gst_certificate',
  extractionStatus: 'completed',
  tenderRequirementId: 'req-gst',
};

function evidence(overrides: Partial<RequirementEvidence> = {}): RequirementEvidence {
  return {
    documents: [gstDocument],
    verification: { id: 'v-gst', status: 'matched', source: 'gst', identifierValue: '33AAAPB1234C1Z5' },
    crossCheck: { id: 'c-gst-mca', status: 'consistent', comparisonType: 'gst_mca' },
    ...overrides,
  };
}

describe('Requirement rules', () => {
  it('maps GST, PAN, Udyam, CIN, and technical names to small explainable rules', () => {
    expect(ruleForRequirement({ name: 'GST registration', requirementType: 'statutory' }).kind).toBe(
      'gst_verification',
    );
    expect(ruleForRequirement({ name: 'PAN of the bidding entity', requirementType: 'statutory' }).kind).toBe(
      'pan_verification',
    );
    expect(ruleForRequirement({ name: 'Udyam / MSME evidence if claimed', requirementType: 'eligibility' }).kind).toBe(
      'udyam',
    );
    expect(ruleForRequirement({ name: 'CIN / incorporation certificate', requirementType: 'statutory' }).kind).toBe(
      'cin_verification',
    );
    expect(ruleForRequirement({ name: 'Technical capability statement', requirementType: 'technical' }).kind).toBe(
      'officer_review',
    );
  });
});

describe('Requirement evaluation', () => {
  it('returns PASS when GST evidence is present and verification matched', () => {
    const result = evaluateRequirement(
      ruleForRequirement({ name: 'GST registration', requirementType: 'statutory' }),
      true,
      evidence(),
    );
    expect(result.evidenceStatus).toBe('evidence_available');
    expect(result.evaluation).toBe('pass');
    expect(result.explanation).toMatch(/matched the selected source record/i);
    expect(result.explanation.toLowerCase()).not.toMatch(/compliant|award|disqualified|fraud/);
    expect(result.review).toBe(false);
  });

  it('returns evidence missing for a mandatory requirement without documents, not FAIL', () => {
    const result = evaluateRequirement(
      ruleForRequirement({ name: 'Udyam Registration required', requirementType: 'eligibility' }),
      true,
      { documents: [], verification: null, crossCheck: null },
    );
    expect(result.evidenceStatus).toBe('evidence_missing');
    expect(result.evaluation).not.toBe('fail');
    expect(result.evaluation).toBe('not_evaluated');
    expect(result.review).toBe(true);
  });

  it('does not treat optional unused requirements as failed', () => {
    const result = evaluateRequirement(
      ruleForRequirement({ name: 'Udyam / MSME evidence if claimed', requirementType: 'eligibility' }),
      false,
      { documents: [], verification: null, crossCheck: null },
    );
    expect(result.evidenceStatus).toBe('not_evaluated');
    expect(result.evaluation).toBe('not_evaluated');
    expect(result.review).toBe(false);
  });

  it('requires officer review when GSTIN matched but a field difference exists', () => {
    const result = evaluateRequirement(
      ruleForRequirement({ name: 'GST registration', requirementType: 'statutory' }),
      true,
      evidence({ verification: { id: 'v-gst', status: 'mismatched', source: 'gst', identifierValue: 'x' } }),
    );
    expect(result.evidenceStatus).toBe('evidence_conflict');
    expect(result.evaluation).toBe('review_required');
    expect(result.explanation).toMatch(/officer review/i);
    expect(result.explanation.toLowerCase()).not.toMatch(/fraud detected/);
  });

  it('requires officer review when a cross-check is inconsistent', () => {
    const result = evaluateRequirement(
      ruleForRequirement({ name: 'GST registration', requirementType: 'statutory' }),
      true,
      evidence({ crossCheck: { id: 'c1', status: 'inconsistent', comparisonType: 'gst_mca' } }),
    );
    expect(result.evidenceStatus).toBe('evidence_conflict');
    expect(result.evaluation).toBe('review_required');
  });

  it('flags PAN evidence as available until a DEMO PAN source check is completed', () => {
    const result = evaluateRequirement(
      ruleForRequirement({ name: 'PAN of the bidding entity', requirementType: 'statutory' }),
      true,
      {
        documents: [
          {
            id: 'doc-pan',
            originalFilename: 'DEMO_PAN.txt',
            documentType: 'pan',
            extractionStatus: 'completed',
            tenderRequirementId: 'req-pan',
          },
        ],
        verification: null,
        crossCheck: null,
      },
    );
    expect(result.evidenceStatus).toBe('evidence_available');
    expect(result.evaluation).toBe('review_required');
    expect(result.explanation).toMatch(/source check has not been completed/i);
  });

  it('requires officer assessment for technical experience even when evidence exists', () => {
    const result = evaluateRequirement(
      ruleForRequirement({ name: 'Technical capability statement', requirementType: 'technical' }),
      true,
      {
        documents: [
          {
            id: 'doc-exp',
            originalFilename: 'DEMO_Experience.txt',
            documentType: 'experience_certificate',
            extractionStatus: 'completed',
            tenderRequirementId: 'req-tech',
          },
        ],
        verification: null,
        crossCheck: null,
      },
    );
    expect(result.evidenceStatus).toBe('evidence_available');
    expect(result.evaluation).toBe('review_required');
    expect(result.explanation).toMatch(/requires officer assessment/i);
    expect(result.explanation.toLowerCase()).not.toMatch(/compliant|pass/);
  });

  it('marks linked evidence as processing without evaluating compliance', () => {
    const result = evaluateRequirement(
      ruleForRequirement({ name: 'GST registration', requirementType: 'statutory' }),
      true,
      evidence({
        documents: [{ ...gstDocument, extractionStatus: 'processing' }],
        verification: null,
        crossCheck: null,
      }),
    );
    expect(result.evidenceStatus).toBe('evidence_processing');
    expect(result.evaluation).toBe('not_evaluated');
  });
});
