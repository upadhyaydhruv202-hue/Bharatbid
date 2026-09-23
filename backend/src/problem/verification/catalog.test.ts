import { describe, expect, it } from 'vitest';

import { loadConfig } from '../../config';
import { buildVerificationRegistry, listProviderCatalog } from './catalog';

describe('listProviderCatalog', () => {
  it('never reports LIVE from configuration alone', () => {
    const config = loadConfig({
      NODE_ENV: 'test',
      DEMO_MODE: 'false',
      GST_API_BASE_URL: 'https://dg.setu.co',
      GST_CLIENT_ID: 'client',
      GST_CLIENT_SECRET: 'secret',
      GST_API_MODE: 'live',
    });
    const catalog = listProviderCatalog(config, buildVerificationRegistry(config));
    expect(catalog.some((item) => item.status === 'LIVE')).toBe(false);
    expect(catalog.find((item) => item.source === 'gst')?.status).toBe('READY_FOR_CREDENTIALS');
  });

  it('labels sandbox credentials as SANDBOX, not LIVE', () => {
    const config = loadConfig({
      NODE_ENV: 'test',
      DEMO_MODE: 'false',
      GST_API_BASE_URL: 'https://dg-sandbox.setu.co',
      GST_CLIENT_ID: 'client',
      GST_CLIENT_SECRET: 'secret',
      GST_API_MODE: 'sandbox',
    });
    const gst = listProviderCatalog(config, buildVerificationRegistry(config)).find((item) => item.source === 'gst');
    expect(gst?.status).toBe('SANDBOX');
    expect(gst?.realTime).toBe(false);
  });
});
