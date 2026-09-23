import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { useAuth } from './AuthProvider';
import { Card, CardTitle } from '../ui';

export function SessionGate({
  children,
  title = 'Sign in required',
  hint,
}: {
  children: ReactNode;
  title?: string;
  hint?: string;
}) {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return (
      <Card className="max-w-md">
        <CardTitle className="mb-3">{title}</CardTitle>
        {hint ? <p className="mb-4 text-sm text-foreground-muted">{hint}</p> : null}
        <div className="flex flex-wrap gap-3">
          <Link
            className="inline-flex h-10 items-center rounded-md bg-accent px-3.5 text-sm font-medium text-accent-foreground"
            to="/login"
          >
            Sign in
          </Link>
          <Link
            className="inline-flex h-10 items-center rounded-md border border-edge px-3.5 text-sm font-medium"
            to="/signup"
          >
            Create account
          </Link>
        </div>
      </Card>
    );
  }

  return children;
}
