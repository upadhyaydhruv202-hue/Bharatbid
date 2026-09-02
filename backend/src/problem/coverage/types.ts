export const COVERAGE_MODEL_VERSION = 'coverage-v1';
export const COVERAGE_DISCLAIMER =
  'Decision-support indicator derived from available evidence and DEMO source results. It is not an official government compliance determination.';

export type ReviewRiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export const REVIEW_RISK_LABELS: Record<ReviewRiskLevel, string> = {
  LOW: 'Low review risk',
  MODERATE: 'Moderate review risk',
  HIGH: 'High review risk',
  CRITICAL: 'Critical review risk',
};

export interface CoverageFactor {
  id: string;
  label: string;
  points: number;
  note: string;
  source?: { kind: string; id: string; hrefSuffix?: string };
}

export interface CoverageResult {
  modelVersion: string;
  score: number;
  label: string;
  disclaimer: string;
  factors: CoverageFactor[];
}

export type DigiLockerDemoStatus = 'ISSUED' | 'NOT_ISSUED' | 'NOT_AVAILABLE';

export type MakeInIndiaClass = 'CLASS_I' | 'CLASS_II' | 'NOT_DECLARED';

export type OemOutcome = 'MATCHED' | 'MISMATCHED' | 'NOT_COMPARABLE' | 'EVIDENCE_MISSING' | 'REVIEW_REQUIRED';

export interface MakeInIndiaView {
  declaredClass: MakeInIndiaClass;
  localContentPercent: number | null;
  documentId: string | null;
  documentFilename: string | null;
  explanation: string;
}

export interface OemAuthorizationView {
  outcome: OemOutcome;
  oemName: string | null;
  product: string | null;
  authorizationReference: string | null;
  validFrom: string | null;
  validUntil: string | null;
  bidClaim: string | null;
  documentId: string | null;
  explanation: string;
}

export interface DigiLockerDemoView {
  documentId: string;
  documentFilename: string;
  status: DigiLockerDemoStatus;
  disclaimer: string;
}

export interface InformationGap {
  id: string;
  kind: 'missing_field' | 'conflicting_name' | 'conflicting_state' | 'missing_identifier' | 'missing_validity' | 'missing_document' | 'inconsistent_oem' | 'inconsistent_declaration';
  description: string;
  source?: { kind: string; id: string };
}

export interface OfficerAdvisory {
  text: string;
  bullets: string[];
  disclaimer: string;
}
