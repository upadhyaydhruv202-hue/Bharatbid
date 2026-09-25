export type OtpChannel = 'email' | 'sms';

/** 10-digit Indian mobile → +91…; anything already starting with + is kept as E.164. */
export function normalizeMobile(value: string): string | null {
  const compact = value.replace(/[\s()-]/g, '');
  if (/^\+[1-9]\d{7,14}$/.test(compact)) return compact;
  if (/^[6-9]\d{9}$/.test(compact)) return `+91${compact}`;
  if (/^0[6-9]\d{9}$/.test(compact)) return `+91${compact.slice(1)}`;
  return null;
}

export function OtpChannelToggle({
  value,
  onChange,
  disabled,
}: {
  value: OtpChannel;
  onChange: (channel: OtpChannel) => void;
  disabled?: boolean;
}) {
  return (
    <div className="bb-auth-channel" role="tablist" aria-label="Verification method">
      {(
        [
          ['email', 'Email'],
          ['sms', 'Mobile'],
        ] as const
      ).map(([channel, label]) => (
        <button
          key={channel}
          type="button"
          role="tab"
          aria-selected={value === channel}
          className={value === channel ? 'bb-auth-channel__tab is-active' : 'bb-auth-channel__tab'}
          onClick={() => onChange(channel)}
          disabled={disabled}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
