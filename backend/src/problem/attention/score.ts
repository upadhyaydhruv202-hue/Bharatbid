import {
  ATTENTION_BAND_LABELS,
  ATTENTION_MODEL_VERSION,
  type AttentionBand,
  type AttentionCategory,
  type AttentionCrossSignal,
  type AttentionDocumentSignal,
  type AttentionFactor,
  type AttentionFactorType,
  type AttentionInput,
  type AttentionOrigin,
  type AttentionRequirementSignal,
  type AttentionResult,
  type AttentionReviewSignal,
  type AttentionVerificationSignal,
} from './types';
import {
  ATTENTION_BAND_RANGES,
  ATTENTION_CATEGORY_CAPS,
  ATTENTION_CATEGORY_FOR_TYPE,
  ATTENTION_SCORE_MAX,
  ATTENTION_SCORE_MIN,
  ATTENTION_WEIGHTS,
  RESOLVING_ASSESSMENTS,
  UNRESOLVED_REVIEW_STATUSES,
} from './weights';

const MACHINE_TYPES = new Set<AttentionFactorType>([
  'mandatory_evidence_missing',
  'optional_evidence_missing',
  'evidence_processing',
  'verification_mismatch',
  'verification_not_found',
  'verification_error',
  'cross_source_inconsistency',
  'evidence_conflict',
  'cross_insufficient_evidence',
  'cross_source_error',
]);

export function bandForScore(score: number): AttentionBand {
  const bounded = boundScore(score);
  const match = ATTENTION_BAND_RANGES.find((range) => bounded >= range.min && bounded <= range.max);
  return match?.band ?? 'low_attention';
}

export function boundScore(value: number): number {
  if (!Number.isFinite(value)) {
    return ATTENTION_SCORE_MIN;
  }
  return Math.min(ATTENTION_SCORE_MAX, Math.max(ATTENTION_SCORE_MIN, Math.round(value)));
}

export function scoreAttention(input: AttentionInput): AttentionResult {
  const occupied = new Set<string>();
  const raw: AttentionFactor[] = [];

  const reviews = [...input.reviews].sort((a, b) => a.id.localeCompare(b.id));
  for (const review of reviews) {
    const mapped = factorFromReview(review);
    if (!mapped) {
      continue;
    }
    if (keysTaken(occupied, mapped.clusterKeys)) {
      continue;
    }
    occupy(occupied, mapped.clusterKeys);
    raw.push(mapped);
  }

  const leftover: AttentionFactor[] = [];
  for (const requirement of [...input.requirements].sort((a, b) => a.id.localeCompare(b.id))) {
    const mapped = factorFromRequirement(requirement);
    if (mapped) {
      leftover.push(mapped);
    }
  }
  for (const verification of [...input.verifications].sort((a, b) => a.id.localeCompare(b.id))) {
    const mapped = factorFromVerification(verification);
    if (mapped) {
      leftover.push(mapped);
    }
  }
  for (const check of [...input.crossChecks].sort((a, b) => a.id.localeCompare(b.id))) {
    const mapped = factorFromCross(check);
    if (mapped) {
      leftover.push(mapped);
    }
  }
  for (const document of [...input.documents].sort((a, b) => a.id.localeCompare(b.id))) {
    const mapped = factorFromProcessing(document, input.requirements, occupied);
    if (mapped) {
      leftover.push(mapped);
    }
  }

  leftover.sort((a, b) => b.originalPoints - a.originalPoints || a.id.localeCompare(b.id));
  for (const factor of leftover) {
    if (keysTaken(occupied, factor.clusterKeys)) {
      continue;
    }
    occupy(occupied, factor.clusterKeys);
    raw.push(factor);
  }

  const withCurrent = raw.map((factor) => applyOfficerAdjustment(factor, reviews));
  const currentCapped = applyCategoryCaps(withCurrent);
  const unadjustedCapped = applyCategoryCaps(
    withCurrent.map((factor) => ({ ...factor, currentPoints: factor.originalPoints, adjustmentReason: null })),
  );

  const score = boundScore(sumPoints(currentCapped, 'currentPoints'));
  const unadjustedScore = boundScore(sumPoints(unadjustedCapped, 'currentPoints'));
  const band = bandForScore(score);
  const merged = currentCapped;

  return {
    modelVersion: ATTENTION_MODEL_VERSION,
    score,
    unadjustedScore,
    band,
    bandLabel: ATTENTION_BAND_LABELS[band],
    factors: merged.sort((a, b) => b.currentPoints - a.currentPoints || b.originalPoints - a.originalPoints || a.id.localeCompare(b.id)),
    openIssues: unresolvedReviewCount(reviews),
    pendingClarifications: reviews.filter((item) => item.clarificationStatus === 'requested').length,
    history: historyEntries(score, unadjustedScore, merged),
  };
}

