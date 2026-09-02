import { normalizeComparableText, normalizeStateName } from '../verification/normalize';
import type { NormalizedSourceRecord, VerificationStatusName } from '../verification/types';
import {
  DEMO_CROSS_ADVISORY,
  INSUFFICIENT_NOT_FOUND,
  MIXED_SOURCE_ADVISORY,
  comparisonTypeForSources,
  sourceBasis,
  type CrossFieldComparison,
  type CrossFieldOutcomeName,
  type CrossSourceBasisName,
  type CrossVerificationStatusName,
} from './types';

export interface CrossCompareInput {
  leftStatus: VerificationStatusName;
  rightStatus: VerificationStatusName;
  leftSource: NormalizedSourceRecord['source'];
  rightSource: NormalizedSourceRecord['source'];
  leftMode: NormalizedSourceRecord['sourceMode'];
  rightMode: NormalizedSourceRecord['sourceMode'];
  leftDisplayName: string;
  rightDisplayName: string;
  leftSnapshot: NormalizedSourceRecord | null;
  rightSnapshot: NormalizedSourceRecord | null;
}

export function compareVerificationPair(input: CrossCompareInput): {
  status: CrossVerificationStatusName;
  fields: CrossFieldComparison[];
  explanation: string;
  sourceBasis: CrossSourceBasisName;
} {
  const basis = sourceBasis(input.leftMode, input.rightMode);
  const type = comparisonTypeForSources(input.leftSource, input.rightSource);
  if (!type) {
    return {
      status: 'not_comparable',
      fields: [],
      sourceBasis: basis,
      explanation: explain(basis, input, 'These sources are not comparable in this slice.', []),
    };
  }

  if (isUnavailable(input.leftStatus) || isUnavailable(input.rightStatus)) {
    const notFound = input.leftStatus === 'not_found' || input.rightStatus === 'not_found';
    return {
      status: 'insufficient_evidence',
      fields: [],
      sourceBasis: basis,
      explanation: explain(
        basis,
        input,
        notFound ? INSUFFICIENT_NOT_FOUND : 'One or both source checks could not supply a comparable record.',
        [],
      ),
    };
  }

  if (!input.leftSnapshot?.recordFound || !input.rightSnapshot?.recordFound) {
    return {
      status: 'insufficient_evidence',
      fields: [],
      sourceBasis: basis,
      explanation: explain(basis, input, INSUFFICIENT_NOT_FOUND, []),
    };
  }

  const fields = [
    compareText('legalName', 'Legal name', input.leftSnapshot.legalName, input.rightSnapshot.legalName),
    compareText('state', 'State', input.leftSnapshot.state, input.rightSnapshot.state, normalizeStateName),
  ];
  const difference = fields.some((field) => field.outcome === 'difference');
  const status: CrossVerificationStatusName = difference ? 'inconsistent' : 'consistent';
  const summary = difference
    ? 'A difference was detected between the two source records. Officer review is recommended. This is not a fraud finding.'
    : 'Compared fields are consistent after safe normalization.';
  return {
    status,
    fields,
    sourceBasis: basis,
    explanation: explain(basis, input, summary, fields),
  };
}

export function asSourceSnapshot(value: unknown): NormalizedSourceRecord | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const row = value as Record<string, unknown>;
  if (row.recordFound !== true) {
    return null;
  }
  return {
    source: row.source as NormalizedSourceRecord['source'],
    sourceMode: (row.sourceMode as NormalizedSourceRecord['sourceMode']) ?? 'demo',
    sourceDisplayName: String(row.sourceDisplayName ?? ''),
    recordFound: true,
    retrievedAt: String(row.retrievedAt ?? ''),
    identifierType: row.identifierType as NormalizedSourceRecord['identifierType'],
    identifier: String(row.identifier ?? ''),
    legalName: typeof row.legalName === 'string' ? row.legalName : null,
    tradeName: typeof row.tradeName === 'string' ? row.tradeName : null,
    status: typeof row.status === 'string' ? row.status : null,
    registrationDate: typeof row.registrationDate === 'string' ? row.registrationDate : null,
    state: typeof row.state === 'string' ? row.state : null,
  };
}

function isUnavailable(status: VerificationStatusName): boolean {
  return status === 'error' || status === 'not_found' || status === 'queued' || status === 'processing' || status === 'not_started';
}

function compareText(
  field: string,
  label: string,
  left: string | null,
  right: string | null,
  normalize: (value: string | null | undefined) => string | null = normalizeComparableText,
): CrossFieldComparison {
  if (!left && !right) {
    return { field, label, outcome: 'not_comparable', leftValue: left, rightValue: right, note: 'Neither source provided this field' };
  }
  if (!left) {
    return { field, label, outcome: 'missing_from_left', leftValue: left, rightValue: right, note: 'Not present on the first source record' };
  }
  if (!right) {
    return { field, label, outcome: 'missing_from_right', leftValue: left, rightValue: right, note: 'Not present on the second source record' };
  }
  const leftNorm = normalize(left);
  const rightNorm = normalize(right);
  if (left.trim() === right.trim()) {
    return { field, label, outcome: 'exact_match', leftValue: left, rightValue: right, note: 'Exact match' };
  }
  if (leftNorm && rightNorm && leftNorm === rightNorm) {
    return {
      field,
      label,
      outcome: 'normalized_match',
      leftValue: left,
      rightValue: right,
      note: 'Normalized match',
    };
  }
  return {
    field,
    label,
    outcome: 'difference',
    leftValue: left,
    rightValue: right,
    note: 'Difference detected. Officer review recommended.',
  };
}

function explain(
  basis: CrossSourceBasisName,
  input: CrossCompareInput,
  summary: string,
  fields: CrossFieldComparison[],
): string {
  const modeLabel = basis === 'mixed' ? 'MIXED SOURCE BASIS' : basis === 'external' ? 'EXTERNAL' : 'DEMO / SIMULATED SOURCES';
  const lines = [
    `Source A: ${input.leftDisplayName}`,
    `Source B: ${input.rightDisplayName}`,
    `Mode: ${modeLabel}`,
    '',
    summary,
    ...fields.map((field) => `${field.label}: ${outcomeLabel(field.outcome)}`),
    '',
    basis === 'mixed' ? MIXED_SOURCE_ADVISORY : DEMO_CROSS_ADVISORY,
  ];
  return lines.join('\n');
}

function outcomeLabel(outcome: CrossFieldOutcomeName): string {
  if (outcome === 'exact_match') return 'Exact match';
  if (outcome === 'normalized_match') return 'Normalized match';
  if (outcome === 'difference') return 'Difference';
  if (outcome === 'missing_from_left') return 'Missing from first source';
  if (outcome === 'missing_from_right') return 'Missing from second source';
  return 'Not comparable';
}
