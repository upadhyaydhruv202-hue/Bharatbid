import { Link, Outlet } from 'react-router-dom';

import { AuthStatus } from '../auth/AuthStatus';
import { useAuth } from '../auth/AuthProvider';
import { roleLabel } from '../lib/roles';
import { AppShell, SidebarGroup, SidebarNavLink } from '../ui';
import { TopbarSearch } from './TopbarSearch';

const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [{ to: '/bharatbid', label: 'Command Center', end: true as const }],
  },
  {
    label: 'Procurement',
    items: [
      { to: '/bharatbid/tenders', label: 'Tenders' },
      { to: '/bharatbid/bidders', label: 'Bidders' },
      { to: '/bharatbid/bids', label: 'Bids' },
    ],
  },
  {
    label: 'Review',
    items: [
      { to: '/bharatbid/review', label: 'Review' },
      { to: '/bharatbid/intelligence', label: 'Attention' },
      { to: '/bharatbid/evaluation', label: 'Evaluation' },
    ],
  },
  {
    label: 'Governance',
    items: [
      { to: '/bharatbid/activity', label: 'Activity' },
      { to: '/bharatbid/notifications', label: 'Notifications' },
    ],
  },
];

export function AppLayout() {
  const { isAuthenticated, user } = useAuth();

  return (
    <AppShell
      brand={
        <Link
          to={isAuthenticated ? '/bharatbid' : '/login'}
          className="block rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-info"
        >
          <span className="block text-sm font-semibold tracking-tight">BharatBid</span>
          <span className="mt-0.5 block text-[10px] font-normal leading-4 text-foreground-muted">
            Procurement Intelligence &amp; Evidence-Based Bid Evaluation
          </span>
        </Link>
      }
      topbarStart={
        isAuthenticated ? (
          <div className="flex min-w-0 items-center gap-3">
            <span className="hidden items-center gap-2 sm:flex">
              <span className="rounded border border-warning/40 bg-warning/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-warning">
                DEMO ENVIRONMENT
              </span>
              <span className="hidden items-center gap-1.5 text-[11px] text-foreground-muted xl:flex">
                <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden />
                Systems operational
              </span>
            </span>
            <TopbarSearch />
          </div>
        ) : undefined
      }
      topbarEnd={<AuthStatus />}
      sidebarFooter={
        <div className="space-y-1 px-1">
          {isAuthenticated && user ? (
            <p className="text-[11px] font-medium text-foreground">{roleLabel(user)}</p>
          ) : null}
          <p className="text-[10px] font-semibold uppercase tracking-wider text-warning">DEMO / SYNTHETIC</p>
          <p className="text-[10px] leading-4 text-foreground-muted">
            SIH demonstration. Adapters are not live government APIs.
          </p>
        </div>
      }
      navigation={
        isAuthenticated ? (
          <>
            {NAV_GROUPS.map((group) => (
              <SidebarGroup key={group.label} label={group.label}>
                {group.items.map((item) => (
                  <SidebarNavLink key={item.to} to={item.to} end={'end' in item ? item.end : undefined}>
                    {item.label}
                  </SidebarNavLink>
                ))}
              </SidebarGroup>
            ))}
          </>
        ) : (
          <SidebarNavLink to="/login">Sign in</SidebarNavLink>
        )
      }
    >
      <Outlet />
    </AppShell>
  );
}