function factorFromReview(review: AttentionReviewSignal): AttentionFactor | null {
  const type = typeForIssue(review.issueType, review.mandatory);
  if (!type) {
    return null;
  }
  return makeFactor({
    id: `review:${review.id}`,
    type,
    originalPoints: ATTENTION_WEIGHTS[type],
    description: descriptionForReview(type, review),
    source: { kind: 'review', id: review.id, label: review.title },
    clusterKeys: clusterKeysForReview(review),
  });
}

function factorFromRequirement(requirement: AttentionRequirementSignal): AttentionFactor | null {
  if (requirement.evidenceStatus === 'evidence_missing') {
    const type: AttentionFactorType = requirement.mandatory
      ? 'mandatory_evidence_missing'
      : 'optional_evidence_missing';
    if (!requirement.mandatory && type === 'optional_evidence_missing' && requirement.evaluation === 'not_evaluated') {
      return makeFactor({
        id: `requirement:${requirement.id}:optional_missing`,
        type,
        originalPoints: ATTENTION_WEIGHTS[type],
        description: `Optional requirement "${requirement.name}" has no associated evidence. This is not a fail.`,
        source: { kind: 'requirement', id: requirement.id, label: requirement.name },
        clusterKeys: clusterKeysForRequirement(requirement),
      });
    }
    if (requirement.mandatory) {
      return makeFactor({
        id: `requirement:${requirement.id}:missing`,
        type,
        originalPoints: ATTENTION_WEIGHTS[type],
        description: `Mandatory requirement "${requirement.name}" has no associated evidence.`,
        source: { kind: 'requirement', id: requirement.id, label: requirement.name },
        clusterKeys: clusterKeysForRequirement(requirement),
      });
    }
  }
  if (requirement.evidenceStatus === 'evidence_processing') {
    return makeFactor({
      id: `requirement:${requirement.id}:processing`,
      type: 'evidence_processing',
      originalPoints: ATTENTION_WEIGHTS.evidence_processing,
      description: `Evidence for "${requirement.name}" is still processing.`,
      source: { kind: 'requirement', id: requirement.id, label: requirement.name },
      clusterKeys: [`requirement:${requirement.id}`, `requirement:${requirement.id}:processing`],
    });
  }
  if (requirement.evidenceStatus === 'evidence_conflict') {
    return makeFactor({
      id: `requirement:${requirement.id}:conflict`,
      type: 'evidence_conflict',
      originalPoints: ATTENTION_WEIGHTS.evidence_conflict,
      description: `Linked evidence for "${requirement.name}" does not fully agree. This is not a fraud finding.`,
      source: { kind: 'requirement', id: requirement.id, label: requirement.name },
      clusterKeys: clusterKeysForRequirement(requirement),
    });
  }
  return null;
}

function factorFromVerification(verification: AttentionVerificationSignal): AttentionFactor | null {
  if (verification.status === 'matched' || verification.status === 'processing' || verification.status === 'queued') {
    return null;
  }
  if (verification.status === 'mismatched') {
    return makeFactor({
      id: `verification:${verification.id}:mismatch`,
      type: 'verification_mismatch',
      originalPoints: ATTENTION_WEIGHTS.verification_mismatch,
      description: `${sourceLabel(verification.source)} verification reported a field difference. This is not a fraud finding.`,
      source: { kind: 'verification', id: verification.id, label: `${sourceLabel(verification.source)} verification` },
      clusterKeys: clusterKeysForVerification(verification),
    });
  }
  if (verification.status === 'not_found') {
    return makeFactor({
      id: `verification:${verification.id}:not_found`,
      type: 'verification_not_found',
      originalPoints: ATTENTION_WEIGHTS.verification_not_found,
      description: `No matching ${sourceLabel(verification.source)} record was found in the available demo source. This does not by itself establish bidder invalidity.`,
      source: { kind: 'verification', id: verification.id, label: `${sourceLabel(verification.source)} verification` },
      clusterKeys: clusterKeysForVerification(verification),
    });
  }
  if (verification.status === 'error') {
    return makeFactor({
      id: `verification:${verification.id}:error`,
      type: 'verification_error',
      originalPoints: ATTENTION_WEIGHTS.verification_error,
      description: `${sourceLabel(verification.source)} source check could not be completed. A source limitation is not bidder misconduct.`,
      source: { kind: 'verification', id: verification.id, label: `${sourceLabel(verification.source)} verification` },
      clusterKeys: clusterKeysForVerification(verification),
    });
  }
  return null;
}

