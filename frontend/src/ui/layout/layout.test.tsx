import type { ReactElement } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ActivityFeed } from '../dashboard/Panels';
import { KpiCard } from '../dashboard/KpiCard';
import { SimpleBarChart } from '../dashboard/SimpleCharts';
import { AppShell } from '../layout/AppShell';
import { Breadcrumb } from '../layout/Breadcrumb';
import { EmptyState, ErrorState, LoadingState } from '../states/FeedbackStates';
import { ThemeProvider, THEME_STORAGE_KEY } from '../theme/ThemeProvider';
import { ToastProvider, useToast } from '../toast/ToastProvider';

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  document.documentElement.classList.remove('dark');
});

function renderShell(ui: ReactElement) {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ThemeProvider>
        <ToastProvider>{ui}</ToastProvider>
      </ThemeProvider>
    </MemoryRouter>,
  );
}

describe('feedback and layout', () => {
  it('renders empty, error, and loading states', () => {
    const onRetry = vi.fn();
    render(
      <>
        <EmptyState title="Nothing yet" />
        <ErrorState message="Network down" onRetry={onRetry} />
        <LoadingState />
      </>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalled();
    expect(screen.getByRole('status')).toHaveTextContent('Loading…');
  });

  it('toggles theme from the app shell', () => {
    renderShell(
      <AppShell brand="BharatBid" navigation={<a href="/">Home</a>}>
        <p>Main</p>
      </AppShell>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Switch to dark mode' }));
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  });

  it('renders breadcrumbs and command-center building blocks without domain data', () => {
    renderShell(
      <>
        <Breadcrumb items={[{ label: 'Command Center', to: '/bharatbid' }, { label: 'Tenders' }]} />
        <KpiCard label="Active tenders" value="10" />
        <SimpleBarChart data={[{ label: 'Bucket A', value: 3 }]} />
        <ActivityFeed items={[]} />
      </>,
    );
    expect(screen.getByText('Active tenders')).toBeInTheDocument();
    expect(screen.getByText('No activity yet')).toBeInTheDocument();
    expect(screen.getByText('Tenders')).toBeInTheDocument();
  });
});

describe('toasts', () => {
  it('publishes a toast through context', () => {
    function Probe() {
      const { toast } = useToast();
      return (
        <button type="button" onClick={() => toast({ title: 'Saved', variant: 'success' })}>
          Notify
        </button>
      );
    }
    render(
      <ToastProvider>
        <Probe />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Notify' }));
    expect(screen.getByText('Saved')).toBeInTheDocument();
  });
});
