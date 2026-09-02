import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';

import { AuthProvider } from '../auth/AuthProvider';
import { TEST_SESSION } from '../test/session';
import { ThemeProvider } from '../ui';
import { AppLayout } from './AppLayout';

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe('AppLayout', () => {
  it('shows BharatBid procurement navigation and hides starter-kit gallery links', () => {
    render(
      <MemoryRouter>
        <ThemeProvider>
          <AuthProvider initialSession={TEST_SESSION}>
            <Routes>
              <Route element={<AppLayout />}>
                <Route path="*" element={<p>Workspace</p>} />
              </Route>
            </Routes>
          </AuthProvider>
        </ThemeProvider>
      </MemoryRouter>,
    );

    expect(screen.getByText('BharatBid')).toBeInTheDocument();
    expect(screen.getByText(/Evidence-Based Bid Evaluation/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Command Center' })).toHaveAttribute('href', '/bharatbid');
    expect(screen.getByRole('link', { name: 'Tenders' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Bids' })).toHaveAttribute('href', '/bharatbid/bids');
    expect(screen.getByRole('link', { name: 'Notifications' })).toHaveAttribute('href', '/bharatbid/notifications');
    expect(screen.getByText('DEMO / SYNTHETIC')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Dashboard' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'UI kit' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Copilot' })).not.toBeInTheDocument();
  });

  it('keeps login-only navigation before sign-in', () => {
    render(
      <MemoryRouter>
        <ThemeProvider>
          <AuthProvider>
            <Routes>
              <Route element={<AppLayout />}>
                <Route path="*" element={<p>Workspace</p>} />
              </Route>
            </Routes>
          </AuthProvider>
        </ThemeProvider>
      </MemoryRouter>,
    );

    expect(screen.getAllByRole('link', { name: 'Sign in' }).length).toBeGreaterThan(0);
    expect(screen.queryByRole('link', { name: 'Command Center' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Copilot' })).not.toBeInTheDocument();
  });
});
