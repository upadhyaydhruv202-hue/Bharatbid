import { AUDIT_ACTIONS } from '../../constants';
import { activityTitle } from '../serialize';

export const PROCUREMENT_AUDIT_ACTIONS = [
  AUDIT_ACTIONS.TENDER_CREATED,
  AUDIT_ACTIONS.TENDER_UPDATED,
  AUDIT_ACTIONS.TENDER_STATUS_CHANGED,
  AUDIT_ACTIONS.TENDER_REQUIREMENT_CREATED,
  AUDIT_ACTIONS.TENDER_REQUIREMENT_UPDATED,
  AUDIT_ACTIONS.TENDER_REQUIREMENT_ACTIVATED,
  AUDIT_ACTIONS.TENDER_REQUIREMENT_DEACTIVATED,
  AUDIT_ACTIONS.TENDER_REQUIREMENT_REORDERED,
  AUDIT_ACTIONS.BIDDER_CREATED,
  AUDIT_ACTIONS.BIDDER_UPDATED,
  AUDIT_ACTIONS.BID_CREATED,
  AUDIT_ACTIONS.BID_UPDATED,
  AUDIT_ACTIONS.BID_SUBMITTED,
  AUDIT_ACTIONS.BID_STATUS_CHANGED,
  AUDIT_ACTIONS.DOCUMENT_UPLOADED,
  AUDIT_ACTIONS.DOCUMENT_UPDATED,
  AUDIT_ACTIONS.DOCUMENT_VERSION_CREATED,
  AUDIT_ACTIONS.DOCUMENT_REQUIREMENT_LINKED,
  AUDIT_ACTIONS.DOCUMENT_ARCHIVED,
  AUDIT_ACTIONS.DOCUMENT_DOWNLOADED,
  AUDIT_ACTIONS.DOCUMENT_EXTRACTION_STARTED,
  AUDIT_ACTIONS.DOCUMENT_EXTRACTION_COMPLETED,
  AUDIT_ACTIONS.DOCUMENT_EXTRACTION_FAILED,
  AUDIT_ACTIONS.VERIFICATION_REQUESTED,
  AUDIT_ACTIONS.VERIFICATION_COMPLETED,
  AUDIT_ACTIONS.VERIFICATION_MISMATCHED,
  AUDIT_ACTIONS.VERIFICATION_NOT_FOUND,
  AUDIT_ACTIONS.VERIFICATION_FAILED,
  AUDIT_ACTIONS.VERIFICATION_RETRIED,
  AUDIT_ACTIONS.CROSS_VERIFICATION_REQUESTED,
  AUDIT_ACTIONS.CROSS_VERIFICATION_COMPLETED,
  AUDIT_ACTIONS.CROSS_VERIFICATION_INCONSISTENT,
  AUDIT_ACTIONS.REQUIREMENT_EVALUATION_COMPLETED,
  AUDIT_ACTIONS.REVIEW_ITEM_CREATED,
  AUDIT_ACTIONS.REVIEW_OPENED,
  AUDIT_ACTIONS.REVIEW_STARTED,
  AUDIT_ACTIONS.REVIEW_ASSESSMENT_CREATED,
  AUDIT_ACTIONS.REVIEW_ASSESSMENT_UPDATED,
  AUDIT_ACTIONS.CLARIFICATION_REQUESTED,
  AUDIT_ACTIONS.CLARIFICATION_RESPONDED,
  AUDIT_ACTIONS.CLARIFICATION_CANCELLED,
  AUDIT_ACTIONS.REVIEW_CLOSED,
  AUDIT_ACTIONS.EVALUATION_CREATED,
  AUDIT_ACTIONS.EVALUATION_STARTED,
  AUDIT_ACTIONS.EVALUATION_NOTE_CREATED,
  AUDIT_ACTIONS.EVALUATION_DECISION_RECORDED,
  AUDIT_ACTIONS.EVALUATION_STATUS_CHANGED,
  AUDIT_ACTIONS.EVALUATION_REPORT_GENERATED,
] as const;

