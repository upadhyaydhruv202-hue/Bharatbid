import { ValidationError } from '../errors';
import type { BidSubmissionStatusName, TenderStatusName } from './types';

const TENDER_TRANSITIONS: Record<TenderStatusName, readonly TenderStatusName[]> = {
  draft: ['open', 'cancelled'],
  open: ['under_evaluation', 'cancelled'],
  under_evaluation: ['closed', 'cancelled'],
  closed: ['awarded'],
  awarded: [],
  cancelled: [],
};

export interface TenderStatusAction {
  to: TenderStatusName;
  label: string;
  destructive: boolean;
}

export const TENDER_STATUS_ACTIONS: Record<TenderStatusName, readonly TenderStatusAction[]> = {
  draft: [
    { to: 'open', label: 'Open tender', destructive: false },
    { to: 'cancelled', label: 'Cancel', destructive: true },
  ],
  open: [
    { to: 'under_evaluation', label: 'Start evaluation', destructive: false },
    { to: 'cancelled', label: 'Cancel', destructive: true },
  ],
  under_evaluation: [
    { to: 'closed', label: 'Close evaluation', destructive: false },
    { to: 'cancelled', label: 'Cancel', destructive: true },
  ],
  closed: [{ to: 'awarded', label: 'Mark awarded', destructive: false }],
  awarded: [],
  cancelled: [],
};

const BID_TRANSITIONS: Record<BidSubmissionStatusName, readonly BidSubmissionStatusName[]> = {
  draft: ['submitted', 'withdrawn'],
  submitted: ['under_review', 'withdrawn'],
  under_review: ['finalized', 'withdrawn'],
  withdrawn: [],
  finalized: [],
};

export interface TenderCalendar {
  status: TenderStatusName;
  issueDate: Date;
  closingDate: Date;
}

/** Server clock only. Pass `now` in tests; never trust a client-supplied timestamp. */
export function serverNow(now?: Date): Date {
  return now ?? new Date();
}

export function assertTenderStatusTransition(from: TenderStatusName, to: TenderStatusName): void {
  if (from === to) {
    return;
  }
  if (!TENDER_TRANSITIONS[from].includes(to)) {
    throw new ValidationError('Invalid tender status transition', [
      { path: 'status', message: `Cannot change tender status from ${from} to ${to}`, code: 'custom' },
    ]);
  }
}

export function canAcceptBids(status: TenderStatusName): boolean {
  return status === 'open';
}

/**
 * Stored `open` after the closing instant is presented and gated as closed.
 * OPEN → CLOSED is not a persisted transition in this machine (`open` → `under_evaluation` → `closed`).
 * Do not persist a skip; derive from server time only.
 */
export function effectiveTenderStatus(
  tender: { status: string; closingDate: Date },
  now?: Date,
): TenderStatusName {
  if (tender.status === 'open' && serverNow(now).getTime() >= tender.closingDate.getTime()) {
    return 'closed';
  }
  return tender.status as TenderStatusName;
}

export function isAcceptingBids(tender: TenderCalendar, now?: Date): boolean {
  return effectiveTenderStatus(tender, now) === 'open' && serverNow(now).getTime() >= tender.issueDate.getTime();
}

export function assertTenderMayOpen(tender: Pick<TenderCalendar, 'issueDate'>, now?: Date): void {
  if (serverNow(now).getTime() < tender.issueDate.getTime()) {
    throw new ValidationError('Tender cannot be opened before the issue date', [
      { path: 'status', message: 'Opening is not allowed until the issue date (server time)', code: 'custom' },
    ]);
  }
}

