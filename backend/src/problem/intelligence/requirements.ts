import type { BidDocumentTypeName, TenderRequirementTypeName } from '../types';
import type { VerificationSourceName, VerificationStatusName } from '../verification/types';
import type { CrossVerificationStatusName, EvidenceStatusName, RequirementEvaluationName } from './types';

export interface RequirementRule {
  kind:
    | 'gst_verification'
    | 'pan_verification'
    | 'udyam'
    | 'cin_verification'
    | 'epfo_verification'
    | 'esic_verification'
    | 'nsic_verification'
    | 'dpiit_verification'
    | 'bis_verification'
    | 'income_tax_verification'
    | 'debarment_check'
    | 'mii_declaration'
    | 'oem_authorization'
    | 'officer_review';
  documentTypes: BidDocumentTypeName[];
  verificationSource: VerificationSourceName | null;
}

export interface RequirementEvidence {
  documents: Array<{
    id: string;
    originalFilename: string;
    documentType: string;
    extractionStatus: string;
    tenderRequirementId: string | null;
  }>;
  verification: {
    id: string;
    status: VerificationStatusName;
    source: VerificationSourceName;
    identifierValue: string;
  } | null;
  crossCheck: { id: string; status: CrossVerificationStatusName; comparisonType: string } | null;
}

export interface RequirementEvaluationResult {
  evidenceStatus: EvidenceStatusName;
  evaluation: RequirementEvaluationName;
  explanation: string;
  review: boolean;
}

export function ruleForRequirement(input: {
  name: string;
  requirementType: TenderRequirementTypeName;
}): RequirementRule {
  const name = input.name.toLowerCase();
  if (/\bgst\b|gstin/.test(name)) {
    return { kind: 'gst_verification', documentTypes: ['gst_certificate'], verificationSource: 'gst' };
  }
  if (/\bpan\b/.test(name)) {
    return { kind: 'pan_verification', documentTypes: ['pan'], verificationSource: 'pan' };
  }
  if (/udyam|msme/.test(name)) {
    return { kind: 'udyam', documentTypes: ['udyam_certificate'], verificationSource: 'udyam' };
  }
  if (/\bcin\b|incorporation/.test(name)) {
    return { kind: 'cin_verification', documentTypes: ['cin', 'incorporation_certificate'], verificationSource: 'mca' };
  }
  if (/\bepfo\b/.test(name)) {
    return { kind: 'epfo_verification', documentTypes: ['epfo_certificate'], verificationSource: 'epfo' };
  }
  if (/income tax|itr/.test(name)) {
    return { kind: 'income_tax_verification', documentTypes: ['pan'], verificationSource: 'income_tax' };
  }
  if (/\besic\b/.test(name)) {
    return { kind: 'esic_verification', documentTypes: ['esic_certificate'], verificationSource: 'esic' };
  }
  if (/\bnsic\b/.test(name)) {
    return { kind: 'nsic_verification', documentTypes: ['nsic_certificate'], verificationSource: 'nsic' };
  }
  if (/startup india|dpiit/.test(name)) {
    return { kind: 'dpiit_verification', documentTypes: ['dpiit_certificate'], verificationSource: 'dpiit' };
  }
  if (/\bbis\b/.test(name)) {
    return { kind: 'bis_verification', documentTypes: ['bis_licence'], verificationSource: 'bis' };
  }
  if (/debar|blacklist/.test(name)) {
    return { kind: 'debarment_check', documentTypes: ['affidavit', 'declaration'], verificationSource: 'debarment' };
  }
  if (/make in india|local content/.test(name)) {
    return { kind: 'mii_declaration', documentTypes: ['declaration'], verificationSource: null };
  }
  if (/\boem\b/.test(name)) {
    return { kind: 'oem_authorization', documentTypes: ['oem_authorization'], verificationSource: null };
  }
  const byType: Partial<Record<TenderRequirementTypeName, BidDocumentTypeName[]>> = {
    technical: ['technical_qualification', 'experience_certificate', 'oem_authorization', 'product_datasheet'],
    financial: ['financial_statement', 'turnover_certificate', 'bank_certificate'],
    document: ['oem_authorization', 'other'],
    declaration: ['declaration', 'affidavit'],
    organizational: ['other'],
    tender_specific: ['tender_response', 'price_schedule', 'other'],
  };
  return {
    kind: 'officer_review',
    documentTypes: byType[input.requirementType] ?? ['other'],
    verificationSource: null,
  };
}

export function evaluateRequirement(
  rule: RequirementRule,
  mandatory: boolean,
  evidence: RequirementEvidence,
): RequirementEvaluationResult {
  const processing = evidence.documents.some((item) => item.extractionStatus === 'processing' || item.extractionStatus === 'queued');
  if (processing) {
    return {
      evidenceStatus: 'evidence_processing',
      evaluation: 'not_evaluated',
      explanation: 'Linked evidence is still processing. This is not a compliance result.',
      review: false,
    };
  }

  const hasDocument = evidence.documents.length > 0;
  if (!hasDocument) {
    return {
      evidenceStatus: mandatory ? 'evidence_missing' : 'not_evaluated',
      evaluation: 'not_evaluated',
      explanation: mandatory
        ? 'No relevant evidence is associated with this requirement.'
        : 'No evidence is associated. Optional requirements are not treated as failed when unused.',
      review: mandatory,
    };
  }

  if (rule.kind === 'officer_review' || rule.kind === 'mii_declaration' || rule.kind === 'oem_authorization') {
    return {
      evidenceStatus: 'evidence_available',
      evaluation: 'review_required',
      explanation:
        rule.kind === 'mii_declaration'
          ? 'Make in India declaration evidence is available. Class is recorded for officer inspection and is not an automatic eligibility result.'
          : rule.kind === 'oem_authorization'
            ? 'OEM authorization evidence is available and requires officer comparison with the bid claim.'
            : 'Evidence exists, but this requirement requires officer assessment. It is not machine-evaluable.',
      review: true,
    };
  }

  if (!evidence.verification) {
    return {
      evidenceStatus: 'evidence_available',
      evaluation: 'review_required',
      explanation: 'Evidence is available, but a source check has not been completed for this requirement.',
      review: true,
    };
  }

  if (evidence.verification.status === 'mismatched' || evidence.crossCheck?.status === 'inconsistent') {
    return {
      evidenceStatus: 'evidence_conflict',
      evaluation: 'review_required',
      explanation:
        evidence.verification.status === 'mismatched'
          ? 'A source check found a field difference. Officer review is required. This is not a fraud finding.'
          : 'A cross-source difference was detected. Officer review is required. This is not a fraud finding.',
      review: true,
    };
  }

  if (evidence.verification.status === 'not_found' || evidence.verification.status === 'error') {
    return {
      evidenceStatus: 'evidence_available',
      evaluation: 'review_required',
      explanation:
        evidence.verification.status === 'not_found'
          ? 'Evidence is present, but no matching record was found in the selected demo source. This does not by itself establish bidder invalidity.'
          : 'Evidence is present, but the source check could not be completed.',
      review: true,
    };
  }

  if (evidence.verification.status === 'matched') {
    return {
      evidenceStatus: 'evidence_available',
      evaluation: 'pass',
      explanation:
        'Required evidence is present and the extracted identifier matched the selected source record. This is an evidence signal, not a procurement decision.',
      review: false,
    };
  }

  return {
    evidenceStatus: 'evidence_available',
    evaluation: 'review_required',
    explanation: 'Evidence is available and requires officer review.',
    review: true,
  };
}
