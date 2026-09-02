import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AuthProvider } from '../auth/AuthProvider';
import { TEST_SESSION } from '../test/session';
import { FeatureProvider, isDemoMode, isFeatureEnabled } from './index';
import { ThemeProvider } from '../ui';
import { AppLayout } from '../layouts/AppLayout';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('feature flag helpers', () => {
  it('treats enabled, disabled, and missing flags correctly', () => {
    const state = { demoMode: true, features: { ai: true, sms: false } };
    expect(isFeatureEnabled(state, 'ai')).toBe(true);
    expect(isFeatureEnabled(state, 'sms')).toBe(false);
    expect(isFeatureEnabled(state, 'notifications')).toBe(false);
    expect(isDemoMode(state)).toBe(true);
    expect(isDemoMode({ demoMode: false, features: {} })).toBe(false);
  });
});

describe('FeatureProvider', () => {
  it('loads server flags and keeps the SIH procurement sidebar', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/api/v1/features')) {
          return jsonResponse({
            demoMode: true,
            features: { pdf: true, notifications: true },
          });
        }
        return jsonResponse({});
      }),
    );

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ThemeProvider>
          <AuthProvider initialSession={TEST_SESSION}>
            <FeatureProvider>
              <AppLayout />
            </FeatureProvider>
          </AuthProvider>
        </ThemeProvider>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Command Center' })).toBeInTheDocument();
    });
    expect(screen.getByRole('link', { name: 'Notifications' })).toHaveAttribute('href', '/bharatbid/notifications');
    expect(screen.queryByRole('link', { name: 'Copilot' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Automations' })).not.toBeInTheDocument();
  });
});

function jsonResponse(data: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: async () => ({ success: true, data, meta: {} }),
  } as Response;
}
