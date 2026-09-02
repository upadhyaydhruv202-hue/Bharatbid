import { describe, expect, it } from 'vitest';

import { AuthenticationError } from '../../errors';
import { createSignedDownload, verifySignedDownload } from './storage.sign';

describe('signed downloads', () => {
  const signing = { appUrl: 'http://localhost:5000', secret: 'unit-test-secret' };

  it('creates a verifiable local download URL', () => {
    const signed = createSignedDownload('documents/a.txt', 300, signing);
    expect(signed.url).toContain('/api/v1/storage/download');
    const url = new URL(signed.url);
    expect(
      verifySignedDownload({
        key: url.searchParams.get('key') ?? '',
        expires: url.searchParams.get('expires') ?? '',
        signature: url.searchParams.get('sig') ?? '',
        secret: signing.secret,
      }),
    ).toBe('documents/a.txt');
  });

  it('rejects a tampered signature', () => {
    const signed = createSignedDownload('documents/a.txt', 300, signing);
    const url = new URL(signed.url);
    expect(() =>
      verifySignedDownload({
        key: url.searchParams.get('key') ?? '',
        expires: url.searchParams.get('expires') ?? '',
        signature: 'a'.repeat(64),
        secret: signing.secret,
      }),
    ).toThrow(AuthenticationError);
  });
});
