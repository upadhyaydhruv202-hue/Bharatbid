import { describe, expect, it } from 'vitest';

import { GoogleAuthService } from './google.service';
import { AuthenticationError, ExternalServiceError } from '../errors';

function service(clientId = 'client-123', now = () => 1_700_000_000_000) {
  return new GoogleAuthService({
    config: { auth: { googleClientId: clientId } as never },
    now,
  });
}

const valid = {
  iss: 'https://accounts.google.com',
  aud: 'client-123',
  sub: 'google-sub-1',
  email: 'officer@example.com',
  email_verified: 'true',
  exp: 1_700_000_000 + 3_600,
  name: 'Officer',
};

describe('GoogleAuthService', () => {
  it('accepts a valid ID token payload', () => {
    const identity = service().assertClaims(valid);
    expect(identity.subject).toBe('google-sub-1');
    expect(identity.email).toBe('officer@example.com');
    expect(identity.emailVerified).toBe(true);
  });

  it('rejects the wrong audience', () => {
    expect(() => service().assertClaims({ ...valid, aud: 'other' })).toThrow(AuthenticationError);
  });

  it('rejects the wrong issuer', () => {
    expect(() => service().assertClaims({ ...valid, iss: 'https://evil.example' })).toThrow(AuthenticationError);
  });

  it('rejects a missing subject', () => {
    expect(() => service().assertClaims({ ...valid, sub: '' })).toThrow(AuthenticationError);
  });

  it('rejects an expired token', () => {
    expect(() => service().assertClaims({ ...valid, exp: 1_699_000_000 })).toThrow(AuthenticationError);
  });

  it('does not treat frontend email as identity without verification', () => {
    const identity = service().assertClaims({ ...valid, email_verified: 'false' });
    expect(identity.emailVerified).toBe(false);
  });

  it('requires configuration before calling Google', async () => {
    const unconfigured = new GoogleAuthService({
      config: { auth: {} as never },
    });
    await expect(unconfigured.verifyIdToken('token')).rejects.toBeInstanceOf(ExternalServiceError);
  });
});
