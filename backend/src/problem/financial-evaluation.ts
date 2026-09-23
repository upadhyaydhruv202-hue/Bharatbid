/** Commercial scoring is a separate module. It must never award or reject via AI. */
export const FINANCIAL_EVALUATION_STATUS = 'NOT_AVAILABLE' as const;

export function financialEvaluationAdvisory(): string {
  return 'Financial evaluation is not mixed into compliance verification and is not available in this build. Officers remain responsible for any commercial comparison. AI does not select a winner.';
}
