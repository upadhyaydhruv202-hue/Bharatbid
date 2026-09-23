import type { AuthPublicConfig, AuthSessionPayload, AuthUser, OtpChallenge } from '../types/api';
import { apiRequest } from './api';

export function login(email: string, password: string) {
  return apiRequest<AuthSessionPayload>('/api/v1/auth/login', {
    method: 'POST',
    body: { email, password },
  });
}

export function getAuthPublicConfig() {
  return apiRequest<AuthPublicConfig>('/api/v1/auth/public-config');
}

export function requestOtp(input: {
  destination: string;
  channel: 'email' | 'sms';
  purpose?: 'login' | 'signup';
}) {
  const path = input.channel === 'sms' ? '/api/v1/auth/mobile/request-otp' : '/api/v1/auth/email/request-otp';
  return apiRequest<OtpChallenge>(path, {
    method: 'POST',
    body: input,
  });
}

export function verifyOtp(input: {
  destination: string;
  code: string;
  purpose?: 'login' | 'signup';
  channel: 'email' | 'sms';
  displayName?: string;
  organizationName?: string;
  phone?: string;
}) {
  const path = input.channel === 'sms' ? '/api/v1/auth/mobile/verify-otp' : '/api/v1/auth/email/verify-otp';
  return apiRequest<AuthSessionPayload & { verified: boolean }>(path, {
    method: 'POST',
    body: input,
  });
}

export function signInWithGoogle(credential: string, organizationName?: string) {
  return apiRequest<AuthSessionPayload>('/api/v1/auth/google', {
    method: 'POST',
    body: { credential, organizationName },
  });
}

export function register(input: { email: string; password: string; displayName: string }) {
  return apiRequest<AuthSessionPayload>('/api/v1/auth/register', {
    method: 'POST',
    body: input,
  });
}

export function refreshSession(refreshToken: string) {
  return apiRequest<AuthSessionPayload>('/api/v1/auth/refresh', {
    method: 'POST',
    body: { refreshToken },
  });
}

export function logout(refreshToken: string, accessToken?: string) {
  return apiRequest<{ revoked: boolean }>('/api/v1/auth/logout', {
    method: 'POST',
    token: accessToken,
    body: { refreshToken },
  });
}

export function getMe(accessToken: string) {
  return apiRequest<{ user: AuthUser }>('/api/v1/auth/me', { token: accessToken });
}