const SYSTEM_ACTIONS = new Set<string>([
  AUDIT_ACTIONS.DOCUMENT_EXTRACTION_STARTED,
  AUDIT_ACTIONS.DOCUMENT_EXTRACTION_COMPLETED,
  AUDIT_ACTIONS.DOCUMENT_EXTRACTION_FAILED,
  AUDIT_ACTIONS.VERIFICATION_COMPLETED,
  AUDIT_ACTIONS.VERIFICATION_MISMATCHED,
  AUDIT_ACTIONS.VERIFICATION_NOT_FOUND,
  AUDIT_ACTIONS.VERIFICATION_FAILED,
  AUDIT_ACTIONS.CROSS_VERIFICATION_COMPLETED,
  AUDIT_ACTIONS.CROSS_VERIFICATION_INCONSISTENT,
  AUDIT_ACTIONS.REQUIREMENT_EVALUATION_COMPLETED,
  AUDIT_ACTIONS.REVIEW_ITEM_CREATED,
]);

export type ProcurementActorKind = 'officer' | 'system';

export function actorKindForAction(action: string, metadata?: unknown): ProcurementActorKind {
  const meta = metadata && typeof metadata === 'object' ? (metadata as Record<string, unknown>) : {};
  if (meta.actor === 'officer') {
    return 'officer';
  }
  if (meta.actor === 'system') {
    return 'system';
  }
  return SYSTEM_ACTIONS.has(action) ? 'system' : 'officer';
}

export function activityHeadline(action: string, metadata?: unknown): string {
  const title = activityTitle(action, metadata);
  if (action === AUDIT_ACTIONS.EVALUATION_REPORT_GENERATED) {
    return 'generated a tender evaluation report';
  }
  return title.charAt(0).toUpperCase() + title.slice(1);
}

export function hrefForActivity(input: {
  action: string;
  resource?: string | null;
  resourceId?: string | null;
  metadata?: unknown;
}): string | null {
  const meta = input.metadata && typeof input.metadata === 'object' ? (input.metadata as Record<string, unknown>) : {};
  const tenderId = asId(meta.tenderId);
  const bidId = asId(meta.bidSubmissionId) ?? (input.resource === 'bid' ? input.resourceId : null);
  const reviewId = asId(meta.reviewItemId);
  const evaluationId = input.resource === 'evaluation' ? input.resourceId : asId(meta.evaluationId);

  if (input.action.startsWith('evaluation.') && tenderId) {
    return `/bharatbid/evaluation/${tenderId}`;
  }
  if (input.action.startsWith('evaluation.') && evaluationId) {
    return `/bharatbid/evaluation`;
  }
  if (reviewId && bidId) {
    return `/bharatbid/review/${reviewId}`;
  }
  if (input.action.startsWith('verification.') && bidId) {
    return `/bharatbid/bids/${bidId}/verification`;
  }
  if (input.action.startsWith('cross_verification.') && bidId) {
    return `/bharatbid/bids/${bidId}/cross-checks`;
  }
  if (input.action.startsWith('requirement.') && bidId) {
    return `/bharatbid/bids/${bidId}/requirements`;
  }
  if ((input.action.startsWith('review') || input.action.startsWith('clarification.')) && bidId) {
    return `/bharatbid/bids/${bidId}/review`;
  }
  if (input.action.startsWith('document.') && bidId) {
    return `/bharatbid/bids/${bidId}`;
  }
  if (input.action.startsWith('bid.') && (bidId || input.resourceId)) {
    return `/bharatbid/bids/${bidId ?? input.resourceId}`;
  }
  if (input.action.startsWith('bidder.') && input.resourceId) {
    return `/bharatbid/bidders/${input.resourceId}`;
  }
  if (input.action.startsWith('tender.') && (tenderId || input.resourceId)) {
    return `/bharatbid/tenders/${tenderId ?? input.resourceId}`;
  }
  if (bidId) {
    return `/bharatbid/bids/${bidId}`;
  }
  if (tenderId) {
    return `/bharatbid/tenders/${tenderId}`;
  }
  return null;
}

function asId(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}
