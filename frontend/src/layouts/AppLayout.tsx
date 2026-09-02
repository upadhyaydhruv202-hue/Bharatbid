import { Link, Outlet } from 'react-router-dom';

import { AuthStatus } from '../auth/AuthStatus';
import { useAuth } from '../auth/AuthProvider';
import { roleLabel } from '../lib/roles';
import { AppShell, SidebarNavLink } from '../ui';

const PROCUREMENT_NAV = [
  { to: '/bharatbid', label: 'Command Center', end: true as const },
  { to: '/bharatbid/tenders', label: 'Tenders' },
  { to: '/bharatbid/bidders', label: 'Bidders' },
  { to: '/bharatbid/bids', label: 'Bids' },
  { to: '/bharatbid/review', label: 'Review' },
  { to: '/bharatbid/intelligence', label: 'Attention' },
  { to: '/bharatbid/evaluation', label: 'Evaluation' },
  { to: '/bharatbid/activity', label: 'Activity' },
  { to: '/bharatbid/notifications', label: 'Notifications' },
];

export function AppLayout() {
  const { isAuthenticated, user } = useAuth();

  return (
    <AppShell
      brand={
        <Link to={isAuthenticated ? '/bharatbid' : '/login'} className="block rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-info">
          <span className="block text-sm font-semibold tracking-tight">BharatBid</span>
          <span className="mt-0.5 block text-[10px] font-normal leading-4 text-foreground-muted">
            Procurement Intelligence &amp; Evidence-Based Bid Evaluation
          </span>
        </Link>
      }
      topbarEnd={<AuthStatus />}
      sidebarFooter={
        <div className="space-y-1 px-1">
          {isAuthenticated && user ? (
            <p className="text-[11px] font-medium text-foreground">{roleLabel(user)}</p>
          ) : null}
          <p className="text-[10px] font-semibold uppercase tracking-wider text-warning">DEMO / SYNTHETIC</p>
          <p className="text-[10px] leading-4 text-foreground-muted">SIH demonstration. Adapters are not live government APIs.</p>
        </div>
      }
      navigation={
        isAuthenticated ? (
          <>
            <p className="px-3 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">
              Procurement
            </p>
            {PROCUREMENT_NAV.map((item) => (
              <SidebarNavLink key={item.to} to={item.to} end={item.end}>
                {item.label}
              </SidebarNavLink>
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
