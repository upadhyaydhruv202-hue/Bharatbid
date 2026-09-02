import type { CoverageResult, InformationGap, OfficerAdvisory } from './types';

const ADVISORY_DISCLAIMER =
  'Officer advisory is decision-support text generated from available evidence and DEMO source results. It does not approve, reject, rank, or certify a bidder.';

const FORBIDDEN = /\b(approve this bidder|reject this bidder|select this bidder|winner|fraudulent bidder|automatically (award|reject|disqualify))\b/i;

export function buildOfficerAdvisory(input: {
  coverage: CoverageResult;
  riskLabel: string;
  attentionScore: number;
  pendingRequirements: number;
  verificationIssues: number;
  openReviews: number;
  gaps: InformationGap[];
  debarmentRecordFound: boolean;
}): OfficerAdvisory {
  const bullets: string[] = [];
  if (input.debarmentRecordFound) {
    bullets.push('A DEMO debarment / blacklist source check returned a record. Officer attention may be required before recording an assessment.');
  }
  if (input.verificationIssues > 0) {
    bullets.push(`${input.verificationIssues} DEMO source verification issue(s) are present. Review the source records and bidder evidence.`);
  }
  if (input.pendingRequirements > 0) {
    bullets.push(`${input.pendingRequirements} mandatory requirement(s) still lack associated evidence.`);
  }
  if (input.openReviews > 0) {
    bullets.push(`${input.openReviews} officer review item(s) remain open.`);
  }
  for (const gap of input.gaps.slice(0, 4)) {
    bullets.push(gap.description);
  }
  if (bullets.length === 0) {
    bullets.push('Available evidence and DEMO source checks did not raise outstanding machine findings. Officer review of the bid file is still required.');
  }

  const text = sanitizeAdvisory(
    `Officer advisory: Evidence & Compliance Coverage is ${input.coverage.score} / 100 (${input.riskLabel}). Officer Review Priority is ${input.attentionScore} / 100. ${bullets[0]}`,
  );

  return {
    text,
    bullets: bullets.map(sanitizeAdvisory),
    disclaimer: ADVISORY_DISCLAIMER,
  };
}

export function sanitizeAdvisory(text: string): string {
  if (!FORBIDDEN.test(text)) {
    return text;
  }
  return text.replace(FORBIDDEN, 'officer attention may be required');
}
