import type { AppConfig } from '../types/config';

export interface SecureCookieOptions {
  httpOnly: true;
  secure: boolean;
  sameSite: 'strict' | 'lax' | 'none';
  path: string;
  domain?: string;
  maxAge?: number;
}

/**
 * Cookie flags for any future httpOnly session cookies.
 * Access and refresh tokens currently travel in JSON bodies, not cookies.
 */
export function secureCookieOptions(
  config: AppConfig,
  overrides: Partial<SecureCookieOptions> = {},
): SecureCookieOptions {
  return {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: config.isProduction ? 'strict' : 'lax',
    path: '/',
    ...overrides,
  };
}
