import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { NotificationList } from './NotificationList';
import { NotificationBell } from './NotificationBell';
import { NotificationPreferences } from './NotificationPreferences';

describe('NotificationList', () => {
  it('renders an empty state', () => {
    render(<NotificationList items={[]} />);
    expect(screen.getByText('No notifications')).toBeInTheDocument();
  });

  it('renders notification titles, deep links, and marks one read', () => {
    const reads: string[] = [];
    render(
      <MemoryRouter>
        <NotificationList
          items={[
            {
              id: '1',
              type: 'info',
              title: 'Welcome',
              body: 'Your demo account is ready',
              metadata: { href: '/bharatbid/bids/1' },
            },
          ]}
          onRead={(id) => reads.push(id)}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText('Welcome')).toBeInTheDocument();
    expect(screen.getByText('Open related record')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Mark read' }));
    expect(reads).toEqual(['1']);
  });
});

describe('NotificationBell', () => {
  it('opens the inbox and shows unread count', () => {
    render(
      <MemoryRouter>
        <NotificationBell
          unreadCount={2}
          items={[{ id: '1', type: 'info', title: 'Hello', body: 'There' }]}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText('2')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Notifications/ }));
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open notification center' })).toHaveAttribute(
      'href',
      '/bharatbid/notifications',
    );
  });
});

describe('NotificationPreferences', () => {
  it('locks security alerts and reports a marketing change', () => {
    const changes: unknown[] = [];
    render(
      <NotificationPreferences
        preferences={[{ category: 'marketing', channel: 'email', enabled: true }]}
        onChange={(preference) => changes.push(preference)}
      />,
    );
    const security = screen.getByLabelText('security_alerts email');
    expect(security).toBeDisabled();
    fireEvent.click(screen.getByLabelText('marketing email'));
    expect(changes).toEqual([{ category: 'marketing', channel: 'email', enabled: false }]);
  });
});
