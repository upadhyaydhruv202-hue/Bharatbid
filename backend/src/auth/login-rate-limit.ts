import type { Request, RequestHandler } from 'express';

import { createIdentityAndIpRateLimit, type RateLimitStore } from '../security';
import type { AppConfig } from '../types/config';
import type { AppLogger } from '../utils/logger';
import { clientIp } from '../security/client-ip';

export function createLoginRateLimit(options: {
  store: RateLimitStore;
  config: AppConfig;
  logger?: AppLogger;
}): RequestHandler {
  return createIdentityAndIpRateLimit({
    store: options.store,
    windowMs: options.config.auth.loginRateLimitWindowMs,
    ipMax: options.config.auth.loginIpRateLimitMax,
    identityMax: options.config.auth.loginRateLimitMax,
    ipPrefix: 'auth:login:ip',
    identityPrefix: 'auth:login:email',
    identityKeyFn: loginEmailKey,
    message: 'Too many login attempts. Try again later.',
    enabled: options.config.rateLimitEnabled,
    failClosed: options.config.rateLimits.failClosed,
    logger: options.logger,
  });
}

function loginEmailKey(req: Request): string {
  const email = req.body && typeof req.body === 'object' && 'email' in req.body ? req.body.email : undefined;
  if (typeof email === 'string' && email.trim() !== '') {
    return email.trim().toLowerCase();
  }

  return `ip:${clientIp(req)}`;
}
