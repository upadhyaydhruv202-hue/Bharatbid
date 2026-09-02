import { useState, type FormEvent } from 'react';

import { Button } from '../primitives/Button';
import { Input } from '../primitives/Input';

export interface LoginFormValues {
  email: string;
  password: string;
}

export function LoginForm({
  onSubmit,
  loading = false,
  error,
  submitLabel = 'Sign in',
  hint,
}: {
  onSubmit: (values: LoginFormValues) => unknown | Promise<unknown>;
  loading?: boolean;
  error?: string;
  submitLabel?: string;
  hint?: string;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string>();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextEmail = email.trim();
    if (!nextEmail || !password) {
      setLocalError('Email and password are required.');
      return;
    }
    setLocalError(undefined);
    await onSubmit({ email: nextEmail, password });
  }

  const message = localError ?? error;

  return (
    <form className="space-y-4" onSubmit={handleSubmit} noValidate>
      {hint ? <p className="text-sm text-foreground-muted">{hint}</p> : null}
      <Input
        label="Email"
        type="email"
        name="email"
        autoComplete="username"
        required
        hint="Required"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
      <Input
        label="Password"
        type="password"
        name="password"
        autoComplete="current-password"
        required
        hint="Required"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />
      {message ? (
        <p className="text-sm text-danger" role="alert">
          {message}
        </p>
      ) : null}
      <Button type="submit" loading={loading}>
        {submitLabel}
      </Button>
    </form>
  );
}
