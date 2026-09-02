import { describe, expect, it } from 'vitest';

import { compareClaimsToSource, notFoundExplanation } from './compare';
import { extractClaimsFromText } from './extract';
import { DEMO_GST_ERROR_IDENTIFIER, DEMO_GST_RECORDS } from './fixtures';
import { normalizeComparableText } from './normalize';
import {
  createDefaultVerificationAdapters,
  createDemoGstAdapter,
  createDemoPanAdapter,
  VerificationAdapterRegistry,
} from './registry';

describe('Verification adapter registry', () => {
  it('registers DEMO GST, MCA, Udyam, GeM, PAN, and other adapters as DEMO and available', () => {
    const registry = new VerificationAdapterRegistry();
    const sources = registry.list().map((adapter) => adapter.source);
    expect(sources).toEqual([
      'gst',
      'mca',
      'udyam',
      'gem',
      'pan',
      'income_tax',
      'epfo',
      'esic',
      'dpiit',
      'nsic',
      'debarment',
      'bis',
    ]);
    for (const adapter of registry.list()) {
      expect(adapter.mode).toBe('demo');
      expect(adapter.availability()).toBe('available');
      expect(adapter.displayName).toMatch(/^DEMO /);
    }
  });

  it('rejects unknown sources instead of fetching arbitrary URLs', () => {
    const registry = new VerificationAdapterRegistry(createDefaultVerificationAdapters());
    expect(registry.get('gst')?.source).toBe('gst');
    expect(() => registry.require('http://evil.example' as never)).toThrow(/Unknown verification source/);
  });
});

describe('Demo GST adapter', () => {
  const adapter = createDemoGstAdapter();

  it('returns a matched synthetic record with DEMO source mode', async () => {
    const result = await adapter.lookup({ identifierType: 'gstin', identifier: '33AAAPB1234C1Z5' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.record.sourceMode).toBe('demo');
      expect(result.record.sourceDisplayName).toBe('DEMO GST Registry');
      expect(result.record.legalName).toBe('Bayfront Engineering Private Limited');
      expect(result.record.state).toBe('Tamil Nadu');
    }
  });

  it('returns RECORD_NOT_FOUND for an unknown synthetic GSTIN', async () => {
    const result = await adapter.lookup({ identifierType: 'gstin', identifier: '07AAAAA0000A1Z5' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('RECORD_NOT_FOUND');
    }
  });

  it('returns SOURCE_UNAVAILABLE for the synthetic error identifier', async () => {
    const result = await adapter.lookup({ identifierType: 'gstin', identifier: DEMO_GST_ERROR_IDENTIFIER });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('SOURCE_UNAVAILABLE');
    }
  });

  it('rejects CIN lookups against GST', async () => {
    const result = await adapter.lookup({
      identifierType: 'cin',
      identifier: 'U29120TN2014PTC095001',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('UNSUPPORTED_IDENTIFIER');
    }
  });
});

describe('Demo PAN adapter', () => {
  it('returns a DEMO PAN record and never uses a live NSDL URL', async () => {
    const adapter = createDemoPanAdapter();
    const result = await adapter.lookup({ identifierType: 'pan', identifier: 'AAAPB1234C' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.record.sourceMode).toBe('demo');
      expect(result.record.sourceDisplayName).toBe('DEMO PAN Registry');
    }
  });
});

describe('Field matching', () => {
  const source = {
    source: 'gst' as const,
    sourceMode: 'demo' as const,
    sourceDisplayName: 'DEMO GST Registry',
    recordFound: true,
    retrievedAt: '2026-08-30T12:40:00.000Z',
    identifierType: 'gstin' as const,
    identifier: '24ABCDE1234F1Z5',
    legalName: 'ABC Technologies Private Limited',
    tradeName: 'ABC Tech',
    status: 'ACTIVE',
    registrationDate: '2018-01-15',
    state: 'Gujarat',
  };

  it('matches exact identifiers and normalized legal names', () => {
    expect(normalizeComparableText('ABC Technologies Pvt. Ltd.')).toBe('ABC TECHNOLOGIES PRIVATE LIMITED');
    const result = compareClaimsToSource(
      {
        identifier: '24ABCDE1234F1Z5',
        legalName: 'ABC Technologies Pvt. Ltd.',
        legalNameOrigin: 'extracted',
        state: 'Gujarat',
        stateOrigin: 'extracted',
      },
      source,
    );
    expect(result.status).toBe('matched');
    expect(result.fields.find((field) => field.field === 'identifier')?.outcome).toBe('match');
    expect(result.fields.find((field) => field.field === 'legalName')?.outcome).toBe('match');
    expect(result.explanation).toContain('DEMO GST Registry');
    expect(result.explanation).toContain('SIMULATED');
  });

  it('reports a mismatch when the legal name differs', () => {
    const result = compareClaimsToSource(
      {
        identifier: DEMO_GST_RECORDS[2].identifier,
        legalName: 'Delta Petrochem Traders',
        legalNameOrigin: 'extracted',
        state: 'Karnataka',
        stateOrigin: 'extracted',
      },
      {
        ...source,
        identifier: DEMO_GST_RECORDS[2].identifier,
        legalName: DEMO_GST_RECORDS[2].legalName,
        state: 'Karnataka',
      },
    );
    expect(result.status).toBe('mismatched');
    expect(result.fields.find((field) => field.field === 'identifier')?.outcome).toBe('match');
    expect(result.fields.find((field) => field.field === 'legalName')?.outcome).toBe('mismatch');
    expect(result.explanation.toLowerCase()).not.toMatch(/fraud|authentic|compliant/);
  });

  it('does not treat identifier punctuation differences as a match unless exact after normalize', () => {
    const result = compareClaimsToSource(
      {
        identifier: '24ABCDE1234F1Z6',
        legalName: source.legalName,
        legalNameOrigin: 'extracted',
        state: 'Gujarat',
        stateOrigin: 'extracted',
      },
      source,
    );
    expect(result.status).toBe('mismatched');
    expect(result.fields.find((field) => field.field === 'identifier')?.outcome).toBe('mismatch');
  });

  it('explains not-found without invalidating the bidder', () => {
    expect(notFoundExplanation('DEMO GST Registry')).toContain('does not by itself prove');
  });
});

describe('Extraction to identifier', () => {
  it('reads a GSTIN, legal name, and state from synthetic certificate text', () => {
    const claims = extractClaimsFromText(
      'Legal Name: Bayfront Engineering Private Limited\nState: Tamil Nadu\nGSTIN: 33AAAPB1234C1Z5',
    );
    expect(claims.gstin).toBe('33AAAPB1234C1Z5');
    expect(claims.legalName).toBe('Bayfront Engineering Private Limited');
    expect(claims.state).toBe('Tamil Nadu');
  });
});
