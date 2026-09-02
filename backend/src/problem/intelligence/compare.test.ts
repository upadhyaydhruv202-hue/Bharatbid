import { describe, expect, it } from 'vitest';

import type { NormalizedSourceRecord } from '../verification/types';
import { compareVerificationPair, type CrossCompareInput } from './compare';

function snapshot(
  source: NormalizedSourceRecord['source'],
  legalName: string | null,
  state: string | null,
  mode: NormalizedSourceRecord['sourceMode'] = 'demo',
): NormalizedSourceRecord {
  return {
    source,
    sourceMode: mode,
    sourceDisplayName: `DEMO ${source.toUpperCase()} Registry`,
    recordFound: true,
    retrievedAt: '2026-08-30T12:40:00.000Z',
    identifierType: source === 'gst' ? 'gstin' : source === 'mca' ? 'cin' : 'udyam',
    identifier: 'synthetic',
    legalName,
    tradeName: null,
    status: 'ACTIVE',
    registrationDate: '2018-01-15',
    state,
  };
}

function pair(overrides: Partial<CrossCompareInput> = {}): CrossCompareInput {
  return {
    leftStatus: 'matched',
    rightStatus: 'matched',
    leftSource: 'gst',
    rightSource: 'mca',
    leftMode: 'demo',
    rightMode: 'demo',
    leftDisplayName: 'DEMO GST Registry',
    rightDisplayName: 'DEMO MCA Registry',
    leftSnapshot: snapshot('gst', 'ABC Technologies Pvt. Ltd.', 'Gujarat'),
    rightSnapshot: snapshot('mca', 'ABC TECHNOLOGIES PRIVATE LIMITED', 'GJ'),
    ...overrides,
  };
}

describe('Cross-source comparison', () => {
  it('treats GST and MCA legal names as a normalized match and states as consistent', () => {
    const result = compareVerificationPair(pair());
    expect(result.status).toBe('consistent');
    expect(result.sourceBasis).toBe('demo');
    expect(result.fields.find((field) => field.field === 'legalName')?.outcome).toBe('normalized_match');
    expect(result.fields.find((field) => field.field === 'state')?.outcome).toBe('normalized_match');
    expect(result.explanation).toMatch(/DEMO \/ SIMULATED SOURCES/);
    expect(result.explanation.toLowerCase()).not.toMatch(/fraud|fake|official government verification/);
  });

  it('records a legal-name difference as inconsistent, not fraud', () => {
    const result = compareVerificationPair(
      pair({
        leftSnapshot: snapshot('gst', 'ABC Technologies Private Limited', 'Gujarat'),
        rightSnapshot: snapshot('mca', 'ABC Technology Solutions Private Limited', 'Gujarat'),
      }),
    );
    expect(result.status).toBe('inconsistent');
    expect(result.fields.find((field) => field.field === 'legalName')?.outcome).toBe('difference');
    expect(result.fields.find((field) => field.field === 'state')?.outcome).toBe('exact_match');
    expect(result.explanation).toMatch(/officer review/i);
    expect(result.explanation.toLowerCase()).not.toMatch(/fraud detected|fake|disqualified/);
  });

  it('compares GST and Udyam enterprise names when both records exist', () => {
    const result = compareVerificationPair(
      pair({
        rightSource: 'udyam',
        rightDisplayName: 'DEMO UDYAM Registry',
        rightSnapshot: snapshot('udyam', 'ABC Technologies Private Limited', 'Gujarat'),
      }),
    );
    expect(result.status).toBe('consistent');
    expect(result.fields.find((field) => field.field === 'legalName')?.outcome).toBe('normalized_match');
  });

  it('uses insufficient evidence when MCA is not found', () => {
    const result = compareVerificationPair(pair({ rightStatus: 'not_found', rightSnapshot: null }));
    expect(result.status).toBe('insufficient_evidence');
    expect(result.explanation).toMatch(/does not by itself establish bidder invalidity/i);
    expect(result.explanation.toLowerCase()).not.toMatch(/fraud|invalid bidder/);
  });

  it('uses insufficient evidence when a source check errors, not inconsistent', () => {
    const result = compareVerificationPair(pair({ rightStatus: 'error', rightSnapshot: null }));
    expect(result.status).toBe('insufficient_evidence');
    expect(result.status).not.toBe('inconsistent');
    expect(result.status).not.toBe('error');
  });

  it('marks GST and GeM as not comparable', () => {
    const result = compareVerificationPair(
      pair({
        rightSource: 'gem',
        rightDisplayName: 'DEMO GeM Registry',
        rightSnapshot: snapshot('gem', 'ABC Technologies Private Limited', 'Gujarat'),
      }),
    );
    expect(result.status).toBe('not_comparable');
    expect(result.fields).toEqual([]);
  });

  it('propagates DEMO source basis for two demo sources', () => {
    const result = compareVerificationPair(pair());
    expect(result.sourceBasis).toBe('demo');
    expect(result.explanation).toMatch(/simulated/i);
  });

  it('uses mixed source basis when one source is external', () => {
    const result = compareVerificationPair(
      pair({
        rightMode: 'external',
        rightSnapshot: snapshot('mca', 'ABC Technologies Private Limited', 'Gujarat', 'external'),
      }),
    );
    expect(result.sourceBasis).toBe('mixed');
    expect(result.explanation).toMatch(/MIXED SOURCE BASIS/);
    expect(result.explanation.toLowerCase()).not.toMatch(/officially verified|entire result as externally verified/);
  });

  it('does not compare GSTIN against CIN as if they were the same identifier', () => {
    const result = compareVerificationPair(pair());
    expect(result.fields.some((field) => field.field === 'identifier' || field.field === 'gstin')).toBe(false);
  });

  it('treats exact equal legal names as an exact match', () => {
    const result = compareVerificationPair(
      pair({
        leftSnapshot: snapshot('gst', 'Bayfront Engineering Private Limited', 'Tamil Nadu'),
        rightSnapshot: snapshot('mca', 'Bayfront Engineering Private Limited', 'Tamil Nadu'),
      }),
    );
    expect(result.fields.find((field) => field.field === 'legalName')?.outcome).toBe('exact_match');
    expect(result.status).toBe('consistent');
  });
});
