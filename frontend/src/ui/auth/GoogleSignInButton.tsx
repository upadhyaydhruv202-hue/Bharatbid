import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }) => void;
          renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
  }
}

export function GoogleSignInButton({
  clientId,
  onCredential,
  disabled,
}: {
  clientId: string;
  onCredential: (credential: string) => void;
  disabled?: boolean;
}) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!clientId || disabled) {
      return;
    }
    const scriptId = 'google-identity-services';
    const existing = document.getElementById(scriptId) as HTMLScriptElement | null;

    function render() {
      if (!hostRef.current || !window.google?.accounts.id) {
        return;
      }
      hostRef.current.innerHTML = '';
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => {
          if (response.credential) {
            onCredential(response.credential);
          }
        },
      });
      window.google.accounts.id.renderButton(hostRef.current, {
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        width: 320,
        locale: 'en',
      });
    }

    if (window.google?.accounts.id) {
      render();
      return;
    }

    const script = existing ?? document.createElement('script');
    script.id = scriptId;
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = render;
    if (!existing) {
      document.head.appendChild(script);
    }
  }, [clientId, disabled, onCredential]);

  if (!clientId) {
    return (
      <p className="rounded-md border border-edge bg-surface-muted px-3 py-2 text-sm text-foreground-muted" role="status">
        CONFIGURATION REQUIRED — Google sign-in is not configured.
      </p>
    );
  }

  return <div ref={hostRef} className="flex justify-center" />;
}
