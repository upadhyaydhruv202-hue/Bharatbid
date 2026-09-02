import { Router, type RequestHandler } from 'express';

import type { AuthController } from '../controllers/auth.controller';

export function createAuthRouter(options: {
  controller: AuthController;
  authenticate: RequestHandler;
  loginRateLimit: RequestHandler;
  otpRateLimit: RequestHandler;
  passwordResetRateLimit: RequestHandler;
  publicRateLimit: RequestHandler;
  authenticationRateLimit: RequestHandler;
}): Router {
  const router = Router();
  const publicAuth = [options.publicRateLimit, options.authenticationRateLimit];

  router.post('/register', ...publicAuth, options.controller.register);
  router.post('/login', options.loginRateLimit, options.controller.login);
  router.post('/refresh', ...publicAuth, options.controller.refresh);
  router.post('/logout', ...publicAuth, options.controller.logout);
  router.get('/me', options.authenticate, options.controller.me);
  router.post('/otp/request', options.otpRateLimit, options.controller.requestOtp);
  router.post('/otp/verify', options.otpRateLimit, options.controller.verifyOtp);
  router.post(
    '/password-reset/request',
    options.passwordResetRateLimit,
    options.controller.requestPasswordReset,
  );
  router.post(
    '/password-reset/confirm',
    options.passwordResetRateLimit,
    options.controller.confirmPasswordReset,
  );

  return router;
}
