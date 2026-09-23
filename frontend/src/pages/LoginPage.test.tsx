import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AuthProvider } from '../auth/AuthProvider';
import { LoginPage } from './LoginPage';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
});

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="pathname">{location.pathname}</div>;
}

describe('LoginPage', () => {
  it('does not advertise demo credentials', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo) => {
        const url = String(input);
        if (url.includes('/auth/public-config')) {
          return jsonResponse({
            googleClientId: null,
            googleEnabled: false,
            demoAuth: false,
            otpEnabled: true,
            emailOtpConfigured: false,
            mobileOtpConfigured: false,
            passwordLogin: true,
          });
        }
        return jsonResponse({});
      }),
    );

    render(
      <MemoryRouter initialEntries={['/login']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Sign in')).toBeInTheDocument();
    expect(screen.queryByText('demo.officer@example.com')).not.toBeInTheDocument();
    expect(screen.queryByText('demo-password')).not.toBeInTheDocument();
  });

  it('replaces the login route after a successful password sign-in', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo) => {
        const url = String(input);
        if (url.includes('/auth/public-config')) {
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
          user: {
            id: 'user-1',
            email: 'demo.admin@example.com',
            displayName: 'Demo Admin',
            status: 'active',
            role: 'admin',
            roles: ['admin'],
            permissions: [],
          },
          tokens: {
            accessToken: 'access-1',
            refreshToken: 'refresh-1',
            tokenType: 'Bearer',
            expiresIn: 900,
          },
        });
      }),
    );

    render(
      <MemoryRouter
        initialEntries={['/login']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <AuthProvider>
          <LocationProbe />
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/bharatbid" element={<p>Landed command center</p>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Sign in with password' }));
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'demo.admin@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'demo-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Landed command center')).toBeInTheDocument();
    expect(screen.getByTestId('pathname')).toHaveTextContent('/bharatbid');
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
