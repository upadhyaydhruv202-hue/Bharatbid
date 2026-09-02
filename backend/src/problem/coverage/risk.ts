import type { AttentionBand } from '../attention/types';
import { REVIEW_RISK_LABELS, type ReviewRiskLevel } from './types';

export function reviewRiskFromAttention(
  band: AttentionBand,
  extras: { debarmentRecordFound?: boolean } = {},
): { level: ReviewRiskLevel; label: string; explanation: string } {
  let level: ReviewRiskLevel =
    band === 'critical_attention'
      ? 'CRITICAL'
      : band === 'high_attention'
        ? 'HIGH'
        : band === 'elevated_attention' || band === 'moderate_attention'
          ? 'MODERATE'
          : 'LOW';
  if (extras.debarmentRecordFound && (level === 'LOW' || level === 'MODERATE')) {
    level = 'HIGH';
  }
  return {
    level,
    label: REVIEW_RISK_LABELS[level],
    explanation:
      'Procurement Review Risk is derived from Officer Review Priority findings (missing evidence, DEMO source mismatches, cross-check differences, source unavailability, and open reviews). It is not a fraud score, bidder ranking, or government risk rating.',
  };
}
