import type { FeatureMap } from '../features/registry';

export interface AppConfig {
  nodeEnv: 'development' | 'test' | 'production';
  isProduction: boolean;
  isTest: boolean;
  host: string;
  port: number;
  logLevel: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'silent';
  shutdownTimeoutMs: number;
  requestBodyLimit: string;
  app: {
    name: string;
    url: string;
    frontendUrl: string;
  };
  databaseUrl?: string;
  databasePoolMax: number;
  databasePoolTimeoutSeconds: number;
  redisUrl?: string;
  jobs: {
    maxAttempts: number;
    backoffMs: number;
    timeoutMs: number;
    process: boolean;
  };
  jwt: {
    accessSecret?: string;
    refreshSecret?: string;
    accessExpiresIn: string;
    refreshExpiresIn: string;
    issuer: string;
    audience: string;
  };
  auth: {
    password: {
      minLength: number;
      maxLength: number;
      requireUppercase: boolean;
      requireLowercase: boolean;
      requireNumber: boolean;
      requireSpecial: boolean;
      bcryptCost: number;
    };
    defaultRole: string;
    loginRateLimitMax: number;
    loginIpRateLimitMax: number;
    loginRateLimitWindowMs: number;
  };
  ai: {
    enabled: boolean;
    provider: 'gemini' | 'mock';
    model?: string;
    geminiApiKey?: string;
    timeoutMs: number;
    maxOutputTokens: number;
    temperature: number;
    maxRetries: number;
    retryBaseMs: number;
  };
  email: {
    enabled: boolean;
    provider: 'smtp' | 'resend' | 'brevo' | 'mock';
    from?: string;
    timeoutMs: number;
    smtp: {
      host?: string;
      port: number;
      user?: string;
      password?: string;
      from?: string;
    };
    resend: {
      apiKey?: string;
    };
    brevo: {
      apiKey?: string;
    };
  };
  sms: {
    enabled: boolean;
    provider: 'mock' | 'http';
    apiKey?: string;
    from?: string;
    httpUrl?: string;
    timeoutMs: number;
  };
  storage: {
    provider: 'local' | 's3' | 'postgres';
    localDir: string;
    maxBytes: number;
    signedUrlExpiresSeconds: number;
    signingSecret?: string;
    aws: {
      region?: string;
      accessKeyId?: string;
      secretAccessKey?: string;
      bucket?: string;
    };
  };
  documents: {
    maxBytes: number;
    maxTextChars: number;
    confidenceThreshold: number;
    asyncThresholdBytes: number;
  };
  corsOrigins: string[];
  rateLimitEnabled: boolean;
  rateLimits: {
    failClosed: boolean;
    authentication: { max: number; windowMs: number };
    ai: { max: number; windowMs: number };
    fileUpload: { max: number; windowMs: number };
    publicApi: { max: number; windowMs: number };
    authenticatedApi: { max: number; windowMs: number };
    adminApi: { max: number; windowMs: number };
    passwordReset: { max: number; ipMax: number; windowMs: number };
  };
  demoMode: boolean;
  scheduler: {
    enabled: boolean;
    intervalMs: number;
    pollMs: number;
  };
    otp: {
      enabled: boolean;
      provider: 'auto' | 'mock';
      digits: number;
      ttlMs: number;
      maxAttempts: number;
      resendCooldownMs: number;
      destinationRateLimitMax: number;
      ipRateLimitMax: number;
      rateLimitWindowMs: number;
      hashSecret: string;
    };
    features: FeatureMap;
}
