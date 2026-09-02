import type { AppConfig } from '../types/config';
import { isDemoMode } from './evaluate';

export function parseOptionalBoolean(value: unknown): boolean | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (value === true || value === 'true' || value === '1') {
    return true;
  }

  if (value === false || value === 'false' || value === '0') {
    return false;
  }

  return undefined;
}

export function resolveDemoMode(input: { DEMO_MODE?: unknown; NODE_ENV?: string }): boolean {
  const parsed = parseOptionalBoolean(input.DEMO_MODE);
  if (parsed !== undefined) {
    return parsed;
  }

  return input.NODE_ENV !== 'production';
}

export function shouldMockExternalIntegrations(
  config: Pick<AppConfig, 'demoMode' | 'isTest'>,
): boolean {
  return isDemoMode(config) || config.isTest;
}

export function shouldSeedDemoData(config: Pick<AppConfig, 'demoMode'>): boolean {
  return isDemoMode(config);
}

export function shouldSeedDemoDataFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return resolveDemoMode({ DEMO_MODE: env.DEMO_MODE, NODE_ENV: env.NODE_ENV });
}
