import { ATTENTION_SCORE_MAX, ATTENTION_SCORE_MIN } from '../attention/weights';
import { COVERAGE_DISCLAIMER, COVERAGE_MODEL_VERSION, type CoverageFactor, type CoverageResult } from './types';

export interface CoverageInput {
  evidenceCoveragePercent: number | null;
  matchedVerifications: number;
  mismatchedVerifications: number;
  notFoundVerifications: number;
  errorVerifications: number;
  consistentCrossChecks: number;
  inconsistentCrossChecks: number;
  missingMandatory: number;
  openReviews: number;
  pendingClarifications: number;
  debarmentRecordFound: boolean;
}

export function scoreCoverage(input: CoverageInput): CoverageResult {
  const factors: CoverageFactor[] = [
    {
      id: 'evidence-coverage',
      label: 'Evidence coverage',
      points: pointsFromPercent(input.evidenceCoveragePercent, 25),
      note: input.evidenceCoveragePercent === null
        ? 'No mandatory requirements to measure coverage against.'
        : `${input.evidenceCoveragePercent}% of mandatory requirements have associated evidence.`,
    },
    {
      id: 'matched-sources',
      label: 'Matched DEMO source checks',
      points: Math.min(24, input.matchedVerifications * 4),
      note: `${input.matchedVerifications} DEMO source check(s) matched. Not a live government confirmation.`,
    },
    {
      id: 'cross-consistency',
      label: 'Cross-check consistency',
      points: Math.min(10, input.consistentCrossChecks * 5),
      note: `${input.consistentCrossChecks} consistent DEMO cross-check(s).`,
    },
    {
      id: 'missing-mandatory',
      label: 'Missing mandatory evidence',
      points: -Math.min(20, input.missingMandatory * 8),
      note: `${input.missingMandatory} mandatory requirement(s) have no associated evidence.`,
    },
    {
      id: 'mismatches',
      label: 'Verification mismatches',
      points: -Math.min(18, input.mismatchedVerifications * 9),
      note: `${input.mismatchedVerifications} DEMO source mismatch(es). Officer review is required.`,
    },
    {
      id: 'not-found',
      label: 'Source records not found',
      points: -Math.min(10, input.notFoundVerifications * 4),
      note: `${input.notFoundVerifications} DEMO lookup(s) found no matching record. This does not by itself establish invalidity.`,
    },
    {
      id: 'source-errors',
      label: 'Source unavailable',
      points: -Math.min(8, input.errorVerifications * 4),
      note: `${input.errorVerifications} DEMO source check(s) could not be completed.`,
    },
    {
      id: 'cross-inconsistent',
      label: 'Cross-check differences',
      points: -Math.min(12, input.inconsistentCrossChecks * 8),
      note: `${input.inconsistentCrossChecks} cross-source difference(s). Not a fraud finding.`,
    },
    {
      id: 'open-reviews',
      label: 'Open officer reviews',
      points: -Math.min(15, input.openReviews * 6 + input.pendingClarifications * 3),
      note: `${input.openReviews} open review item(s), ${input.pendingClarifications} pending clarification(s).`,
    },
    {
      id: 'debarment',
      label: 'Debarment / blacklist source check',
      points: input.debarmentRecordFound ? -15 : 0,
      note: input.debarmentRecordFound
        ? 'A DEMO debarment record was found. Officer review is required. This is not an automatic rejection.'
        : 'No DEMO debarment record is currently attached as RECORD_FOUND.',
    },
  ].filter((factor) => factor.points !== 0 || factor.id === 'evidence-coverage');

  const score = bound(factors.reduce((total, factor) => total + factor.points, 0));
  return {
    modelVersion: COVERAGE_MODEL_VERSION,
    score,
    label: 'Overall Compliance Score — Decision Support',
    disclaimer: COVERAGE_DISCLAIMER,
    factors,
  };
}

function pointsFromPercent(percent: number | null, max: number): number {
  if (percent === null) {
    return 0;
  }
  return Math.round((Math.min(100, Math.max(0, percent)) / 100) * max);
}

function bound(value: number): number {
  if (!Number.isFinite(value)) {
    return ATTENTION_SCORE_MIN;
  }
  return Math.min(ATTENTION_SCORE_MAX, Math.max(ATTENTION_SCORE_MIN, Math.round(value)));
}
