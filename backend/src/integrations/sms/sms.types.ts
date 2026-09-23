export const SMS_SEND_JOB = 'sms.send';

export interface SendSmsInput {
  to: string;
  text: string;
  idempotencyKey?: string;
}

export interface SentSms {
  id: string;
  to: string;
  provider: 'mock' | 'http' | 'msg91';
}

export interface SmsProvider {
  readonly name: 'mock' | 'http' | 'msg91';
  send(input: SendSmsInput): Promise<SentSms>;
}
