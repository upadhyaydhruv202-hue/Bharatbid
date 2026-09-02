import { afterEach, describe, expect, it, vi } from 'vitest';

import { register } from './auth';
import { listNotifications } from './notifications';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('shared API clients', () => {
  it('calls register and notifications endpoints', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/auth/register')) {
        return jsonResponse({
          success: true,
          data: {
            user: { id: 'u1', email: 'a@example.com', displayName: 'A', status: 'active', role: 'user', roles: ['user'], permissions: [] },
            tokens: { accessToken: 'a', refreshToken: 'r', tokenType: 'Bearer', expiresIn: 900 },
          },
          meta: {},
        });
      }
      return jsonResponse({ success: true, data: { items: [], unreadCount: 0 }, meta: {} });
    });
    vi.stubGlobal('fetch', fetchMock);

    await register({ email: 'a@example.com', password: 'correct-horse', displayName: 'A' });
    await listNotifications('token');

    const urls = fetchMock.mock.calls.map((call) => String(call[0]));
    expect(urls.some((url) => url.includes('/api/v1/auth/register'))).toBe(true);
    expect(urls.some((url) => url.includes('/api/v1/notifications'))).toBe(true);
  });
});

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}