function factorFromCross(check: AttentionCrossSignal): AttentionFactor | null {
  const label = comparisonLabel(check.comparisonType);
  if (check.status === 'inconsistent') {
    return makeFactor({
      id: `cross:${check.id}:inconsistent`,
      type: 'cross_source_inconsistency',
      originalPoints: ATTENTION_WEIGHTS.cross_source_inconsistency,
      description: `${label} comparison reported a difference after safe normalization. This is not a fraud finding.`,
      source: { kind: 'cross_check', id: check.id, label },
      clusterKeys: clusterKeysForCross(check),
    });
  }
  if (check.status === 'insufficient_evidence') {
    return makeFactor({
      id: `cross:${check.id}:insufficient`,
      type: 'cross_insufficient_evidence',
      originalPoints: ATTENTION_WEIGHTS.cross_insufficient_evidence,
      description: `${label} could not compare two complete source records.`,
      source: { kind: 'cross_check', id: check.id, label },
      clusterKeys: clusterKeysForCross(check),
    });
  }
  if (check.status === 'error') {
    return makeFactor({
      id: `cross:${check.id}:error`,
      type: 'cross_source_error',
      originalPoints: ATTENTION_WEIGHTS.cross_source_error,
      description: `${label} source check could not be completed.`,
      source: { kind: 'cross_check', id: check.id, label },
      clusterKeys: clusterKeysForCross(check),
    });
  }
  return null;
}

function factorFromProcessing(
  document: AttentionDocumentSignal,
  requirements: AttentionInput['requirements'],
  occupied: Set<string>,
): AttentionFactor | null {
  if (!['processing', 'queued'].includes(document.extractionStatus)) {
    return null;
  }
  const requirementId = document.tenderRequirementId;
  if (!requirementId) {
    return null;
  }
  const requirement = requirements.find((item) => item.id === requirementId);
  if (!requirement?.mandatory) {
    return null;
  }
  if (occupied.has(`requirement:${requirementId}`)) {
    return null;
  }
  return makeFactor({
    id: `document:${document.id}:processing`,
    type: 'evidence_processing',
    originalPoints: ATTENTION_WEIGHTS.evidence_processing,
    description: `Important evidence for "${requirement.name}" is still processing.`,
    source: { kind: 'document', id: document.id, label: requirement.name },
    clusterKeys: [`requirement:${requirementId}`, `requirement:${requirementId}:processing`, `document:${document.id}`],
  });
}

function applyOfficerAdjustment(factor: AttentionFactor, reviews: AttentionReviewSignal[]): AttentionFactor {
  const review = reviews.find((item) => factor.source.kind === 'review' && item.id === factor.source.id);
  if (!review) {
    return factor;
  }
  const resolving = isResolving(review);
  if (!resolving) {
    if (review.clarificationStatus === 'responded' && review.status !== 'assessed' && review.status !== 'closed') {
      return {
        ...factor,
        adjustmentReason: 'Clarification was responded to and remains pending officer review. Current contribution is unchanged.',
      };
    }
    if (review.clarificationStatus === 'requested') {
      return {
        ...factor,
        adjustmentReason: 'Clarification is requested. The issue stays visible and current contribution is unchanged.',
      };
    }
    return factor;
  }
  return {
    ...factor,
    currentPoints: 0,
    adjustmentReason: adjustmentMessage(review),
  };
}

function applyCategoryCaps(factors: AttentionFactor[]): AttentionFactor[] {
  const used: Record<AttentionCategory, number> = {
    evidence: 0,
    verification: 0,
    cross: 0,
    source_availability: 0,
    review: 0,
    processing: 0,
  };
  const ranked = [...factors].sort((a, b) => b.currentPoints - a.currentPoints || a.id.localeCompare(b.id));
  const applied = new Map<string, AttentionFactor>();
  for (const factor of ranked) {
    const cap = ATTENTION_CATEGORY_CAPS[factor.category];
    const room = Math.max(0, cap - used[factor.category]);
    const nextPoints = Math.min(factor.currentPoints, room);
    const reduction = factor.currentPoints - nextPoints;
    used[factor.category] += nextPoints;
    applied.set(factor.id, {
      ...factor,
      currentPoints: nextPoints,
      adjustmentReason:
        reduction > 0
          ? [factor.adjustmentReason, `${labelCategory(factor.category)} category cap (${cap}) reduced this factor by ${reduction}.`]
              .filter(Boolean)
              .join(' ')
          : factor.adjustmentReason,
    });
  }
  return factors.map((factor) => applied.get(factor.id) ?? factor);
}

