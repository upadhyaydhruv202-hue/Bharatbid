import { normalizeIdentifier } from '../identifiers';
import { jaccard, normalizeComparableText, normalizeStateName, tokenSet } from './normalize';
import type { FieldComparison, NormalizedSourceRecord, VerificationFieldOutcomeName, VerificationStatusName } from './types';
import { DEMO_SOURCE_ADVISORY, MISMATCH_DISCLAIMER, NOT_FOUND_DISCLAIMER } from './types';

export interface ClaimedValues {
  identifier: string;
  legalName: string | null;
  legalNameOrigin: FieldComparison['claimedOrigin'];
  state: string | null;
  stateOrigin: FieldComparison['claimedOrigin'];
}

export function compareClaimsToSource(
  claimed: ClaimedValues,
  source: NormalizedSourceRecord,
): { fields: FieldComparison[]; status: Extract<VerificationStatusName, 'matched' | 'mismatched'>; explanation: string } {
  const fields: FieldComparison[] = [
    compareIdentifier(claimed.identifier, source.identifier),
    compareLegalName(claimed.legalName, claimed.legalNameOrigin, source.legalName),
    comparePlain('state', 'State', claimed.state, claimed.stateOrigin, source.state, normalizeStateName),
    comparePlain('status', 'Registry status', null, null, source.status, normalizeComparableText),
    ...attributeFields(source),
  ];

  const hardMismatch = fields.some((field) => field.outcome === 'mismatch');
  const status = hardMismatch ? 'mismatched' : 'matched';
  const lines = [
    `Source: ${source.sourceDisplayName}`,
    `Mode: DEMO / SIMULATED`,
    '',
    ...fields
      .filter((field) => field.outcome !== 'not_compared')
      .map((field) => `${field.label}: ${outcomeLabel(field.outcome)}${field.note ? ` — ${field.note}` : ''}`),
    '',
    DEMO_SOURCE_ADVISORY,
  ];
  if (status === 'mismatched') {
    lines.push(MISMATCH_DISCLAIMER);
  }
  return { fields, status, explanation: lines.join('\n') };
}

export function notFoundExplanation(sourceDisplayName: string): string {
  return [`Source: ${sourceDisplayName}`, 'Mode: DEMO / SIMULATED', '', NOT_FOUND_DISCLAIMER].join('\n');
}

function compareIdentifier(claimed: string, source: string | null): FieldComparison {
  const left = normalizeIdentifier(claimed);
  const right = normalizeIdentifier(source);
  const match = Boolean(left && right && left === right);
  return {
    field: 'identifier',
    label: 'Identifier',
    outcome: match ? 'match' : 'mismatch',
    claimedValue: left,
    claimedOrigin: 'identifier',
    sourceValue: right,
    note: match ? 'Exact match' : 'Identifier values differ',
  };
}

function compareLegalName(
  claimed: string | null,
  origin: FieldComparison['claimedOrigin'],
  source: string | null,
): FieldComparison {
  const left = normalizeComparableText(claimed);
  const right = normalizeComparableText(source);
  if (!left || !right) {
    return {
      field: 'legalName',
      label: 'Legal name',
      outcome: 'not_compared',
      claimedValue: claimed,
      claimedOrigin: origin,
      sourceValue: source,
      note: 'Not enough information to compare legal names',
    };
  }
  if (left === right) {
    return {
      field: 'legalName',
      label: 'Legal name',
      outcome: 'match',
      claimedValue: claimed,
      claimedOrigin: origin,
      sourceValue: source,
      note: 'Normalized match',
    };
  }
  const score = jaccard(tokenSet(left), tokenSet(right));
  const contained = left.includes(right) || right.includes(left);
  if (score >= 0.8 || (contained && Math.min(left.length, right.length) >= 12)) {
    return {
      field: 'legalName',
      label: 'Legal name',
      outcome: 'potential_match',
      claimedValue: claimed,
      claimedOrigin: origin,
      sourceValue: source,
      note: 'Formatting differs; treated as a potential match, not a fraud finding',
    };
  }
  return {
    field: 'legalName',
    label: 'Legal name',
    outcome: 'mismatch',
    claimedValue: claimed,
    claimedOrigin: origin,
    sourceValue: source,
    note: MISMATCH_DISCLAIMER,
  };
}

function comparePlain(
  field: string,
  label: string,
  claimed: string | null,
  origin: FieldComparison['claimedOrigin'],
  source: string | null,
  normalize: (value: string | null | undefined) => string | null,
): FieldComparison {
  const left = normalize(claimed);
  const right = normalize(source);
  if (!left || !right) {
    return {
      field,
      label,
      outcome: 'not_compared',
      claimedValue: claimed,
      claimedOrigin: origin,
      sourceValue: source,
      note: `Not enough information to compare ${label.toLowerCase()}`,
    };
  }
  const match = left === right;
  return {
    field,
    label,
    outcome: match ? 'match' : 'mismatch',
    claimedValue: claimed,
    claimedOrigin: origin,
    sourceValue: source,
    note: match ? 'Match' : MISMATCH_DISCLAIMER,
  };
}

function outcomeLabel(outcome: VerificationFieldOutcomeName): string {
  if (outcome === 'match') {
    return 'Match';
  }
  if (outcome === 'potential_match') {
    return 'Potential match';
  }
  if (outcome === 'review_required') {
    return 'Review required';
  }
  if (outcome === 'mismatch') {
    return 'Mismatch';
  }
  return 'Not compared';
}

const ATTRIBUTE_LABELS: Record<string, string> = {
  gstReturnStatus: 'GST return filing status',
  gstReturnPeriod: 'Last filing period',
  entityType: 'Entity type',
  assessmentYear: 'Assessment year',
  returnType: 'Return type',
  filingStatus: 'Income Tax filing status',
  registrationStatus: 'Registration status',
  recognitionNumber: 'Recognition number',
  validity: 'Validity',
  sellerReference: 'GeM seller reference',
  reference: 'Debarment reference',
  effectiveDate: 'Effective date',
  expiryDate: 'Expiry date',
  reasonCategory: 'Reason category',
  productCategory: 'Product category',
};

function attributeFields(source: NormalizedSourceRecord): FieldComparison[] {
  const attributes = source.attributes ?? {};
  return Object.entries(attributes)
    .filter(([, value]) => Boolean(value))
    .map(([field, value]) => ({
      field,
      label: ATTRIBUTE_LABELS[field] ?? field,
      outcome: field === 'reasonCategory' || source.status === 'RECORD_FOUND' ? 'review_required' : 'not_compared',
      claimedValue: null,
      claimedOrigin: null,
      sourceValue: value,
      note:
        source.status === 'RECORD_FOUND'
          ? 'DEMO SOURCE finding. Officer review is required. This is not an automatic rejection.'
          : 'DEMO / SYNTHETIC source attribute. Simulated registry data only.',
    }));
}
