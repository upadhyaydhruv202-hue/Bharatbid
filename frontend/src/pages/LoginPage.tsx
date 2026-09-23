import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useAuth } from '../auth/AuthProvider';
import type { AuthPublicConfig } from '../types/api';
import { Button, Card, CardTitle, Input, PageContainer } from '../ui';
import { AuthShell } from '../ui/auth/AuthShell';
import { GoogleSignInButton } from '../ui/auth/GoogleSignInButton';
import { LoginForm } from '../ui/auth/LoginForm';

function classifyIdentifier(value: string): { channel: 'email' | 'sms'; destination: string } | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  if (trimmed.includes('@')) {
    return { channel: 'email', destination: trimmed.toLowerCase() };
  }
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 10) {
    return { channel: 'sms', destination: `+91${digits}` };
  }
  if (digits.length >= 11 && digits.length <= 15) {
    return { channel: 'sms', destination: `+${digits}` };
  }
  return null;
}

export function LoginPage() {
  const { login, loginWithOtp, loginWithGoogle, requestSignInOtp, loadPublicConfig, pending, error, isAuthenticated } =
    useAuth();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'identify' | 'otp' | 'password'>('identify');
  const [channel, setChannel] = useState<'email' | 'sms'>('email');
  const [destination, setDestination] = useState('');
  const [localError, setLocalError] = useState<string>();
  const [config, setConfig] = useState<AuthPublicConfig | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/bharatbid', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    void loadPublicConfig().then(setConfig);
  }, [loadPublicConfig]);

  async function onContinue(event: FormEvent) {
    event.preventDefault();
    const classified = classifyIdentifier(identifier);
    if (!classified) {
      setLocalError('Enter an official email address or a +91 mobile number.');
      return;
    }
    setLocalError(undefined);
    try {
      await requestSignInOtp(classified.destination, classified.channel, 'login');
      setChannel(classified.channel);
      setDestination(classified.destination);
      setStep('otp');
    } catch {
      // error is set by AuthProvider
    }
  }

  async function onVerify(event: FormEvent) {
    event.preventDefault();
    const ok = await loginWithOtp({ destination, code: code.trim(), channel, purpose: 'login' });
    if (ok) {
      navigate('/bharatbid', { replace: true });
    }
  }

  return (
    <PageContainer breadcrumb={undefined} className="flex min-h-[calc(100vh-4rem)] items-center">
      {isAuthenticated ? (
        <p className="text-sm text-foreground-muted">Opening Command Center…</p>
      ) : (
        <AuthShell>
          <Card className="bb-lift shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground-muted">BharatBid AI</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">Sign in to your organization</h2>
            <p className="mt-2 text-sm leading-6 text-foreground-muted">
              Use your official email or registered mobile number. Access to procurement data depends on organization
              membership and assigned role.
            </p>

            {step === 'identify' ? (
              <form className="mt-6 space-y-4" onSubmit={onContinue} noValidate>
                <Input
                  label="Email address or mobile number"
                  name="identifier"
                  autoComplete="username"
                  required
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                  hint="Official email or +91 mobile"
                />
                {localError || error ? (
                  <p className="text-sm text-danger" role="alert">
                    {localError ?? error}
                  </p>
                ) : null}
                <Button type="submit" loading={pending}>
                  Continue
                </Button>
              </form>
            ) : null}

            {step === 'otp' ? (
              <form className="mt-6 space-y-4" onSubmit={onVerify} noValidate>
                <p className="text-sm text-foreground-muted">
                  Enter the 6-digit code sent to your {channel === 'sms' ? 'mobile number' : 'email'}.
                </p>
                <Input
                  label="One-time code"
                  name="otp"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                />
                {error ? (
                  <p className="text-sm text-danger" role="alert">
                    {error}
                  </p>
                ) : null}
                <Button type="submit" loading={pending}>
                  Verify and continue
                </Button>
                <Button type="button" variant="ghost" onClick={() => setStep('identify')}>
                  Use a different identifier
                </Button>
              </form>
            ) : null}

            {step === 'password' ? (
              <div className="mt-6">
                <CardTitle className="mb-3">Password sign-in</CardTitle>
                <LoginForm
                  loading={pending}
                  error={error}
                  onSubmit={({ email, password }) => login(email, password)}
                />
                <Button className="mt-3" type="button" variant="ghost" onClick={() => setStep('identify')}>
                  Back to one-time code
                </Button>
              </div>
            ) : null}

            {step === 'identify' ? (
              <>
                <div className="my-6 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground-muted">
                  <span className="h-px flex-1 bg-edge" />
                  OR
                  <span className="h-px flex-1 bg-edge" />
                </div>
                <GoogleSignInButton
                  clientId={config?.googleClientId ?? ''}
                  onCredential={(credential) => void loginWithGoogle(credential)}
                  disabled={pending}
                />
                {config && !config.emailOtpConfigured && !config.demoAuth ? (
                  <p className="mt-3 text-sm text-foreground-muted" role="status">
                    CONFIGURATION REQUIRED — email OTP delivery is not configured.
                  </p>
                ) : null}
                {config && !config.mobileOtpConfigured && !config.demoAuth ? (
                  <p className="mt-3 text-sm text-foreground-muted" role="status">
                    CONFIGURATION REQUIRED — mobile OTP delivery is not configured.
                  </p>
                ) : null}
                <p className="mt-6 text-sm text-foreground-muted">
                  Don&apos;t have an account?{' '}
                  <Link className="font-medium text-foreground underline" to="/signup">
                    Create account
                  </Link>
                </p>
                <button
                  type="button"
                  className="mt-4 text-xs text-foreground-muted underline"
                  onClick={() => setStep('password')}
                >
                  Sign in with password
                </button>
              </>
            ) : null}
          </Card>
        </AuthShell>
      )}
    </PageContainer>
  );
}
