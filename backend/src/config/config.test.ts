import { describe, expect, it } from 'vitest';

import { assertProductionSecrets, loadConfig, mapConfig, resetConfigCache } from './index';
import { envSchema } from './schema';

const productionSecrets = {
  JWT_ACCESS_SECRET: 'a'.repeat(32),
  JWT_REFRESH_SECRET: 'b'.repeat(32),
  DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/hackathon',
  REDIS_URL: 'redis://localhost:6379',
};

describe('loadConfig', () => {
  it('loads development defaults without secrets', () => {
    const config = loadConfig({
      NODE_ENV: 'development',
    });

    expect(config.nodeEnv).toBe('development');
    expect(config.port).toBe(5000);
    expect(config.isProduction).toBe(false);
    expect(config.databaseUrl).toBeUndefined();
    expect(config.databasePoolMax).toBe(10);
    expect(config.databasePoolTimeoutSeconds).toBe(10);
    expect(config.features.ai).toBe(false);
    expect(config.features.pdf).toBe(true);
    expect(config.demoMode).toBe(true);
    expect(config.app.name).toBe('BharatBid');
    expect(config.corsOrigins).toEqual(['http://localhost:5173']);
    expect(config.rateLimitEnabled).toBe(true);
    expect(config.rateLimits.failClosed).toBe(false);
    expect(config.rateLimits.publicApi.max).toBe(60);
    expect(config.rateLimits.authenticatedApi.max).toBe(120);
    expect(config.rateLimits.adminApi.max).toBe(30);
    expect(config.rateLimits.ai.max).toBe(20);
    expect(config.rateLimits.fileUpload.max).toBe(10);
    expect(config.rateLimits.authentication.max).toBe(20);
    expect(config.rateLimits.passwordReset.max).toBe(5);
    expect(config.jwt.issuer).toBe('bharatbid-ai');
    expect(config.jwt.audience).toBe('bharatbid-ai-api');
    expect(config.auth.password.minLength).toBe(8);
    expect(config.auth.password.bcryptCost).toBe(12);
    expect(config.auth.loginRateLimitMax).toBe(5);
    expect(config.auth.loginRateLimitWindowMs).toBe(15 * 60_000);
    expect(config.scheduler.enabled).toBe(false);
    expect(config.scheduler.intervalMs).toBe(60_000);
    expect(config.scheduler.pollMs).toBe(1000);
    expect(config.jobs.maxAttempts).toBe(3);
    expect(config.jobs.backoffMs).toBe(200);
    expect(config.jobs.timeoutMs).toBe(60_000);
    expect(config.jobs.process).toBe(true);
    expect(config.sms.provider).toBe('mock');
    expect(config.sms.enabled).toBe(false);
    expect(config.sms.timeoutMs).toBe(10_000);
    expect(config.email.provider).toBe('smtp');
    expect(config.email.timeoutMs).toBe(10_000);
    expect(config.otp.digits).toBe(6);
    expect(config.otp.ttlMs).toBe(10 * 60_000);
    expect(config.otp.maxAttempts).toBe(5);
    expect(config.otp.resendCooldownMs).toBe(60_000);
    expect(config.otp.provider).toBe('auto');
  });

  it('parses feature flags and nested integration settings', () => {
    const config = loadConfig({
      NODE_ENV: 'test',
      PORT: '8080',
      DATABASE_URL: 'postgresql://localhost:5432/app',
      REDIS_URL: 'redis://localhost:6379',
      FEATURE_AI: 'true',
      AI_ENABLED: 'true',
      AI_PROVIDER: 'gemini',
      DOCUMENT_CONFIDENCE_THRESHOLD: '0.8',
      DOCUMENT_MAX_BYTES: '2048',
      STORAGE_LOCAL_DIR: 'tmp-storage',
      CORS_ORIGINS: 'http://localhost:5173, http://localhost:3000',
      DEMO_MODE: 'false',
    });

    expect(config.port).toBe(8080);
    expect(config.databaseUrl).toBe('postgresql://localhost:5432/app');
    expect(config.redisUrl).toBe('redis://localhost:6379');
    expect(config.features.ai).toBe(true);
    expect(config.ai.enabled).toBe(true);
    expect(config.ai.provider).toBe('gemini');
    expect(config.demoMode).toBe(false);
    expect(config.corsOrigins).toEqual(['http://localhost:5173', 'http://localhost:3000']);
    expect(config.documents.confidenceThreshold).toBe(0.8);
    expect(config.documents.maxBytes).toBe(2048);
    expect(config.storage.localDir).toBe('tmp-storage');
  });

  it('enables AI from FEATURE_AI and parses timeout settings', () => {
    const config = loadConfig({
      NODE_ENV: 'test',
      FEATURE_AI: 'true',
      AI_PROVIDER: 'mock',
      AI_TIMEOUT_MS: '12000',
      AI_MAX_OUTPUT_TOKENS: '1024',
      AI_TEMPERATURE: '0.4',
      AI_MAX_RETRIES: '1',
      AI_RETRY_BASE_MS: '50',
    });

    expect(config.ai.enabled).toBe(true);
    expect(config.features.ai).toBe(true);
    expect(config.ai.provider).toBe('mock');
    expect(config.ai.timeoutMs).toBe(12000);
    expect(config.ai.maxOutputTokens).toBe(1024);
    expect(config.ai.temperature).toBe(0.4);
    expect(config.ai.maxRetries).toBe(1);
    expect(config.ai.retryBaseMs).toBe(50);
  });

  it('requires SMS HTTP secrets in production when SMS is enabled', () => {
    expect(() =>
      loadConfig({
        NODE_ENV: 'production',
        AI_ENABLED: 'false',
        FEATURE_AI: 'false',
        SMS_ENABLED: 'true',
        SMS_PROVIDER: 'http',
        ...productionSecrets,
      }),
    ).toThrow(/SMS_HTTP_URL/);
  });

  it('requires JWT secrets in development when DATABASE_URL is set', () => {
    expect(() =>
      loadConfig({
        NODE_ENV: 'development',
        DATABASE_URL: 'postgresql://localhost:5432/app',
      }),
    ).toThrow(/JWT_ACCESS_SECRET is required when DATABASE_URL is set/);
  });

  it('treats blank optional secrets as unset', () => {
    const config = loadConfig({
      NODE_ENV: 'development',
      JWT_ACCESS_SECRET: '',
      GEMINI_API_KEY: '   ',
      DATABASE_URL: '',
    });

    expect(config.jwt.accessSecret).toBeUndefined();
    expect(config.ai.geminiApiKey).toBeUndefined();
    expect(config.databaseUrl).toBeUndefined();
  });

  it('fails clearly when production secrets are missing', () => {
    expect(() =>
      loadConfig({
        NODE_ENV: 'production',
        FEATURE_AI: 'false',
        AI_ENABLED: 'false',
      }),
    ).toThrow(/Invalid production configuration/);

    expect(() =>
      loadConfig({
        NODE_ENV: 'production',
        FEATURE_AI: 'false',
        AI_ENABLED: 'false',
      }),
    ).toThrow(/JWT_ACCESS_SECRET/);
  });

  it('accepts valid production configuration', () => {
    const config = loadConfig({
      NODE_ENV: 'production',
      DEMO_MODE: 'false',
      AI_ENABLED: 'false',
      FEATURE_AI: 'false',
      ...productionSecrets,
    });

    expect(config.isProduction).toBe(true);
    expect(config.rateLimits.failClosed).toBe(true);
    expect(config.databaseUrl).toBe(productionSecrets.DATABASE_URL);
    expect(config.demoMode).toBe(false);
  });

  it('requires a production bcrypt cost of at least 10', () => {
    expect(() =>
      loadConfig({
        NODE_ENV: 'production',
        AI_ENABLED: 'false',
        FEATURE_AI: 'false',
        AUTH_BCRYPT_COST: '4',
        ...productionSecrets,
      }),
    ).toThrow(/AUTH_BCRYPT_COST/);
  });

  it('requires AI secrets in production when AI is enabled', () => {
    expect(() =>
      loadConfig({
        NODE_ENV: 'production',
        AI_ENABLED: 'true',
        FEATURE_AI: 'true',
        AI_PROVIDER: 'gemini',
        ...productionSecrets,
      }),
    ).toThrow(/GEMINI_API_KEY/);
  });

  it('requires REDIS_URL in production', () => {
    expect(() =>
      loadConfig({
        NODE_ENV: 'production',
        AI_ENABLED: 'false',
        FEATURE_AI: 'false',
        JWT_ACCESS_SECRET: 'a'.repeat(32),
        JWT_REFRESH_SECRET: 'b'.repeat(32),
        DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/hackathon',
      }),
    ).toThrow(/REDIS_URL/);
  });

  it('rejects DEMO_MODE in production unless ALLOW_DEMO_IN_PRODUCTION is set', () => {
    expect(() =>
      loadConfig({
        NODE_ENV: 'production',
        DEMO_MODE: 'true',
        AI_ENABLED: 'false',
        FEATURE_AI: 'false',
        ...productionSecrets,
      }),
    ).toThrow(/ALLOW_DEMO_IN_PRODUCTION/);
  });

  it('allows the mock AI provider in production only with DEMO_MODE', () => {
    expect(() =>
      loadConfig({
        NODE_ENV: 'production',
        AI_ENABLED: 'true',
        AI_PROVIDER: 'mock',
        ...productionSecrets,
      }),
    ).toThrow(/DEMO_MODE/);

    const config = loadConfig({
      NODE_ENV: 'production',
      AI_ENABLED: 'true',
      AI_PROVIDER: 'mock',
      DEMO_MODE: 'true',
      ALLOW_DEMO_IN_PRODUCTION: 'true',
      ...productionSecrets,
    });

    expect(config.ai.enabled).toBe(true);
    expect(config.ai.provider).toBe('mock');
    expect(config.demoMode).toBe(true);
  });

  it('rejects wildcard CORS origins', () => {
    expect(() =>
      loadConfig({
        NODE_ENV: 'development',
        CORS_ORIGINS: '*',
      }),
    ).toThrow(/CORS_ORIGINS/);
  });

  it('requires Resend secrets in production when that email provider is enabled', () => {
    expect(() =>
      loadConfig({
        NODE_ENV: 'production',
        AI_ENABLED: 'false',
        FEATURE_AI: 'false',
        EMAIL_ENABLED: 'true',
        EMAIL_PROVIDER: 'resend',
        ...productionSecrets,
      }),
    ).toThrow(/RESEND_API_KEY/);
  });

  it('rejects EMAIL_PROVIDER=mock in production without DEMO_MODE', () => {
    expect(() =>
      loadConfig({
        NODE_ENV: 'production',
        AI_ENABLED: 'false',
        FEATURE_AI: 'false',
        EMAIL_ENABLED: 'true',
        EMAIL_PROVIDER: 'mock',
        EMAIL_FROM: 'noreply@example.com',
        ...productionSecrets,
      }),
    ).toThrow(/DEMO_MODE/);
  });

  it('rejects OTP_PROVIDER=mock in production without DEMO_MODE', () => {
    expect(() =>
      loadConfig({
        NODE_ENV: 'production',
        AI_ENABLED: 'false',
        FEATURE_AI: 'false',
        FEATURE_OTP: 'true',
        OTP_PROVIDER: 'mock',
        ...productionSecrets,
      }),
    ).toThrow(/DEMO_MODE/);
  });

  it('enables the scheduler only when SCHEDULER_ENABLED is true', () => {
    const disabled = loadConfig({
      NODE_ENV: 'test',
    });
    expect(disabled.scheduler.enabled).toBe(false);

    const forced = loadConfig({
      NODE_ENV: 'test',
      SCHEDULER_ENABLED: 'true',
      SCHEDULER_INTERVAL: '5m',
      SCHEDULER_POLL: '2s',
    });
    expect(forced.scheduler.enabled).toBe(true);
    expect(forced.scheduler.intervalMs).toBe(5 * 60_000);
    expect(forced.scheduler.pollMs).toBe(2000);
  });

  it('resetConfigCache clears the singleton', () => {
    resetConfigCache();
    expect(typeof resetConfigCache).toBe('function');
  });
});

describe('envSchema', () => {
  it('rejects an invalid port', () => {
    const result = envSchema.safeParse({ PORT: 'not-a-number' });
    expect(result.success).toBe(false);
  });
});

describe('assertProductionSecrets', () => {
  it('does nothing outside production', () => {
    const env = envSchema.parse({ NODE_ENV: 'development' });
    expect(() => assertProductionSecrets(env)).not.toThrow();
  });
});

describe('mapConfig', () => {
  it('maps parsed env into a nested config object', () => {
    const env = envSchema.parse({
      NODE_ENV: 'test',
      APP_NAME: 'Kit',
    });
    const config = mapConfig(env);
    expect(config.app.name).toBe('Kit');
    expect(config.storage.provider).toBe('local');
    expect(config.storage.localDir).toBe('storage');
    expect(config.storage.maxBytes).toBe(10 * 1024 * 1024);
    expect(config.storage.signedUrlExpiresSeconds).toBe(300);
    expect(config.documents.confidenceThreshold).toBe(0.7);
    expect(config.documents.maxBytes).toBe(10 * 1024 * 1024);
  });
});
