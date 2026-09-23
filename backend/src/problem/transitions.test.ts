import { describe, expect, it } from 'vitest';

import { ValidationError } from '../errors';
import {
  allowedTenderStatusActions,
  assertBidDocumentsMutable,
  assertEvaluationMayBegin,
  assertRequirementsMutable,
  assertRequirementsAmendable,
  assertTenderMayOpen,
  assertTenderStatusTransition,
  assertWithinBidWindow,
  effectiveTenderStatus,
} from './transitions';

function calendar(overrides: Partial<{ status: 'draft' | 'open' | 'under_evaluation' | 'closed' | 'cancelled' | 'awarded'; issue: string; close: string }>) {
  return {
    status: overrides.status ?? 'open',
    issueDate: new Date(overrides.issue ?? '2026-07-01T00:00:00.000Z'),
    closingDate: new Date(overrides.close ?? '2026-09-15T18:30:00.000Z'),
  };
}

describe('tender calendar gates', () => {
  it('rejects opening before the issue date', () => {
    expect(() =>
      assertTenderMayOpen(calendar({ issue: '2026-09-20T00:00:00.000Z' }), new Date('2026-09-19T23:59:59.000Z')),
    ).toThrow(ValidationError);
  });

  it('allows opening exactly at the issue date', () => {
    expect(() =>
      assertTenderMayOpen(calendar({ issue: '2026-07-01T00:00:00.000Z' }), new Date('2026-07-01T00:00:00.000Z')),
    ).not.toThrow();
  });

  it('allows bids during the open window', () => {
    const during = new Date('2026-08-01T12:00:00.000Z');
    expect(() => assertWithinBidWindow(calendar({ status: 'open' }), during)).not.toThrow();
    expect(effectiveTenderStatus(calendar({ status: 'open' }), during)).toBe('open');
  });

  it('treats the closing instant as closed for bidding', () => {
    const atClose = new Date('2026-09-15T18:30:00.000Z');
    expect(effectiveTenderStatus(calendar({ status: 'open' }), atClose)).toBe('closed');
    expect(() => assertWithinBidWindow(calendar({ status: 'open' }), atClose)).toThrow(ValidationError);
  });

  it('rejects bids after the closing date', () => {
    const afterClose = new Date('2026-09-15T18:30:00.001Z');
    expect(effectiveTenderStatus(calendar({ status: 'open' }), afterClose)).toBe('closed');
    expect(() =>
      assertWithinBidWindow(calendar({ status: 'open' }), afterClose),
    ).toThrow(ValidationError);
  });

  it('keeps a stored closed tender closed after the closing date', () => {
    expect(
      effectiveTenderStatus(calendar({ status: 'closed' }), new Date('2026-09-18T00:00:00.000Z')),
    ).toBe('closed');
    expect(() =>
      assertWithinBidWindow(calendar({ status: 'closed' }), new Date('2026-09-18T00:00:00.000Z')),
    ).toThrow(ValidationError);
  });

  it('presents GEM/2026/B/CPCL/001 as closed after its historical closing instant without changing the date', () => {
    const seed = calendar({
      status: 'open',
      issue: '2026-07-01T00:00:00.000Z',
      close: '2026-09-15T18:30:00.000Z',
    });
    expect(seed.closingDate.toISOString()).toBe('2026-09-15T18:30:00.000Z');
    expect(effectiveTenderStatus(seed, new Date('2026-09-18T00:00:00.000Z'))).toBe('closed');
    expect(() => assertWithinBidWindow(seed, new Date('2026-09-18T00:00:00.000Z'))).toThrow(ValidationError);
  });

  it('rejects bids before the issue date even if status is open', () => {
    expect(() =>
      assertWithinBidWindow(calendar({ status: 'open' }), new Date('2026-06-30T23:59:59.000Z')),
    ).toThrow(ValidationError);
  });

  it('rejects bids on cancelled and closed tenders', () => {
    expect(() =>
      assertWithinBidWindow(calendar({ status: 'cancelled' }), new Date('2026-08-01T12:00:00.000Z')),
    ).toThrow(ValidationError);
    expect(() =>
      assertWithinBidWindow(calendar({ status: 'closed' }), new Date('2026-08-01T12:00:00.000Z')),
    ).toThrow(ValidationError);
  });

  it('rejects evaluation while the submission window is still open', () => {
    expect(() =>
      assertEvaluationMayBegin(calendar({ status: 'open' }), new Date('2026-09-15T18:30:00.000Z')),
    ).toThrow(ValidationError);
  });

  it('allows evaluation after the closing date', () => {
    expect(() =>
      assertEvaluationMayBegin(calendar({ status: 'open' }), new Date('2026-09-15T18:30:00.001Z')),
    ).not.toThrow();
  });

  it('rejects invalid and repeated-illegal transitions', () => {
    expect(() => assertTenderStatusTransition('draft', 'under_evaluation')).toThrow(ValidationError);
    expect(() => assertTenderStatusTransition('closed', 'open')).toThrow(ValidationError);
    expect(() => assertTenderStatusTransition('cancelled', 'open')).toThrow(ValidationError);
    expect(() => assertTenderStatusTransition('open', 'open')).not.toThrow();
  });

  it('hides start-evaluation until closing and hides open until issue', () => {
    const beforeIssue = calendar({ status: 'draft' });
    expect(
      allowedTenderStatusActions(beforeIssue, new Date('2026-06-01T00:00:00.000Z')).map((item) => item.to),
    ).toEqual(['cancelled']);
    const stillOpen = calendar({ status: 'open' });
    expect(
      allowedTenderStatusActions(stillOpen, new Date('2026-09-01T00:00:00.000Z')).map((item) => item.to),
    ).toEqual(['cancelled']);
    expect(
      allowedTenderStatusActions(stillOpen, new Date('2026-09-16T00:00:00.000Z')).map((item) => item.to),
    ).toEqual(['under_evaluation', 'cancelled']);
  });

  it('freezes documents after close and freezes silent requirement edits after publish', () => {
    expect(() => assertBidDocumentsMutable('closed', 'submitted')).toThrow(ValidationError);
    expect(() => assertBidDocumentsMutable('open', 'draft')).not.toThrow();
    expect(() => assertRequirementsMutable('under_evaluation')).toThrow(ValidationError);
    expect(() => assertRequirementsMutable('open')).toThrow(ValidationError);
    expect(() => assertRequirementsMutable('draft')).not.toThrow();
  });

  it('allows requirement amendments only while the tender is open for bidding', () => {
    expect(() => assertRequirementsAmendable('open')).not.toThrow();
    expect(() => assertRequirementsAmendable('draft')).toThrow(ValidationError);
    expect(() => assertRequirementsAmendable('under_evaluation')).toThrow(ValidationError);
    expect(() =>
      assertRequirementsAmendable(calendar({ status: 'open' }), new Date('2026-09-16T00:00:00.000Z')),
    ).toThrow(ValidationError);
  });
});
