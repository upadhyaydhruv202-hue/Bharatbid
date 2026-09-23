import { describe, expect, it, vi } from 'vitest';

import { ExternalServiceError } from '../../../errors';
import { Msg91SmsProvider, UnconfiguredMsg91SmsProvider } from './msg91.provider';

describe('Msg91SmsProvider', () => {
  it('sends a locally generated OTP through the v5 API', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ type: 'success', request_id: 'req-1' }),
    })) as unknown as typeof fetch;

    const provider = new Msg91SmsProvider({
      authKey: 'test-key',
      templateId: 'template-1',
      timeoutMs: 1000,
      fetchImpl,
    });

    const sent = await provider.send({
      to: '+919876543210',
      text: 'Your verification code is 123456. It expires in 5 minutes.',
    });
    expect(sent.provider).toBe('msg91');
    expect(sent.id).toBe('req-1');
    expect(fetchImpl).toHaveBeenCalled();
    const url = String(vi.mocked(fetchImpl).mock.calls[0]?.[0]);
    expect(url).toContain('control.msg91.com/api/v5/otp');
    expect(url).not.toContain('test-key');
  });

  it('does not treat provider errors as success', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: false,
      status: 401,
      json: async () => ({}),
    })) as unknown as typeof fetch;
    const provider = new Msg91SmsProvider({
      authKey: 'test-key',
      templateId: 'template-1',
      timeoutMs: 1000,
      fetchImpl,
    });
    await expect(
      provider.send({ to: '+919876543210', text: 'Your verification code is 123456.' }),
    ).rejects.toBeInstanceOf(ExternalServiceError);
  });

  it('maps timeouts', async () => {
    const fetchImpl = vi.fn(async (_url, init) => {
      const error = new Error('aborted');
      error.name = 'AbortError';
      if (init?.signal) {
        throw error;
      }
      throw error;
    }) as unknown as typeof fetch;
    const provider = new Msg91SmsProvider({
      authKey: 'test-key',
      templateId: 'template-1',
      timeoutMs: 10,
      fetchImpl,
    });
    await expect(
      provider.send({ to: '+919876543210', text: 'Your verification code is 123456.' }),
    ).rejects.toMatchObject({ message: expect.stringMatching(/timed out|failed|unavailable|CONFIGURATION/i) });
  });

  it('requires configuration', async () => {
    await expect(new UnconfiguredMsg91SmsProvider().send({ to: '+919876543210', text: '123456' })).rejects.toMatchObject({
      message: 'CONFIGURATION REQUIRED',
    });
  });
});
