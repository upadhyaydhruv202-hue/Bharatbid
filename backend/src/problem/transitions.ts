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
