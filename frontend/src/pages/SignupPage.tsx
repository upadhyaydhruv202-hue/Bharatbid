import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useAuth } from '../auth/AuthProvider';
import type { AuthPublicConfig } from '../types/api';
import { Button, Card, Input, PageContainer } from '../ui';
import { AuthShell } from '../ui/auth/AuthShell';
import { GoogleSignInButton } from '../ui/auth/GoogleSignInButton';

export function SignupPage() {
  const { loginWithOtp, loginWithGoogle, requestSignInOtp, loadPublicConfig, pending, error, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [channel, setChannel] = useState<'email' | 'sms'>('email');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'profile' | 'otp'>('profile');
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

  async function onStart(event: FormEvent) {
    event.preventDefault();
    if (!displayName.trim()) {
      setLocalError('Enter your full name.');
      return;
    }
    const dest =
      channel === 'email'
        ? email.trim().toLowerCase()
        : phone.trim().startsWith('+')
          ? phone.trim()
          : `+91${phone.replace(/\D/g, '')}`;
    if (channel === 'email' && !dest.includes('@')) {
      setLocalError('Enter an official email address.');
      return;
    }
    if (channel === 'sms' && dest.replace(/\D/g, '').length < 10) {
      setLocalError('Enter a valid +91 mobile number.');
      return;
    }
    setLocalError(undefined);
    try {
      await requestSignInOtp(dest, channel, 'signup');
      setDestination(dest);
      setStep('otp');
    } catch {
      // AuthProvider sets error
    }
  }

  async function onVerify(event: FormEvent) {
    event.preventDefault();
    const ok = await loginWithOtp({
      destination,
      code: code.trim(),
      channel,
      purpose: 'signup',
      displayName: displayName.trim(),
      organizationName: organizationName.trim() || undefined,
      phone: phone.trim() || undefined,
    });
    if (ok) {
      navigate('/bharatbid', { replace: true });
    }
  }

  return (
    <PageContainer breadcrumb={undefined} className="flex min-h-[calc(100vh-4rem)] items-center">
      <AuthShell>
        <Card className="bb-lift shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground-muted">Create account</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">Register your identity</h2>
          <p className="mt-2 text-sm leading-6 text-foreground-muted">
            Verification confirms who you are. Organization membership and role still determine what procurement data
            you can see.
          </p>

          {step === 'profile' ? (
            <form className="mt-6 space-y-4" onSubmit={onStart} noValidate>
              <Input label="Full name" name="name" required value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">Verify with</legend>
                <label className="mr-4 text-sm">
                  <input
                    className="mr-2"
                    type="radio"
                    name="channel"
                    checked={channel === 'email'}
                    onChange={() => setChannel('email')}
                  />
                  Official email OTP
                </label>
                <label className="text-sm">
                  <input
                    className="mr-2"
                    type="radio"
                    name="channel"
                    checked={channel === 'sms'}
                    onChange={() => setChannel('sms')}
                  />
                  Mobile number
                </label>
              </fieldset>
              {channel === 'email' ? (
                <Input
                  label="Official email"
                  type="email"
                  name="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              ) : (
                <Input
                  label="Mobile number"
                  name="phone"
                  required
                  hint="+91 XXXXX XXXXX"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                />
              )}
              {channel === 'email' ? (
                <Input
                  label="Mobile number"
                  name="phone-optional"
                  hint="Optional"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                />
              ) : null}
              <Input
                label="Organization"
                name="organization"
                hint="Creates your workspace. This does not grant officer privileges."
                value={organizationName}
                onChange={(event) => setOrganizationName(event.target.value)}
              />
              {localError || error ? (
                <p className="text-sm text-danger" role="alert">
                  {localError ?? error}
                </p>
              ) : null}
              <Button type="submit" loading={pending}>
                Send verification code
              </Button>
            </form>
          ) : (
            <form className="mt-6 space-y-4" onSubmit={onVerify} noValidate>
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
                Verify and create account
              </Button>
            </form>
          )}

          <div className="my-6 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground-muted">
            <span className="h-px flex-1 bg-edge" />
            OR
            <span className="h-px flex-1 bg-edge" />
          </div>
          <GoogleSignInButton
            clientId={config?.googleClientId ?? ''}
            onCredential={(credential) => void loginWithGoogle(credential, organizationName.trim() || undefined)}
            disabled={pending}
          />
          <p className="mt-6 text-sm text-foreground-muted">
            Already registered?{' '}
            <Link className="font-medium text-foreground underline" to="/login">
              Sign in
            </Link>
          </p>
        </Card>
      </AuthShell>
    </PageContainer>
  );
}
