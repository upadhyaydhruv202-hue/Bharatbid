import { describe, expect, it } from 'vitest';

import { bandForScore, boundScore, scoreAttention } from './score';
import { ATTENTION_MODEL_VERSION, type AttentionInput } from './types';
import { ATTENTION_WEIGHTS } from './weights';

function empty(): AttentionInput {
  return { requirements: [], verifications: [], crossChecks: [], reviews: [], documents: [] };
}

describe('attention score range and version', () => {
  it('is deterministic, versioned, and bounded 0–100', () => {
    const input: AttentionInput = {
      ...empty(),
      requirements: [
        { id: 'r1', name: 'PAN', mandatory: true, evidenceStatus: 'evidence_missing', evaluation: 'not_evaluated' },
        { id: 'r2', name: 'Technical', mandatory: true, evidenceStatus: 'evidence_missing', evaluation: 'not_evaluated' },
        { id: 'r3', name: 'Financial', mandatory: true, evidenceStatus: 'evidence_missing', evaluation: 'not_evaluated' },
        { id: 'r4', name: 'GST', mandatory: true, evidenceStatus: 'evidence_missing', evaluation: 'not_evaluated' },
      ],
    };
    const first = scoreAttention(input);
    const second = scoreAttention(input);
    expect(first).toEqual(second);
    expect(first.modelVersion).toBe(ATTENTION_MODEL_VERSION);
    expect(first.score).toBeGreaterThanOrEqual(0);
    expect(first.score).toBeLessThanOrEqual(100);
    expect(first.score).toBe(40);
    expect(bandForScore(0)).toBe('low_attention');
    expect(bandForScore(21)).toBe('moderate_attention');
    expect(bandForScore(41)).toBe('elevated_attention');
    expect(bandForScore(61)).toBe('high_attention');
    expect(bandForScore(81)).toBe('critical_attention');
    expect(boundScore(120)).toBe(100);
    expect(boundScore(-4)).toBe(0);
  });
});

describe('weighting and caps', () => {
  it('weights mandatory missing evidence higher than optional', () => {
    const mandatory = scoreAttention({
      ...empty(),
      requirements: [{ id: 'r1', name: 'GST', mandatory: true, evidenceStatus: 'evidence_missing', evaluation: 'not_evaluated' }],
    });
    const optional = scoreAttention({
      ...empty(),
      reviews: [
        {
          id: 'rev-opt',
          issueType: 'evidence_missing',
          status: 'open',
          title: 'Udyam',
          mandatory: false,
          fingerprint: 'requirement:r-udyam:evidence_missing',
          requirementId: 'r-udyam',
        },
      ],
    });
    expect(mandatory.score).toBe(ATTENTION_WEIGHTS.mandatory_evidence_missing);
    expect(optional.score).toBe(ATTENTION_WEIGHTS.optional_evidence_missing);
    expect(mandatory.score).toBeGreaterThan(optional.score);
  });

  it('caps evidence so many missing documents cannot reach 100 alone', () => {
    const result = scoreAttention({
      ...empty(),
      requirements: Array.from({ length: 8 }, (_, index) => ({
        id: `r${index}`,
        name: `Req ${index}`,
        mandatory: true,
        evidenceStatus: 'evidence_missing',
        evaluation: 'not_evaluated',
      })),
    });
    expect(result.score).toBe(40);
    expect(result.factors.some((factor) => /category cap/.test(factor.adjustmentReason ?? ''))).toBe(true);
  });
});

describe('no double counting', () => {
  it('does not stack GST mismatch, GST ↔ MCA inconsistency, and the related review item', () => {
    const result = scoreAttention({
      ...empty(),
      verifications: [{ id: 'v-gst', source: 'gst', status: 'mismatched' }],
      crossChecks: [
        { id: 'c-gst-mca', comparisonType: 'gst_mca', status: 'inconsistent', leftSource: 'gst', rightSource: 'mca' },
      ],
      reviews: [
        {
          id: 'rev-cross',
          issueType: 'cross_source_inconsistency',
          status: 'open',
          title: 'GST ↔ MCA difference',
          mandatory: true,
          fingerprint: 'cross:c-gst-mca:cross_source_inconsistency',
          verificationId: 'v-gst',
          verificationSource: 'gst',
          crossVerificationId: 'c-gst-mca',
          comparisonType: 'gst_mca',
        },
      ],
    });
    expect(result.factors.filter((factor) => factor.currentPoints > 0)).toHaveLength(1);
    expect(result.score).toBe(ATTENTION_WEIGHTS.cross_source_inconsistency);
    expect(result.factors[0]?.source.kind).toBe('review');
  });
});

