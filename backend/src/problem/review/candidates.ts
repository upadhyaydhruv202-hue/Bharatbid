import { CROSS_COMPARISON_LABELS } from '../intelligence/types';
import type { ReviewIssueTypeName } from './types';

export interface IntelligenceRequirementRow {
  requirementId: string;
  name: string;
  mandatory: boolean;
  evidenceStatus: string;
  evaluation: string;
  explanation: string;
  documents: Array<{ id: string }>;
  verification: { id: string; status: string } | null;
  crossCheck: { id: string; status: string } | null;
}

export interface ReviewCandidate {
  fingerprint: string;
  issueType: ReviewIssueTypeName;
  title: string;
  whyCreated: string;
  whyItMatters: string;
  inspectHint: string;
  actionHint: string;
  machineFinding: string;
  machineExplanation: string;
  mandatory: boolean;
  requirementId?: string;
  documentId?: string;
  verificationId?: string;
  crossVerificationId?: string;
}

export function candidatesFromIntelligence(input: {
  items: IntelligenceRequirementRow[];
  crossChecks: Array<{ id: string; status: string; comparisonType: string; comparisonLabel?: string }>;
}): ReviewCandidate[] {
  const candidates: ReviewCandidate[] = [];
  for (const item of input.items) {
    const mapped = candidateForRequirement(item);
    if (mapped) {
      candidates.push(mapped);
    }
  }
  for (const check of input.crossChecks) {
    if (check.status === 'inconsistent') {
      const label = check.comparisonLabel ?? CROSS_COMPARISON_LABELS[check.comparisonType as keyof typeof CROSS_COMPARISON_LABELS] ?? check.comparisonType;
      candidates.push({
        fingerprint: `cross:${check.id}:cross_source_inconsistency`,
        issueType: 'cross_source_inconsistency',
        title: `${label} difference`,
        whyCreated: 'The two source records differ on a compared field after safe normalization.',
        whyItMatters: 'The tender expects consistent bidder identity evidence across available sources.',
        inspectHint: 'Open the cross-check, then inspect each source verification and supporting document.',
        actionHint: 'Record an assessment or request clarification. This is not a fraud finding.',
        machineFinding: 'INCONSISTENT',
        machineExplanation: 'Cross-source comparison reported a difference. The machine finding stays unchanged after officer review.',
        mandatory: true,
        crossVerificationId: check.id,
      });
    } else if (check.status === 'insufficient_evidence' || check.status === 'error') {
      const label = check.comparisonLabel ?? check.comparisonType;
      candidates.push({
        fingerprint: `cross:${check.id}:source_unavailable`,
        issueType: 'source_unavailable',
        title: `${label} source unavailable`,
        whyCreated: 'One or both source checks could not supply a comparable record.',
        whyItMatters: 'Identity consistency cannot be established from the available source records.',
        inspectHint: 'Inspect each verification, previous attempts, source mode, and retry if the status is error.',
        actionHint: 'A source outage is not bidder misconduct. Request clarification only if evidence is also missing.',
        machineFinding: check.status === 'error' ? 'ERROR' : 'INSUFFICIENT_EVIDENCE',
        machineExplanation: 'The cross-check could not compare two complete source records.',
        mandatory: true,
        crossVerificationId: check.id,
      });
    }
  }
  return candidates;
}

function candidateForRequirement(item: IntelligenceRequirementRow): ReviewCandidate | null {
  const documentId = item.documents[0]?.id;
  const verificationId = item.verification?.id;
  const crossVerificationId = item.crossCheck?.id;
  const base = {
    title: item.name,
    mandatory: item.mandatory,
    requirementId: item.requirementId,
    documentId,
    verificationId,
    crossVerificationId,
    machineExplanation: item.explanation,
  };

  if (item.evidenceStatus === 'evidence_missing') {
    return {
      ...base,
      fingerprint: `requirement:${item.requirementId}:evidence_missing`,
      issueType: 'evidence_missing',
      whyCreated: 'No relevant evidence is associated with this requirement.',
      whyItMatters: item.mandatory
        ? 'This is a mandatory tender requirement. Missing evidence needs officer attention.'
        : 'This optional requirement has no associated evidence.',
      inspectHint: 'Open the requirement and Documents tab to see what was uploaded.',
      actionHint: 'Request clarification or record an assessment. Do not treat this as an automatic fail.',
      machineFinding: 'EVIDENCE_MISSING',
    };
  }
  if (item.verification?.status === 'mismatched') {
    return {
      ...base,
      fingerprint: `requirement:${item.requirementId}:verification_mismatch`,
      issueType: 'verification_mismatch',
      whyCreated: 'A source check found a field difference between evidence and the selected demo source record.',
      whyItMatters: 'The tender requires identity evidence that can be reconciled with the available source record.',
      inspectHint: 'Inspect the document, extracted fields, verification, and any related cross-check.',
      actionHint: 'Record an assessment or request clarification. The original verification result stays unchanged.',
      machineFinding: 'MISMATCHED',
    };
  }
  if (item.verification?.status === 'error' || item.verification?.status === 'not_found') {
    return {
      ...base,
      fingerprint: `requirement:${item.requirementId}:source_unavailable`,
      issueType: 'source_unavailable',
      whyCreated:
        item.verification.status === 'not_found'
          ? 'No matching record was found in the selected demo source.'
          : 'The source check could not be completed.',
      whyItMatters: 'Source availability affects how much identity evidence the officer can inspect.',
      inspectHint: 'Inspect the verification, source mode, previous attempts, and retry if the status is error.',
      actionHint: 'A missing source record does not by itself establish bidder invalidity.',
      machineFinding: item.verification.status === 'not_found' ? 'NOT_FOUND' : 'ERROR',
    };
  }
  if (item.evidenceStatus === 'evidence_conflict' || item.crossCheck?.status === 'inconsistent') {
    return {
      ...base,
      fingerprint: `requirement:${item.requirementId}:evidence_conflict`,
      issueType: 'evidence_conflict',
      whyCreated: 'Linked evidence and source checks do not fully agree.',
      whyItMatters: 'Conflicting identity signals need officer interpretation.',
      inspectHint: 'Inspect documents, verification, and the related cross-check side by side.',
      actionHint: 'Record an assessment or request clarification. This is not a fraud finding.',
      machineFinding: 'EVIDENCE_CONFLICT',
    };
  }
  if (item.evaluation === 'review_required') {
    return {
      ...base,
      fingerprint: `requirement:${item.requirementId}:review_required`,
      issueType: 'review_required',
      whyCreated: 'This requirement is not safely machine-evaluable, or remaining checks need a human.',
      whyItMatters: 'Qualitative or incomplete evidence must be assessed by a procurement officer.',
      inspectHint: 'Open the requirement, linked documents, and any verification that exists.',
      actionHint: 'Officer review required. Record an assessment or request clarification.',
      machineFinding: 'REVIEW_REQUIRED',
    };
  }
  if (item.evaluation === 'not_evaluated' && item.evidenceStatus === 'evidence_available') {
    return {
      ...base,
      fingerprint: `requirement:${item.requirementId}:requirement_unevaluated`,
      issueType: 'requirement_unevaluated',
      whyCreated: 'Evidence exists, but no deterministic rule completed an evaluation.',
      whyItMatters: 'The officer still needs to decide whether the evidence is sufficient.',
      inspectHint: 'Inspect the associated documents and any pending verification.',
      actionHint: 'Record an assessment. The machine result remains not evaluated.',
      machineFinding: 'NOT_EVALUATED',
    };
  }
  return null;
}
