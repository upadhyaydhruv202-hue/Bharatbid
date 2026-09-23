import { randomUUID } from 'node:crypto';

import { ExternalServiceError } from '../../../errors';
import type { AppConfig } from '../../../types/config';
import type { SendSmsInput, SentSms, SmsProvider } from '../sms.types';

const MSG91_OTP_URL = 'https://control.msg91.com/api/v5/otp';

function toMsg91Mobile(to: string): string {
  const digits = to.replace(/\D/g, '');
  if (digits.length === 10) {
    return `91${digits}`;
  }
  return digits;
}

function extractOtp(text: string): string | undefined {
  const match = text.match(/\b(\d{4,8})\b/);
  return match?.[1];
}

export class Msg91SmsProvider implements SmsProvider {
  readonly name = 'msg91';

  constructor(
    private readonly options: {
      authKey: string;
      templateId: string;
      timeoutMs: number;
      fetchImpl?: typeof fetch;
    },
  ) {}

  async send(input: SendSmsInput): Promise<SentSms> {
    const otp = extractOtp(input.text);
    if (!otp) {
      throw new ExternalServiceError('MSG91 OTP payload is invalid', { provider: 'msg91' });
    }

    const fetchImpl = this.options.fetchImpl ?? fetch;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.options.timeoutMs);
    const url = new URL(MSG91_OTP_URL);
    url.searchParams.set('template_id', this.options.templateId);
    url.searchParams.set('mobile', toMsg91Mobile(input.to));
    url.searchParams.set('otp', otp);

    try {
      const response = await fetchImpl(url, {
        method: 'POST',
        headers: {
          authkey: this.options.authKey,
          'content-type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify({
          template_id: this.options.templateId,
          mobile: toMsg91Mobile(input.to),
          otp,
        }),
        redirect: 'error',
        signal: controller.signal,
      });

      if (response.status === 401 || response.status === 403) {
        throw Object.assign(
          new ExternalServiceError('MSG91 rejected the request', {
            provider: 'msg91',
            status: response.status,
          }),
          { retryable: false },
        );
      }

      if (response.status === 429) {
        throw new ExternalServiceError('MSG91 rate limit exceeded', {
          provider: 'msg91',
          status: 429,
        });
      }

      if (response.status >= 400 && response.status < 500) {
        throw Object.assign(
          new ExternalServiceError('MSG91 rejected the OTP request', {
            provider: 'msg91',
            status: response.status,
          }),
          { retryable: false },
        );
      }

      if (!response.ok) {
        throw new ExternalServiceError('MSG91 is unavailable', {
          provider: 'msg91',
          status: response.status,
        });
      }

      const body = (await response.json().catch(() => ({}))) as { type?: string; message?: unknown; request_id?: unknown };
      if (typeof body.type === 'string' && body.type.toLowerCase() === 'error') {
        throw new ExternalServiceError('MSG91 rejected the OTP request', { provider: 'msg91' });
      }

      return {
        id: typeof body.request_id === 'string' && body.request_id ? body.request_id : randomUUID(),
        to: input.to,
        provider: 'msg91',
      };
    } catch (error) {
      if (error instanceof ExternalServiceError) {
        throw error;
      }
      if (error instanceof Error && error.name === 'AbortError') {
        throw new ExternalServiceError('MSG91 request timed out', { provider: 'msg91' });
      }
      throw new ExternalServiceError('MSG91 delivery failed', { provider: 'msg91' });
    } finally {
      clearTimeout(timer);
    }
  }
}

export class UnconfiguredMsg91SmsProvider implements SmsProvider {
  readonly name = 'msg91';

  async send(_input: SendSmsInput): Promise<SentSms> {
    throw new ExternalServiceError('CONFIGURATION REQUIRED', { provider: 'msg91' });
  }
}

export function createMsg91SmsProvider(config: AppConfig, fetchImpl?: typeof fetch): SmsProvider {
  if (!config.sms.msg91.authKey || !config.sms.msg91.templateId) {
    return new UnconfiguredMsg91SmsProvider();
  }

  return new Msg91SmsProvider({
    authKey: config.sms.msg91.authKey,
    templateId: config.sms.msg91.templateId,
    timeoutMs: config.sms.timeoutMs,
    fetchImpl,
  });
}
