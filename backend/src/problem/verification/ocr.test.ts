import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../security/ssrf', () => ({
  assertSafeExternalUrl: vi.fn(),
  fetchExternal: vi.fn(),
}));

import { assertSafeExternalUrl, fetchExternal } from '../../security/ssrf';
import { extractOcrText } from './ocr';

describe('extractOcrText', () => {
  afterEach(() => {
    delete process.env.OCR_HTTP_URL;
    vi.mocked(assertSafeExternalUrl).mockReset();
    vi.mocked(fetchExternal).mockReset();
  });

  it('returns OCR_UNAVAILABLE when no extractor is configured', async () => {
    const result = await extractOcrText({
      buffer: Buffer.from('x'),
      mimeType: 'image/png',
      filename: 'scan.png',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.engine).toBe('ocr-unavailable');
      expect(result.reason).toMatch(/not a government verification/i);
    }
  });

  it('requires https OCR endpoints', async () => {
    process.env.OCR_HTTP_URL = 'https://ocr.example.com';
    vi.mocked(assertSafeExternalUrl).mockImplementation(() => {
      throw new Error('blocked');
    });
    const result = await extractOcrText({
      buffer: Buffer.from('x'),
      mimeType: 'image/png',
      filename: 'scan.png',
    });
    expect(result.ok).toBe(false);
    expect(vi.mocked(assertSafeExternalUrl)).toHaveBeenCalledWith(
      'https://ocr.example.com/extract',
      expect.objectContaining({ allowHttp: false }),
    );
  });

  it('does not treat OCR HTTP failure or empty text as verified identity', async () => {
    process.env.OCR_HTTP_URL = 'https://ocr.example.com';
    vi.mocked(assertSafeExternalUrl).mockReturnValue(new URL('https://ocr.example.com/extract'));
    vi.mocked(fetchExternal).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    } as Response);
    const empty = await extractOcrText({
      buffer: Buffer.from('x'),
      mimeType: 'image/png',
      filename: 'scan.png',
    });
    expect(empty.ok).toBe(false);

    vi.mocked(fetchExternal).mockRejectedValue(new Error('timeout'));
    const timedOut = await extractOcrText({
      buffer: Buffer.from('x'),
      mimeType: 'image/png',
      filename: 'scan.png',
    });
    expect(timedOut.ok).toBe(false);
    if (!timedOut.ok) {
      expect(timedOut.reason).toMatch(/unavailable|timeout|failed/i);
    }
  });
});
