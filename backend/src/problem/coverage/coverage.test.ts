import { describe, expect, it } from 'vitest';

import { buildOfficerAdvisory } from './advisory';
import { classifyMakeInIndia, demoDigiLockerViews, evaluateOemAuthorization } from './evidence';
import { reviewRiskFromAttention } from './risk';
import { scoreCoverage } from './score';

describe('coverage score', () => {
  it('is deterministic and bounded', () => {
    const input = {
      evidenceCoveragePercent: 80,
      matchedVerifications: 3,
      mismatchedVerifications: 0,
      notFoundVerifications: 0,
      errorVerifications: 0,
      consistentCrossChecks: 1,
      inconsistentCrossChecks: 0,
      missingMandatory: 0,
      openReviews: 0,
      pendingClarifications: 0,
      debarmentRecordFound: false,
    };
    expect(scoreCoverage(input)).toEqual(scoreCoverage(input));
    expect(scoreCoverage(input).score).toBeGreaterThanOrEqual(0);
    expect(scoreCoverage(input).score).toBeLessThanOrEqual(100);
    expect(scoreCoverage(input).disclaimer).toMatch(/not an official government/i);
  });

  it('reduces score for missing evidence and mismatches', () => {
    const strong = scoreCoverage({
      evidenceCoveragePercent: 100,
      matchedVerifications: 4,
      mismatchedVerifications: 0,
      notFoundVerifications: 0,
      errorVerifications: 0,
      consistentCrossChecks: 2,
      inconsistentCrossChecks: 0,
      missingMandatory: 0,
      openReviews: 0,
      pendingClarifications: 0,
      debarmentRecordFound: false,
    });
    const weak = scoreCoverage({
      evidenceCoveragePercent: 20,
      matchedVerifications: 0,
      mismatchedVerifications: 2,
      notFoundVerifications: 1,
      errorVerifications: 1,
      consistentCrossChecks: 0,
      inconsistentCrossChecks: 1,
      missingMandatory: 3,
      openReviews: 2,
      pendingClarifications: 1,
      debarmentRecordFound: true,
    });
    expect(strong.score).toBeGreaterThan(weak.score);
  });
});

describe('review risk', () => {
  it('maps attention bands without using fraud language', () => {
    expect(reviewRiskFromAttention('low_attention').level).toBe('LOW');
    expect(reviewRiskFromAttention('high_attention').level).toBe('HIGH');
    expect(reviewRiskFromAttention('low_attention', { debarmentRecordFound: true }).level).toBe('HIGH');
    expect(reviewRiskFromAttention('critical_attention').explanation.toLowerCase()).not.toMatch(/fraudulent|fraud finding/);
    expect(reviewRiskFromAttention('critical_attention').explanation.toLowerCase()).toMatch(/not a fraud score/);
  });
});

describe('officer advisory', () => {
  it('does not award, reject, or call a bidder fraudulent', () => {
    const coverage = scoreCoverage({
      evidenceCoveragePercent: 50,
      matchedVerifications: 1,
      mismatchedVerifications: 1,
      notFoundVerifications: 0,
      errorVerifications: 0,
      consistentCrossChecks: 0,
      inconsistentCrossChecks: 1,
      missingMandatory: 1,
      openReviews: 1,
      pendingClarifications: 0,
      debarmentRecordFound: false,
    });
    const advisory = buildOfficerAdvisory({
      coverage,
      riskLabel: 'High review risk',
      attentionScore: 62,
      pendingRequirements: 1,
      verificationIssues: 1,
      openReviews: 1,
      gaps: [{ id: 'g1', kind: 'conflicting_name', description: 'Legal names differ after comparison.' }],
      debarmentRecordFound: false,
    });
    expect(advisory.text.toLowerCase()).not.toMatch(/approve this bidder|reject this bidder|winner|fraudulent/);
    expect(advisory.disclaimer.toLowerCase()).toMatch(/does not approve/);
  });
});

describe('make in india and oem', () => {
  it('reads CLASS_I and local content from a declaration', () => {
    const result = classifyMakeInIndia([
      {
        id: 'd1',
        originalFilename: 'DEMO_MII.txt',
        documentType: 'declaration',
        extractedText: 'Make in India class: CLASS_I\nLocal content: 72%',
      },
    ]);
    expect(result.declaredClass).toBe('CLASS_I');
    expect(result.localContentPercent).toBe(72);
  });

  it('compares OEM fields without auto-disqualifying', () => {
    const result = evaluateOemAuthorization(
      [
        {
          id: 'd2',
          originalFilename: 'DEMO_OEM.txt',
          documentType: 'oem_authorization',
          extractedText: 'OEM name: Bayfront Valves OEM\nProduct: Industrial valves\nValid until: 2028-12-31',
        },
      ],
      'Goods',
    );
    expect(['MATCHED', 'NOT_COMPARABLE', 'REVIEW_REQUIRED', 'MISMATCHED']).toContain(result.outcome);
    expect(result.explanation.toLowerCase()).not.toMatch(/disqualif|fraud/);
  });

  it('labels DigiLocker results as synthetic', () => {
    const views = demoDigiLockerViews([
      {
        id: 'd3',
        originalFilename: 'DEMO_GST.txt',
        documentType: 'gst_certificate',
        extractedText: 'DEMO DigiLocker authenticity: ISSUED',
      },
    ]);
    expect(views[0]?.status).toBe('ISSUED');
    expect(views[0]?.disclaimer).toMatch(/not connected to DigiLocker/i);
  });
});