function historyEntries(score: number, unadjustedScore: number, factors: AttentionFactor[]): AttentionResult['history'] {
  if (score === unadjustedScore) {
    return [
      {
        score,
        label: 'Current review priority',
        reason: 'No officer adjustment currently changes the attention score.',
      },
    ];
  }
  const resolved = factors.filter((item) => item.originalPoints > 0 && item.currentPoints === 0);
  const reason =
    resolved.length > 0
      ? resolved.map((item) => item.adjustmentReason ?? item.description).join(' ')
      : 'Officer review state reduced the current attention contribution. Historical machine findings remain visible.';
  return [
    {
      score: unadjustedScore,
      label: 'Before officer adjustments',
      reason: 'Sum of attention factors before resolving assessments or closures, after category caps.',
    },
    {
      score,
      label: 'Current review priority',
      reason,
    },
  ];
}

function typeForIssue(issueType: string, mandatory: boolean): AttentionFactorType | null {
  switch (issueType) {
    case 'evidence_missing':
      return mandatory ? 'mandatory_evidence_missing' : 'optional_evidence_missing';
    case 'verification_mismatch':
      return 'verification_mismatch';
    case 'cross_source_inconsistency':
      return 'cross_source_inconsistency';
    case 'evidence_conflict':
      return 'evidence_conflict';
    case 'source_unavailable':
      return 'cross_insufficient_evidence';
    case 'review_required':
      return 'officer_review_required';
    case 'requirement_unevaluated':
      return 'requirement_unevaluated';
    default:
      return null;
  }
}

function descriptionForReview(type: AttentionFactorType, review: AttentionReviewSignal): string {
  if (type === 'optional_evidence_missing') {
    return `Optional requirement "${review.title}" has no associated evidence.`;
  }
  if (type === 'mandatory_evidence_missing') {
    return `Mandatory requirement "${review.title}" has no associated evidence.`;
  }
  if (type === 'cross_source_inconsistency') {
    return `${review.title} remains an identity difference for officer inspection. This is not a fraud finding.`;
  }
  if (type === 'cross_insufficient_evidence') {
    return `${review.title}: a source record was unavailable or insufficient. This is not bidder misconduct.`;
  }
  return review.title;
}

function clusterKeysForReview(review: AttentionReviewSignal): string[] {
  return unique([
    `review:${review.id}`,
    review.requirementId ? `requirement:${review.requirementId}` : null,
    review.verificationId ? `verification:${review.verificationId}` : null,
    review.verificationSource ? `source:${review.verificationSource}` : null,
    review.crossVerificationId ? `cross:${review.crossVerificationId}` : null,
    review.comparisonType ? `comparison:${review.comparisonType}` : null,
    ...identityKeys(review.verificationSource, review.comparisonType, review.issueType),
  ]);
}

function clusterKeysForRequirement(requirement: AttentionRequirementSignal): string[] {
  return unique([
    `requirement:${requirement.id}`,
    requirement.verificationId ? `verification:${requirement.verificationId}` : null,
    requirement.verificationSource ? `source:${requirement.verificationSource}` : null,
    requirement.crossVerificationId ? `cross:${requirement.crossVerificationId}` : null,
    requirement.comparisonType ? `comparison:${requirement.comparisonType}` : null,
    ...identityKeys(requirement.verificationSource, requirement.comparisonType, requirement.evidenceStatus),
  ]);
}

function clusterKeysForVerification(verification: AttentionVerificationSignal): string[] {
  return unique([
    `verification:${verification.id}`,
    `source:${verification.source}`,
    ...identityKeys(verification.source, null, verification.status),
  ]);
}

function clusterKeysForCross(check: AttentionCrossSignal): string[] {
  return unique([
    `cross:${check.id}`,
    `comparison:${check.comparisonType}`,
    `source:${check.leftSource}`,
    `source:${check.rightSource}`,
    ...identityKeys(null, check.comparisonType, check.status),
  ]);
}

