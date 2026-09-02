import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../auth/AuthProvider';
import { Alert, Card, CardTitle, PageContainer } from '../ui';
import { LoginForm } from '../ui/auth/LoginForm';

export function LoginPage() {
  const { login, pending, error, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/bharatbid', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  return (
    <PageContainer breadcrumb={undefined} className="flex min-h-[calc(100vh-4rem)] items-center">
      {isAuthenticated ? (
        <p className="text-sm text-foreground-muted">Opening Command Center…</p>
      ) : (
        <div className="mx-auto w-full max-w-lg space-y-4">
          <Card>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-warning">
              DEMO / SYNTHETIC · SIH 26100
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">BharatBid</h1>
            <p className="mt-1 text-sm font-medium text-foreground">
              Procurement Intelligence &amp; Evidence-Based Bid Evaluation
            </p>
            <p className="mt-3 text-sm leading-6 text-foreground-muted">
              Organize tender evidence, run labeled DEMO SOURCE checks, cross-verify identifiers, and support officer
              review. Officers remain responsible for every decision. This prototype does not award, reject, or rank
              bidders.
            </p>
            <div className="mt-6">
              <CardTitle className="mb-3">Sign in</CardTitle>
              <LoginForm
                loading={pending}
                error={error}
                hint="Use a seeded SIH demonstration account. These are not production credentials."
                onSubmit={({ email, password }) => login(email, password)}
              />
            </div>
          </Card>
          <Alert variant="info" title="Demonstration accounts">
            <ul className="mt-1 space-y-1 text-sm">
              <li>
                Officer — <code className="text-xs">demo.officer@example.com</code> /{' '}
                <code className="text-xs">demo-password</code>
              </li>
              <li>
                Reviewer (read-only) — <code className="text-xs">demo.reviewer@example.com</code> /{' '}
                <code className="text-xs">demo-password</code>
              </li>
            </ul>
          </Alert>
        </div>
      )}
    </PageContainer>
  );
}
