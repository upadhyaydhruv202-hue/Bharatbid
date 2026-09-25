import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useAuth } from '../auth/AuthProvider';
import type { AuthPublicConfig } from '../types/api';
import { Button, Input, PageContainer } from '../ui';
import { AuthShell } from '../ui/auth/AuthShell';
import { GoogleSignInButton } from '../ui/auth/GoogleSignInButton';
import { normalizeMobile, OtpChannelToggle, type OtpChannel } from '../ui/auth/OtpChannelToggle';

export function SignupPage() {
  const { loginWithOtp, loginWithGoogle, requestSignInOtp, loadPublicConfig, pending, error, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [channel, setChannel] = useState<OtpChannel>('email');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [organizationName, setOrganizationName] = useState('');
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

  const channelConfigured = config
    ? channel === 'email'
      ? config.emailOtpConfigured
      : config.mobileOtpConfigured
    : true;

  async function onStart(event: FormEvent) {
    event.preventDefault();
    if (!displayName.trim()) {
      setLocalError('Enter your full name.');
      return;
    }
    let dest: string | null;
    if (channel === 'email') {
      const trimmed = email.trim().toLowerCase();
      dest = trimmed.includes('@') ? trimmed : null;
    } else {
      dest = normalizeMobile(mobile);
    }
    if (!dest) {
      setLocalError(
        channel === 'email'
          ? 'Enter an official email address.'
          : 'Enter a 10-digit mobile number or a number in +country format.',
      );
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
    });
    if (ok) {
      navigate('/bharatbid', { replace: true });
    }
  }

  function selectChannel(next: OtpChannel) {
    setChannel(next);
    setLocalError(undefined);
  }

  const alertMessage = localError ?? error;

  return (
    <PageContainer breadcrumb={undefined} width="full" className="flex min-h-[calc(100vh-4rem)] items-center !max-w-none">
      <AuthShell>
        <div className="bb-auth-card">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="bb-auth-card__eyebrow">New account</p>
            {step === 'otp' ? (
              <span className="bb-auth-step">
                <span className="bb-auth-step__dot" />
                {channel === 'email' ? 'Verify email' : 'Verify mobile'}
              </span>
            ) : null}
          </div>
          <h2 className="bb-auth-card__title">
            {step === 'otp' ? (channel === 'email' ? 'Confirm your email' : 'Confirm your mobile') : 'Create your account'}
          </h2>
          <p className="bb-auth-card__subtitle">
            {step === 'otp'
              ? `Enter the 6-digit code sent to ${destination}.`
              : 'Verify with an email or mobile one-time code, or Google. Role and organization membership still control access.'}
          </p>

          {step === 'profile' ? (
            <>
              <OtpChannelToggle value={channel} onChange={selectChannel} disabled={pending} />
              <form className="mt-4 space-y-4" onSubmit={onStart} noValidate>
                <Input
                  label="Full name"
                  name="name"
                  required
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                />
                {channel === 'email' ? (
                  <Input
                    label="Official email"
                    type="email"
                    name="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    hint="One-time code will be sent to this address"
                  />
                ) : (
                  <Input
                    label="Mobile number"
                    type="tel"
                    name="mobile"
                    inputMode="tel"
                    autoComplete="tel"
                    required
                    value={mobile}
                    onChange={(event) => setMobile(event.target.value)}
                    hint="10-digit Indian mobile, or +country code. Code is sent by SMS."
                  />
                )}
                <Input
                  label="Organization"
                  name="organization"
                  hint="Creates your workspace. Does not grant officer privileges."
                  value={organizationName}
                  onChange={(event) => setOrganizationName(event.target.value)}
                />
                {alertMessage ? (
                  <p className="bb-auth-alert bb-auth-alert--danger" role="alert">
                    {alertMessage}
                  </p>
                ) : null}
                {!channelConfigured ? (
                  <p className="bb-auth-alert" role="status">
                    {channel === 'email' ? 'Email OTP' : 'Mobile OTP'} is not configured on this environment.
                  </p>
                ) : null}
                <Button type="submit" className="w-full" size="lg" loading={pending} disabled={!channelConfigured}>
                  Send verification code
                </Button>
              </form>
            </>
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
                hint="6 digits"
              />
              {error ? (
                <p className="bb-auth-alert bb-auth-alert--danger" role="alert">
                  {error}
                </p>
              ) : null}
              <Button type="submit" className="w-full" size="lg" loading={pending}>
                Verify and create account
              </Button>
              <Button type="button" className="w-full" variant="ghost" onClick={() => setStep('profile')}>
                Edit registration details
              </Button>
            </form>
          )}

          {step === 'profile' ? (
            <>
              <div className="bb-auth-divider">Or</div>
              <GoogleSignInButton
                clientId={config?.googleClientId ?? ''}
                onCredential={(credential) => void loginWithGoogle(credential, organizationName.trim() || undefined)}
                disabled={pending}
              />
              <div className="bb-auth-footer">
                Already registered? <Link to="/login">Sign in</Link>
              </div>
            </>
          ) : null}
        </div>
      </AuthShell>
    </PageContainer>
  );
}
