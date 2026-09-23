import { assertSafeExternalUrl, fetchExternal } from '../../security/ssrf';

/**
 * OCR extracts candidate text only. It is never a verification result.
 * LIVE verification still requires an authorized provider lookup.
 */
export async function extractOcrText(input: {
  buffer: Buffer;
  mimeType: string;
  filename: string;
}): Promise<{ ok: true; text: string; engine: string } | { ok: false; reason: string; engine: string }> {
  const baseUrl = process.env.OCR_HTTP_URL?.trim();
  if (!baseUrl) {
    return {
      ok: false,
      engine: 'ocr-unavailable',
      reason:
        'OCR is not configured (set OCR_HTTP_URL). Scanned images are not treated as verified identifiers. This is not a government verification.',
    };
  }

  try {
    const url = `${baseUrl.replace(/\/$/, '')}/extract`;
    assertSafeExternalUrl(url, { field: 'ocrUrl', allowHttp: false });
    const response = await fetchExternal(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(process.env.OCR_API_KEY ? { authorization: `Bearer ${process.env.OCR_API_KEY}` } : {}),
      },
      body: JSON.stringify({
        filename: input.filename,
        mimeType: input.mimeType,
        contentBase64: input.buffer.toString('base64'),
      }),
      timeoutMs: 15_000,
      allowHttp: false,
    });
    if (!response.ok) {
      return { ok: false, engine: 'ocr-http', reason: `OCR provider returned HTTP ${response.status}` };
    }
    const payload = (await response.json()) as { text?: unknown };
    const text = typeof payload.text === 'string' ? payload.text.trim() : '';
    if (!text) {
      return { ok: false, engine: 'ocr-http', reason: 'OCR returned no text. Extraction is not verification.' };
    }
    return { ok: true, text: `OCR CANDIDATE TEXT (not verified)\n\n${text}`, engine: 'ocr-http' };
  } catch {
    return { ok: false, engine: 'ocr-http', reason: 'OCR provider unavailable. Extraction is not verification.' };
  }
}
