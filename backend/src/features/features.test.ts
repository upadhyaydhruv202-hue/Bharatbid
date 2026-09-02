import { describe, expect, it } from 'vitest';

import { loadConfig } from '../config';
import { ERROR_CODES } from '../constants';
import { FeatureDisabledError } from '../errors';
import {
  FEATURE_REGISTRY,
  getPublicFeatureState,
  isDemoMode,
  isFeatureEnabled,
  listFeatureRegistry,
  requireFeature,
  resolveDemoMode,
  shouldMockExternalIntegrations,
  shouldSeedDemoDataFromEnv,
} from './index';
import { requireFeature as requireFeatureMiddleware } from './middleware';

const productionSecrets = {
  JWT_ACCESS_SECRET: 'a'.repeat(32),
  JWT_REFRESH_SECRET: 'b'.repeat(32),
  DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/hackathon',
  REDIS_URL: 'redis://localhost:6379',
};

describe('isFeatureEnabled', () => {
  it('returns true for an enabled flag', () => {
    const config = loadConfig({ NODE_ENV: 'test', FEATURE_AI: 'true', AI_PROVIDER: 'mock' });
    expect(isFeatureEnabled(config, 'ai')).toBe(true);
  });

  it('returns false for a disabled flag', () => {
    const config = loadConfig({ NODE_ENV: 'test', FEATURE_SMS: 'false' });
    expect(isFeatureEnabled(config, 'sms')).toBe(false);
  });

  it('returns false when a flag is missing', () => {
    const config = loadConfig({ NODE_ENV: 'test' });
    expect(isFeatureEnabled(config, 'sms')).toBe(false);
    expect(isFeatureEnabled(config, 'otp')).toBe(false);
    expect(isFeatureEnabled(config, 's3')).toBe(false);
    expect(isFeatureEnabled(config, 'pdf')).toBe(true);
  });

  it('can disable PDF HTTP when FEATURE_PDF is false', () => {
    const config = loadConfig({ NODE_ENV: 'test', FEATURE_PDF: 'false' });
    expect(isFeatureEnabled(config, 'pdf')).toBe(false);
  });

  it('returns false for an unknown flag name', () => {
    const config = loadConfig({ NODE_ENV: 'test', FEATURE_AI: 'true', AI_PROVIDER: 'mock' });
    expect(isFeatureEnabled(config, 'not-a-real-flag')).toBe(false);
  });

  it('treats legacy AI_ENABLED as FEATURE_AI', () => {
    const config = loadConfig({ NODE_ENV: 'test', AI_ENABLED: 'true', AI_PROVIDER: 'mock' });
    expect(isFeatureEnabled(config, 'ai')).toBe(true);
    expect(config.features.ai).toBe(true);
  });
});

describe('isDemoMode', () => {
  it('is true when DEMO_MODE is set', () => {
    const config = loadConfig({ NODE_ENV: 'test', DEMO_MODE: 'true' });
    expect(isDemoMode(config)).toBe(true);
    expect(shouldMockExternalIntegrations(config)).toBe(true);
  });

  it('defaults to true outside production when DEMO_MODE is missing', () => {
    expect(resolveDemoMode({ NODE_ENV: 'development' })).toBe(true);
    expect(resolveDemoMode({ NODE_ENV: 'test' })).toBe(true);
    expect(isDemoMode(loadConfig({ NODE_ENV: 'test' }))).toBe(true);
  });

  it('is false in production unless DEMO_MODE is explicitly true', () => {
    const config = loadConfig({
      NODE_ENV: 'production',
      DEMO_MODE: 'false',
      FEATURE_AI: 'false',
      ...productionSecrets,
    });
    expect(isDemoMode(config)).toBe(false);
    expect(shouldMockExternalIntegrations(config)).toBe(false);
    expect(resolveDemoMode({ NODE_ENV: 'production' })).toBe(false);
  });
});

describe('requireFeature', () => {
  it('throws FEATURE_DISABLED when the flag is off', () => {
    const config = loadConfig({ NODE_ENV: 'test', FEATURE_SMS: 'false' });
    expect(() => requireFeature(config, 'sms')).toThrow(FeatureDisabledError);
    try {
      requireFeature(config, 'sms');
    } catch (error) {
      expect(error).toMatchObject({
        code: ERROR_CODES.FEATURE_DISABLED,
        statusCode: 404,
        details: { feature: 'sms' },
      });
    }
  });

  it('does not throw when the flag is on', () => {
    const config = loadConfig({ NODE_ENV: 'test', FEATURE_NOTIFICATIONS: 'true' });
    expect(() => requireFeature(config, 'notifications')).not.toThrow();
  });
});

describe('demo seed and public snapshot', () => {
  it('seeds demo data only when demo mode is on', () => {
    expect(shouldSeedDemoDataFromEnv({ NODE_ENV: 'development', DEMO_MODE: 'true' })).toBe(true);
    expect(shouldSeedDemoDataFromEnv({ NODE_ENV: 'production', DEMO_MODE: 'false' })).toBe(false);
    expect(shouldSeedDemoDataFromEnv({ NODE_ENV: 'production' })).toBe(false);
  });

  it('returns a public snapshot without secrets', () => {
    const config = loadConfig({
      NODE_ENV: 'test',
      DEMO_MODE: 'true',
      FEATURE_AI: 'true',
      FEATURE_SMS: 'false',
      AI_PROVIDER: 'mock',
      GEMINI_API_KEY: 'secret-key',
    });
    const snapshot = getPublicFeatureState(config);
    expect(snapshot.demoMode).toBe(true);
    expect(snapshot.features.ai).toBe(true);
    expect(snapshot.features.sms).toBe(false);
    expect(JSON.stringify(snapshot)).not.toContain('secret-key');
  });
});

describe('feature registry', () => {
  it('lists every flag with default, dependencies, and purpose', () => {
    const listed = listFeatureRegistry();
    expect(listed.length).toBe(6);
    for (const entry of listed) {
      expect(entry.envVar.startsWith('FEATURE_')).toBe(true);
      expect(typeof entry.default).toBe('boolean');
      expect(Array.isArray(entry.dependencies)).toBe(true);
      expect(entry.purpose.length).toBeGreaterThan(8);
      expect(FEATURE_REGISTRY[entry.name].envVar).toBe(entry.envVar);
    }
  });
});

describe('requireFeature middleware', () => {
  it('calls next with FeatureDisabledError when the flag is off', () => {
    const config = loadConfig({ NODE_ENV: 'test', FEATURE_SMS: 'false' });
    const handler = requireFeatureMiddleware(config, 'sms');
    let passed: unknown;
    handler({} as never, {} as never, (error?: unknown) => {
      passed = error;
    });
    expect(passed).toBeInstanceOf(FeatureDisabledError);
  });

  it('calls next without an error when the flag is on', () => {
    const config = loadConfig({ NODE_ENV: 'test', FEATURE_SMS: 'true' });
    const handler = requireFeatureMiddleware(config, 'sms');
    let passed: unknown = 'unset';
    handler({} as never, {} as never, (error?: unknown) => {
      passed = error;
    });
    expect(passed).toBeUndefined();
  });
});
