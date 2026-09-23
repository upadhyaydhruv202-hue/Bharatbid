import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useAuth } from '../auth/AuthProvider';
import type { AuthPublicConfig } from '../types/api';
import { Button, Input, PageContainer } from '../ui';
import { AuthShell } from '../ui/auth/AuthShell';
import { GoogleSignInButton } from '../ui/auth/GoogleSignInButton';
import { LoginForm } from '../ui/auth/LoginForm';

function normalizeEmail(value: string): string | null {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed || !trimmed.includes('@')) {
    return null;
  }
  return trimmed;
}

export function LoginPage() {
  const { login, loginWithOtp, loginWithGoogle, requestSignInOtp, loadPublicConfig, pending, error, isAuthenticated } =
    useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'identify' | 'otp' | 'password'>('identify');
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
    const normalized = normalizeEmail(email);
    if (!normalized) {
      setLocalError('Enter an official email address.');
      return;
    }
    setLocalError(undefined);
    try {
      await requestSignInOtp(normalized, 'email', 'login');
      setDestination(normalized);
      setStep('otp');
    } catch {
      // error is set by AuthProvider
    }
  }

  async function onVerify(event: FormEvent) {
    event.preventDefault();
    const ok = await loginWithOtp({ destination, code: code.trim(), channel: 'email', purpose: 'login' });
    if (ok) {
      navigate('/bharatbid', { replace: true });
    }
  }

  const alertMessage = localError ?? error;

  return (
    <PageContainer breadcrumb={undefined} width="full" className="flex min-h-[calc(100vh-4rem)] items-center !max-w-none">
      {isAuthenticated ? (
        <p className="text-sm text-foreground-muted">Opening Command Center…</p>
      ) : (
        <AuthShell>
          <div className="bb-auth-card">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="bb-auth-card__eyebrow">Secure access</p>
              {step === 'otp' ? (
                <span className="bb-auth-step">
                  <span className="bb-auth-step__dot" />
                  Code sent
                </span>
              ) : null}
              {step === 'password' ? (
                <span className="bb-auth-step">
                  <span className="bb-auth-step__dot" />
                  Password
                </span>
              ) : null}
            </div>
            <h2 className="bb-auth-card__title">
              {step === 'password' ? 'Sign in with password' : step === 'otp' ? 'Enter verification code' : 'Sign in'}
            </h2>
            <p className="bb-auth-card__subtitle">
              {step === 'otp'
                ? `A 6-digit code was sent to ${destination}. It expires in a few minutes.`
                : step === 'password'
                  ? 'Use your organization email and password if OTP is unavailable.'
                  : 'Continue with your official email for a one-time code, or use Google.'}
            </p>

            {step === 'identify' ? (
              <form className="mt-6 space-y-4" onSubmit={onContinue} noValidate>
                <Input
                  label="Official email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  hint="One-time code will be sent to this address"
                />
                {alertMessage ? (
                  <p className="bb-auth-alert bb-auth-alert--danger" role="alert">
                    {alertMessage}
                  </p>
                ) : null}
                <Button type="submit" className="w-full" size="lg" loading={pending}>
                  Send one-time code
                </Button>
              </form>
            ) : null}

            {step === 'otp' ? (
              <form className="mt-6 space-y-4" onSubmit={onVerify} noValidate>
                <Input
                  label="One-time code"
                  name="otp"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  hint="6 digits"
                />
                {error ? (
                  <p className="bb-auth-alert bb-auth-alert--danger" role="alert">
                    {error}
                  </p>
                ) : null}
                <Button type="submit" className="w-full" size="lg" loading={pending}>
                  Verify and continue
                </Button>
                <Button type="button" className="w-full" variant="ghost" onClick={() => setStep('identify')}>
                  Use a different email
                </Button>
              </form>
            ) : null}

            {step === 'password' ? (
              <div className="mt-6">
                <LoginForm
                  loading={pending}
                  error={error}
                  onSubmit={({ email, password }) => login(email, password)}
                />
                <Button className="mt-3 w-full" type="button" variant="ghost" onClick={() => setStep('identify')}>
                  Back to email code
                </Button>
              </div>
            ) : null}

            {step === 'identify' ? (
              <>
                <div className="bb-auth-divider">Or</div>
                <GoogleSignInButton
                  clientId={config?.googleClientId ?? ''}
                  onCredential={(credential) => void loginWithGoogle(credential)}
                  disabled={pending}
                />
                {config && !config.emailOtpConfigured && !config.demoAuth ? (
                  <p className="bb-auth-alert mt-3" role="status">
                    Email OTP is not configured on this environment.
                  </p>
                ) : null}
                <div className="bb-auth-footer">
                  Don&apos;t have an account? <Link to="/signup">Create account</Link>
                </div>
                <p className="bb-auth-meta">
                  Prefer password?{' '}
                  <button type="button" onClick={() => setStep('password')}>
                    Sign in with password
                  </button>
                </p>
              </>
            ) : null}
          </div>
        </AuthShell>
      )}
    </PageContainer>
  );
}