describe('verification and cross-check signals', () => {
  it('adds mismatch, not found, and source error without calling them fraud', () => {
    const mismatch = scoreAttention({
      ...empty(),
      verifications: [{ id: 'v1', source: 'gst', status: 'mismatched' }],
    });
    const notFound = scoreAttention({
      ...empty(),
      verifications: [{ id: 'v1', source: 'gst', status: 'not_found' }],
    });
    const error = scoreAttention({
      ...empty(),
      verifications: [{ id: 'v1', source: 'gst', status: 'error' }],
    });
    expect(mismatch.score).toBe(20);
    expect(notFound.score).toBe(10);
    expect(error.score).toBe(8);
    expect(mismatch.factors[0]?.description.toLowerCase()).not.toMatch(
      /fraud probability|reject this bid|award probability|winner/,
    );
    expect(notFound.factors[0]?.description.toLowerCase()).toMatch(/does not by itself establish bidder invalidity/);
  });

  it('ignores matched, consistent, and not_comparable signals', () => {
    const result = scoreAttention({
      ...empty(),
      verifications: [{ id: 'v1', source: 'gst', status: 'matched' }],
      crossChecks: [
        { id: 'c1', comparisonType: 'gst_mca', status: 'consistent', leftSource: 'gst', rightSource: 'mca' },
        { id: 'c2', comparisonType: 'gst_udyam', status: 'not_comparable', leftSource: 'gst', rightSource: 'udyam' },
      ],
    });
    expect(result.score).toBe(0);
    expect(result.band).toBe('low_attention');
  });
});

describe('officer assessment and clarification', () => {
  it('keeps original points when an explanation is accepted but current contribution becomes 0', () => {
    const result = scoreAttention({
      ...empty(),
      reviews: [
        {
          id: 'rev-cross',
          issueType: 'cross_source_inconsistency',
          status: 'assessed',
          title: 'GST ↔ MCA difference',
          mandatory: true,
          fingerprint: 'cross:c1:cross_source_inconsistency',
          crossVerificationId: 'c1',
          comparisonType: 'gst_mca',
          latestAssessment: 'explanation_accepted',
        },
      ],
    });
    expect(result.factors[0]?.originalPoints).toBe(22);
    expect(result.factors[0]?.currentPoints).toBe(0);
    expect(result.score).toBe(0);
    expect(result.unadjustedScore).toBe(22);
    expect(result.history[0]?.score).toBe(22);
    expect(result.history[1]?.score).toBe(0);
    expect(result.factors[0]?.adjustmentReason).toMatch(/accepted an explanation/i);
  });

  it('does not drop points when clarification is requested or responded pending officer review', () => {
    const requested = scoreAttention({
      ...empty(),
      reviews: [
        {
          id: 'rev1',
          issueType: 'evidence_missing',
          status: 'clarification_requested',
          title: 'Udyam',
          mandatory: false,
          fingerprint: 'requirement:r1:evidence_missing',
          requirementId: 'r1',
          clarificationStatus: 'requested',
        },
      ],
    });
    const responded = scoreAttention({
      ...empty(),
      reviews: [
        {
          id: 'rev1',
          issueType: 'evidence_missing',
          status: 'in_review',
          title: 'Udyam',
          mandatory: false,
          fingerprint: 'requirement:r1:evidence_missing',
          requirementId: 'r1',
          clarificationStatus: 'responded',
        },
      ],
    });
    expect(requested.score).toBe(5);
    expect(responded.score).toBe(5);
    expect(responded.factors[0]?.adjustmentReason).toMatch(/pending officer review/i);
  });

  it('reduces current score when an open review is closed after a resolving assessment', () => {
    const open = scoreAttention({
      ...empty(),
      reviews: [
        {
          id: 'rev1',
          issueType: 'review_required',
          status: 'open',
          title: 'Financial eligibility',
          mandatory: true,
          fingerprint: 'requirement:r-fin:review_required',
          requirementId: 'r-fin',
        },
      ],
    });
    const closed = scoreAttention({
      ...empty(),
      reviews: [
        {
          id: 'rev1',
          issueType: 'review_required',
          status: 'closed',
          title: 'Financial eligibility',
          mandatory: true,
          fingerprint: 'requirement:r-fin:review_required',
          requirementId: 'r-fin',
          latestAssessment: 'evidence_sufficient',
        },
      ],
    });
    expect(open.score).toBe(12);
    expect(closed.score).toBe(0);
    expect(closed.unadjustedScore).toBe(12);
    expect(closed.factors[0]?.originalPoints).toBe(12);
  });
});