export function assertWithinBidWindow(tender: TenderCalendar, now?: Date): void {
  if (!canAcceptBids(tender.status)) {
    throw new ValidationError('Bids can only be created for open tenders', [
      { path: 'tenderId', message: `Tender is ${tender.status} and is not accepting bids`, code: 'custom' },
    ]);
  }
  const current = serverNow(now).getTime();
  if (current < tender.issueDate.getTime()) {
    throw new ValidationError('Bids cannot be submitted before the tender issue date', [
      { path: 'tenderId', message: 'The submission window has not opened yet (server time)', code: 'custom' },
    ]);
  }
  if (current >= tender.closingDate.getTime()) {
    throw new ValidationError('Bids cannot be submitted after the closing date', [
      { path: 'tenderId', message: 'The submission window has closed (server time)', code: 'custom' },
    ]);
  }
}

export function assertEvaluationMayBegin(
  tender: Pick<TenderCalendar, 'status' | 'closingDate'>,
  now?: Date,
): void {
  if (tender.status === 'draft' || tender.status === 'cancelled' || tender.status === 'awarded') {
    throw new ValidationError('Evaluation cannot begin for this tender', [
      { path: 'status', message: `Tenders in ${tender.status} status cannot enter evaluation`, code: 'custom' },
    ]);
  }
  if (serverNow(now).getTime() <= tender.closingDate.getTime()) {
    throw new ValidationError('Evaluation cannot begin before the tender closing date', [
      { path: 'status', message: 'The submission window is still open (server time)', code: 'custom' },
    ]);
  }
}

export function allowedTenderStatusActions(tender: TenderCalendar, now?: Date): TenderStatusAction[] {
  const current = serverNow(now).getTime();
  return TENDER_STATUS_ACTIONS[tender.status].filter((action) => {
    if (action.to === 'open') {
      return current >= tender.issueDate.getTime();
    }
    if (action.to === 'under_evaluation') {
      return current > tender.closingDate.getTime();
    }
    return true;
  });
}

export function assertBidDocumentsMutable(
  tender: TenderStatusName | { status: string; closingDate: Date },
  bidStatus: BidSubmissionStatusName,
  now?: Date,
): void {
  if (bidStatus === 'withdrawn' || bidStatus === 'finalized') {
    throw new ValidationError('Documents cannot be changed on this bid', [
      { path: 'status', message: `Bids in ${bidStatus} status cannot receive document changes`, code: 'custom' },
    ]);
  }
  const tenderStatus = typeof tender === 'string' ? tender : effectiveTenderStatus(tender, now);
  if (tenderStatus === 'closed' || tenderStatus === 'awarded' || tenderStatus === 'cancelled') {
    throw new ValidationError('Documents cannot be changed after the tender is closed', [
      { path: 'tenderId', message: `Tenders in ${tenderStatus} status keep historical evidence immutable`, code: 'custom' },
    ]);
  }
}

export function assertRequirementsMutable(status: TenderStatusName): void {
  if (status !== 'draft') {
    throw new ValidationError('Requirements are frozen after the tender is published', [
      { path: 'tenderId', message: `Tenders in ${status} status cannot add or silently edit requirements. Use an amendment.`, code: 'custom' },
    ]);
  }
}

export function assertRequirementsAmendable(
  tender: TenderStatusName | { status: string; closingDate: Date },
  now?: Date,
): void {
  const status = typeof tender === 'string' ? tender : effectiveTenderStatus(tender, now);
  if (status !== 'open') {
    throw new ValidationError('Requirement amendments are only allowed while the tender is open for bidding', [
      { path: 'tenderId', message: `Tenders in ${status} status cannot amend requirements`, code: 'custom' },
    ]);
  }
}

export function assertBidStatusTransition(from: BidSubmissionStatusName, to: BidSubmissionStatusName): void {
  if (from === to) {
    return;
  }
  if (!BID_TRANSITIONS[from].includes(to)) {
    throw new ValidationError('Invalid bid submission status transition', [
      { path: 'status', message: `Cannot change bid status from ${from} to ${to}`, code: 'custom' },
    ]);
  }
}

export function isTerminalTenderStatus(status: TenderStatusName): boolean {
  return status === 'awarded' || status === 'cancelled';
}

export { TENDER_TRANSITIONS, BID_TRANSITIONS };
