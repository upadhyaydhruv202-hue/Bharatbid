import { describe, expect, it, vi } from 'vitest';

import { AuthorizedHttpAdapter } from './http-adapter';

vi.mock('../../security/ssrf', () => ({
  assertSafeExternalUrl: vi.fn(),
  fetchExternal: vi.fn(),
}));

import { fetchExternal } from '../../security/ssrf';

describe('AuthorizedHttpAdapter', () => {
  const adapter = new AuthorizedHttpAdapter({
    source: 'gst',
    authority: 'GSTN via Setu',
    providerName: 'Setu GSTIN Verification',
    mode: 'sandbox',
    baseUrl: 'https://dg-sandbox.setu.co',
    pathTemplate: '/api/gstin/{identifier}',
    headers: { 'x-client-id': 'id', 'x-client-secret': 'secret' },
  });

  it('does not treat HTTP failures as matched', async () => {
    vi.mocked(fetchExternal).mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({}),
    } as Response);
    const result = await adapter.lookup({ identifierType: 'gstin', identifier: '33AAAPB1234C1Z5' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('SOURCE_UNAVAILABLE');
    }
  });

  it('does not treat NOT_FOUND as a match or as clear', async () => {
    vi.mocked(fetchExternal).mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({}),
    } as Response);
    const result = await adapter.lookup({ identifierType: 'gstin', identifier: '33AAAPB1234C1Z5' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('RECORD_NOT_FOUND');
    }
  });

  it('labels successful lookups as sandbox/live, never demo', async () => {
    vi.mocked(fetchExternal).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ legalName: 'Example Pvt Ltd', status: 'Active' }),
    } as Response);
    const result = await adapter.lookup({ identifierType: 'gstin', identifier: '33AAAPB1234C1Z5' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.record.sourceMode).toBe('sandbox');
      expect(result.record.sourceMode).not.toBe('demo');
      expect(result.record.legalName).toBe('Example Pvt Ltd');
    }
  });

  it('treats malformed JSON as SOURCE_UNAVAILABLE, not matched', async () => {
    vi.mocked(fetchExternal).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => {
        throw new Error('bad json');
      },
    } as unknown as Response);
    const result = await adapter.lookup({ identifierType: 'gstin', identifier: '33AAAPB1234C1Z5' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('SOURCE_UNAVAILABLE');
    }
  });

  it('does not treat empty JSON as a match', async () => {
    vi.mocked(fetchExternal).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    } as Response);
    const result = await adapter.lookup({ identifierType: 'gstin', identifier: '33AAAPB1234C1Z5' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('SOURCE_UNAVAILABLE');
    }
  });

  it('does not treat authentication failure or rate limits as a match', async () => {
    vi.mocked(fetchExternal).mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({}),
    } as Response);
    const unauthorized = await adapter.lookup({ identifierType: 'gstin', identifier: '33AAAPB1234C1Z5' });
    expect(unauthorized.ok).toBe(false);
    if (!unauthorized.ok) {
      expect(unauthorized.code).toBe('SOURCE_UNAVAILABLE');
    }

    vi.mocked(fetchExternal).mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({}),
    } as Response);
    const limited = await adapter.lookup({ identifierType: 'gstin', identifier: '33AAAPB1234C1Z5' });
    expect(limited.ok).toBe(false);
    if (!limited.ok) {
      expect(limited.code).not.toBeUndefined();
      expect(['SOURCE_TIMEOUT', 'SOURCE_UNAVAILABLE']).toContain(limited.code);
    }
  });
});
