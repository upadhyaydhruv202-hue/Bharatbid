import { AuthenticationError, ExternalServiceError } from '../errors';
import type { AppConfig } from '../types/config';

const GOOGLE_TOKENINFO = 'https://oauth2.googleapis.com/tokeninfo';
const GOOGLE_ISSUERS = new Set(['https://accounts.google.com', 'accounts.google.com']);

export type GoogleIdentity = {
  subject: string;
  email?: string;
  emailVerified: boolean;
  name?: string;
};

export class GoogleAuthService {
  constructor(
    private readonly options: {
      config: Pick<AppConfig, 'auth'>;
      fetchImpl?: typeof fetch;
      now?: () => number;
    },
  ) {}

  get configured(): boolean {
    return Boolean(this.options.config.auth.googleClientId);
  }

  async verifyIdToken(idToken: string): Promise<GoogleIdentity> {
    if (!this.configured) {
      throw new ExternalServiceError('CONFIGURATION REQUIRED', { provider: 'google' });
    }

    const token = idToken.trim();
    if (!token) {
      throw new AuthenticationError('Invalid Google credential');
    }

    const fetchImpl = this.options.fetchImpl ?? fetch;
    const url = new URL(GOOGLE_TOKENINFO);
    url.searchParams.set('id_token', token);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);

    try {
      const response = await fetchImpl(url, { method: 'GET', signal: controller.signal, redirect: 'error' });
      if (!response.ok) {
        throw new AuthenticationError('Invalid Google credential');
      }

      const payload = (await response.json()) as Record<string, unknown>;
      return this.assertClaims(payload);
    } catch (error) {
      if (error instanceof AuthenticationError || error instanceof ExternalServiceError) {
        throw error;
      }
      throw new AuthenticationError('Invalid Google credential');
    } finally {
      clearTimeout(timer);
    }
  }

  assertClaims(payload: Record<string, unknown>): GoogleIdentity {
    const issuer = typeof payload.iss === 'string' ? payload.iss : '';
    if (!GOOGLE_ISSUERS.has(issuer)) {
      throw new AuthenticationError('Invalid Google credential');
    }

    const audience = typeof payload.aud === 'string' ? payload.aud : '';
    if (audience !== this.options.config.auth.googleClientId) {
      throw new AuthenticationError('Invalid Google credential');
    }

    const subject = typeof payload.sub === 'string' ? payload.sub.trim() : '';
    if (!subject) {
      throw new AuthenticationError('Invalid Google credential');
    }

    const expRaw = payload.exp;
    const exp = typeof expRaw === 'number' ? expRaw : typeof expRaw === 'string' ? Number(expRaw) : NaN;
    const nowSeconds = Math.floor((this.options.now ?? Date.now)() / 1000);
    if (!Number.isFinite(exp) || exp <= nowSeconds) {
      throw new AuthenticationError('Invalid Google credential');
    }

    const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : undefined;
    const emailVerified = payload.email_verified === true || payload.email_verified === 'true';
    const name = typeof payload.name === 'string' ? payload.name.trim() : undefined;

    return {
      subject,
      email: email || undefined,
      emailVerified,
      name,
    };
  }
}