function identityKeys(source: string | null | undefined, comparisonType: string | null | undefined, signal: string): string[] {
  const keys: string[] = [];
  const identitySignals = [
    'mismatched',
    'inconsistent',
    'evidence_conflict',
    'verification_mismatch',
    'cross_source_inconsistency',
    'not_found',
    'error',
    'insufficient_evidence',
    'source_unavailable',
  ];
  if (!identitySignals.includes(signal)) {
    return keys;
  }
  if (comparisonType) {
    keys.push(`identity:${comparisonType}`);
  }
  if (source === 'gst' || comparisonType === 'gst_mca' || comparisonType === 'gst_udyam') {
    keys.push('identity:gst_mca');
  }
  if (source === 'mca' || comparisonType === 'gst_mca' || comparisonType === 'mca_udyam') {
    keys.push('identity:gst_mca');
  }
  return keys;
}

function makeFactor(input: {
  id: string;
  type: AttentionFactorType;
  originalPoints: number;
  description: string;
  source: AttentionFactor['source'];
  clusterKeys: string[];
}): AttentionFactor {
  return {
    id: input.id,
    type: input.type,
    category: ATTENTION_CATEGORY_FOR_TYPE[input.type],
    origin: originForType(input.type),
    originalPoints: input.originalPoints,
    currentPoints: input.originalPoints,
    description: input.description,
    adjustmentReason: null,
    source: input.source,
    clusterKeys: unique(input.clusterKeys),
  };
}

function originForType(type: AttentionFactorType): AttentionOrigin {
  return MACHINE_TYPES.has(type) ? 'machine' : 'human';
}

function isResolving(review: AttentionReviewSignal): boolean {
  if (review.status === 'closed') {
    return true;
  }
  if (review.status === 'assessed' && review.latestAssessment && RESOLVING_ASSESSMENTS.includes(review.latestAssessment as (typeof RESOLVING_ASSESSMENTS)[number])) {
    return true;
  }
  return false;
}

function adjustmentMessage(review: AttentionReviewSignal): string {
  if (review.latestAssessment === 'explanation_accepted') {
    return 'Officer accepted an explanation. The original machine finding remains visible. Current attention contribution is 0.';
  }
  if (review.latestAssessment === 'evidence_sufficient') {
    return 'Officer recorded evidence as sufficient. The original finding remains visible. Current attention contribution is 0.';
  }
  if (review.latestAssessment === 'not_applicable') {
    return 'Officer recorded this issue as not applicable. Current attention contribution is 0.';
  }
  if (review.status === 'closed') {
    return 'Officer closed this review item. Historical activity remains. Current attention contribution is 0.';
  }
  return 'Officer review reduced the current attention contribution. Historical findings remain visible.';
}

function unresolvedReviewCount(reviews: AttentionReviewSignal[]): number {
  return reviews.filter((item) => {
    if (UNRESOLVED_REVIEW_STATUSES.includes(item.status as (typeof UNRESOLVED_REVIEW_STATUSES)[number])) {
      return true;
    }
    if (item.status === 'assessed' && item.latestAssessment && !RESOLVING_ASSESSMENTS.includes(item.latestAssessment as (typeof RESOLVING_ASSESSMENTS)[number])) {
      return true;
    }
    return false;
  }).length;
}

function keysTaken(occupied: Set<string>, keys: string[]): boolean {
  return keys.some((key) => occupied.has(key));
}

function occupy(occupied: Set<string>, keys: string[]): void {
  for (const key of keys) {
    occupied.add(key);
  }
}

function unique(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

function sumPoints(factors: AttentionFactor[], field: 'currentPoints' | 'originalPoints'): number {
  return factors.reduce((total, factor) => total + factor[field], 0);
}

function sourceLabel(source: string): string {
  if (source === 'gst') return 'GST';
  if (source === 'mca') return 'MCA';
  if (source === 'udyam') return 'Udyam';
  if (source === 'pan') return 'PAN';
  if (source === 'income_tax') return 'Income Tax';
  if (source === 'epfo') return 'EPFO';
  if (source === 'esic') return 'ESIC';
  if (source === 'dpiit') return 'DPIIT';
  if (source === 'nsic') return 'NSIC';
  if (source === 'debarment') return 'Debarment';
  if (source === 'bis') return 'BIS';
  if (source === 'gem') return 'GeM';
  return source;
}

function comparisonLabel(type: string): string {
  if (type === 'gst_mca') return 'GST ↔ MCA';
  if (type === 'gst_udyam') return 'GST ↔ Udyam';
  if (type === 'mca_udyam') return 'MCA ↔ Udyam';
  return type;
}

function labelCategory(category: AttentionCategory): string {
  if (category === 'source_availability') return 'Source availability';
  if (category === 'cross') return 'Cross-verification';
  return category.charAt(0).toUpperCase() + category.slice(1);
}
