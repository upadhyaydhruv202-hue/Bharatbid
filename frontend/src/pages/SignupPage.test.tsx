import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AuthProvider } from '../auth/AuthProvider';
import { SignupPage } from './SignupPage';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe('SignupPage', () => {
  it('collects registration details before OTP', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo) => {
        const url = String(input);
        if (url.includes('/public-config')) {
          return jsonResponse({
            googleClientId: null,
            googleEnabled: false,
            demoAuth: true,
            otpEnabled: true,
            emailOtpConfigured: true,
            mobileOtpConfigured: true,
            passwordLogin: true,
          });
        }
        return jsonResponse({
          destination: 'officer@example.com',
          channel: 'email',
          purpose: 'signup',
          expiresInSeconds: 300,
          resendAvailableInSeconds: 60,
          digits: 6,
        });
      }),
    );

    render(
      <MemoryRouter initialEntries={['/signup']}>
        <AuthProvider>
          <Routes>
            <Route path="/signup" element={<SignupPage />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Register your identity')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Asha Rao' } });
    fireEvent.change(screen.getByLabelText('Official email'), { target: { value: 'officer@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send verification code' }));
    expect(await screen.findByLabelText('One-time code')).toBeInTheDocument();
  });
});

function jsonResponse(data: unknown, status = 200): Response {
  const envelope =
    data && typeof data === 'object' && 'success' in (data as object)
      ? data
      : { success: true, data, meta: {} };
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => envelope,
  } as Response;
}