describe('demo-shaped scenarios', () => {
  it('scores a clean bid as low attention', () => {
    const result = scoreAttention({
      ...empty(),
      verifications: [
        { id: 'v-gst', source: 'gst', status: 'matched' },
        { id: 'v-mca', source: 'mca', status: 'matched' },
      ],
      crossChecks: [
        { id: 'c1', comparisonType: 'gst_mca', status: 'consistent', leftSource: 'gst', rightSource: 'mca' },
      ],
      reviews: [
        {
          id: 'rev-fin',
          issueType: 'review_required',
          status: 'closed',
          title: 'Financial eligibility',
          mandatory: true,
          fingerprint: 'requirement:r-fin:review_required',
          requirementId: 'r-fin',
          latestAssessment: 'evidence_sufficient',
        },
      ],
    });
    expect(result.band).toBe('low_attention');
    expect(result.score).toBeLessThanOrEqual(20);
  });

  it('scores GST ↔ MCA inconsistency plus missing mandatory evidence as high attention', () => {
    const result = scoreAttention({
      ...empty(),
      requirements: [
        { id: 'r-pan', name: 'PAN', mandatory: true, evidenceStatus: 'evidence_missing', evaluation: 'not_evaluated' },
        { id: 'r-tech', name: 'Technical', mandatory: true, evidenceStatus: 'evidence_missing', evaluation: 'not_evaluated' },
        { id: 'r-fin', name: 'Financial', mandatory: true, evidenceStatus: 'evidence_missing', evaluation: 'not_evaluated' },
      ],
      verifications: [{ id: 'v-gst', source: 'gst', status: 'mismatched' }],
      crossChecks: [
        { id: 'c-gst-mca', comparisonType: 'gst_mca', status: 'inconsistent', leftSource: 'gst', rightSource: 'mca' },
      ],
      reviews: [
        {
          id: 'rev-cross',
          issueType: 'cross_source_inconsistency',
          status: 'open',
          title: 'GST ↔ MCA difference',
          mandatory: true,
          fingerprint: 'cross:c-gst-mca:cross_source_inconsistency',
          verificationId: 'v-gst',
          verificationSource: 'gst',
          crossVerificationId: 'c-gst-mca',
          comparisonType: 'gst_mca',
        },
        {
          id: 'rev-udyam',
          issueType: 'evidence_missing',
          status: 'clarification_requested',
          title: 'Udyam / MSME evidence if claimed',
          mandatory: false,
          fingerprint: 'requirement:r-udyam:evidence_missing',
          requirementId: 'r-udyam',
          clarificationStatus: 'requested',
        },
      ],
    });
    expect(result.score).toBeGreaterThanOrEqual(61);
    expect(result.band).toBe('high_attention');
    expect(result.factors.some((item) => item.type === 'cross_source_inconsistency')).toBe(true);
  });

  it('scores source unavailability as moderate or elevated attention', () => {
    const result = scoreAttention({
      ...empty(),
      requirements: [
        { id: 'r-pan', name: 'PAN', mandatory: true, evidenceStatus: 'evidence_missing', evaluation: 'not_evaluated' },
        { id: 'r-tech', name: 'Technical', mandatory: true, evidenceStatus: 'evidence_missing', evaluation: 'not_evaluated' },
      ],
      verifications: [{ id: 'v-gst', source: 'gst', status: 'not_found' }],
      crossChecks: [
        {
          id: 'c-gst-mca',
          comparisonType: 'gst_mca',
          status: 'insufficient_evidence',
          leftSource: 'gst',
          rightSource: 'mca',
        },
      ],
      reviews: [
        {
          id: 'rev-src',
          issueType: 'source_unavailable',
          status: 'open',
          title: 'GST ↔ MCA source unavailable',
          mandatory: true,
          fingerprint: 'cross:c-gst-mca:source_unavailable',
          verificationId: 'v-gst',
          verificationSource: 'gst',
          crossVerificationId: 'c-gst-mca',
          comparisonType: 'gst_mca',
        },
      ],
    });
    expect(result.score).toBeGreaterThanOrEqual(21);
    expect(result.score).toBeLessThanOrEqual(60);
    expect(['moderate_attention', 'elevated_attention']).toContain(result.band);
    expect(result.factors[0]?.description.toLowerCase()).not.toMatch(/fraud/);
  });
});

describe('language', () => {
  it('does not use winner, trust, compliance, or fraud probability language', () => {
    const result = scoreAttention({
      ...empty(),
      reviews: [
        {
          id: 'rev1',
          issueType: 'cross_source_inconsistency',
          status: 'open',
          title: 'GST ↔ MCA difference',
          mandatory: true,
          fingerprint: 'cross:c1:cross_source_inconsistency',
        },
      ],
    });
    const blob = JSON.stringify(result).toLowerCase();
    expect(blob).not.toMatch(
      /fraud probability|winner|award probability|trust score|compliance score|recommended bidder/,
    );
  });
});
