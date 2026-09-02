import type { AuthSessionPayload, AuthUser } from '../types/api';
import { apiRequest } from './api';

export function login(email: string, password: string) {
  return apiRequest<AuthSessionPayload>('/api/v1/auth/login', {
    method: 'POST',
    body: { email, password },
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
