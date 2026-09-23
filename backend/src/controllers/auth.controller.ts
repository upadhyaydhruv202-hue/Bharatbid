import type { Request, Response } from 'express';

import { getAuthenticatedUser, tryExtractBearerToken } from '../auth/authenticate';
import type { GoogleAuthService } from '../auth/google.service';
import { AUDIT_ACTIONS } from '../constants';
import { AuthenticationError, DatabaseError, ExternalServiceError } from '../errors';
import {
  googleCredentialBodySchema,
  loginBodySchema,
  passwordResetConfirmBodySchema,
  passwordResetRequestBodySchema,
  refreshBodySchema,
  registerBodySchema,
} from '../schemas/auth';
import { otpRequestBodySchema, otpVerifyBodySchema, type OtpService } from '../otp';
import { parseBody } from '../schemas/parse';
import type { AuthService } from '../services/auth.service';
import type { AuditService } from '../audit/audit.service';
import type { AppConfig } from '../types/config';
import { asyncHandler } from '../utils/async-handler';
import { sendSuccess } from '../utils/response';

export class AuthController {
  constructor(
    private readonly authService: AuthService | null,
    private readonly otpService: OtpService | null = null,
    private readonly config?: AppConfig,
    private readonly googleAuth?: GoogleAuthService | null,
    private readonly audit?: AuditService | null,
  ) {}

  publicConfig = asyncHandler(async (_req: Request, res: Response) => {
    const googleClientId = this.config?.auth.googleClientId;
    return sendSuccess(res, {
      googleClientId: googleClientId ?? null,
      googleEnabled: Boolean(googleClientId),
      demoAuth: Boolean(this.config?.auth.demoAuth),
      otpEnabled: Boolean(this.otpService),
      emailOtpConfigured: Boolean(
        this.config?.auth.demoAuth || this.config?.email.enabled || this.config?.otp.provider === 'mock',
      ),
      mobileOtpConfigured: Boolean(
        this.config?.auth.demoAuth ||
          (this.config?.sms.enabled &&
            (this.config.sms.provider === 'msg91'
              ? Boolean(this.config.sms.msg91.authKey && this.config.sms.msg91.templateId)
              : this.config.sms.provider !== 'mock')),
      ),
      passwordLogin: true,
    });
  });

  register = asyncHandler(async (req: Request, res: Response) => {
    const body = parseBody(registerBodySchema, req.body);
    const session = await this.service().register(body);
    return sendSuccess(res, session, 201);
  });

  login = asyncHandler(async (req: Request, res: Response) => {
    const body = parseBody(loginBodySchema, req.body);
    const session = await this.service().login(body);
    return sendSuccess(res, session);
  });

  refresh = asyncHandler(async (req: Request, res: Response) => {
    const body = parseBody(refreshBodySchema, req.body);
    const session = await this.service().refresh(body.refreshToken);
    return sendSuccess(res, session);
  });

  logout = asyncHandler(async (req: Request, res: Response) => {
    const body = parseBody(refreshBodySchema, req.body);
    const result = await this.service().logout(
      body.refreshToken,
      tryExtractBearerToken(req.header('authorization')),
    );
    return sendSuccess(res, result);
  });

  me = asyncHandler(async (req: Request, res: Response) => {
    const current = getAuthenticatedUser(req);
    const user = await this.service().getMe(current.id);
    return sendSuccess(res, { user });
  });

  requestEmailOtp = asyncHandler(async (req: Request, res: Response) => {
    const body = parseBody(otpRequestBodySchema, { ...req.body, channel: 'email' });
    return this.requestOtpImpl(req, res, body);
  });

  requestMobileOtp = asyncHandler(async (req: Request, res: Response) => {
    const body = parseBody(otpRequestBodySchema, { ...req.body, channel: 'sms' });
    return this.requestOtpImpl(req, res, body);
  });

  requestOtp = asyncHandler(async (req: Request, res: Response) => {
    const body = parseBody(otpRequestBodySchema, req.body);
    return this.requestOtpImpl(req, res, body);
  });

  verifyEmailOtp = asyncHandler(async (req: Request, res: Response) => {
    const body = parseBody(otpVerifyBodySchema, req.body);
    return this.verifyOtpImpl(res, { ...body, channelHint: 'email' });
  });

  verifyMobileOtp = asyncHandler(async (req: Request, res: Response) => {
    const body = parseBody(otpVerifyBodySchema, req.body);
    return this.verifyOtpImpl(res, { ...body, channelHint: 'sms' });
  });

  verifyOtp = asyncHandler(async (req: Request, res: Response) => {
    const body = parseBody(otpVerifyBodySchema, req.body);
    return this.verifyOtpImpl(res, body);
  });

  google = asyncHandler(async (req: Request, res: Response) => {
    const body = parseBody(googleCredentialBodySchema, req.body);
    if (!this.googleAuth) {
      throw new ExternalServiceError('CONFIGURATION REQUIRED', { provider: 'google' });
    }
    try {
      const identity = await this.googleAuth.verifyIdToken(body.credential);
      const session = await this.service().signInWithGoogleIdentity({
        ...identity,
        organizationName: body.organizationName,
      });
      return sendSuccess(res, session);
    } catch (error) {
      await this.audit?.record({
        action: AUDIT_ACTIONS.LOGIN_GOOGLE_FAILED,
        resource: 'user',
        status: 'failed',
      });
      throw error;
    }
  });

  requestPasswordReset = asyncHandler(async (req: Request, res: Response) => {
    const body = parseBody(passwordResetRequestBodySchema, req.body);
    const requestShape = {
      destination: body.email,
      channel: 'email' as const,
      purpose: 'password-reset' as const,
    };
    if (!this.authService) {
      throw new DatabaseError(
        'Authentication is not configured. Set DATABASE_URL, JWT_ACCESS_SECRET, and JWT_REFRESH_SECRET.',
      );
    }
    const exists = await this.authService.hasAccount(body.email);
    if (!exists) {
      return sendSuccess(res, this.otp().describeRequest(requestShape));
    }
    const result = await this.otp().request(requestShape);
    return sendSuccess(res, result);
  });

  confirmPasswordReset = asyncHandler(async (req: Request, res: Response) => {
    const body = parseBody(passwordResetConfirmBodySchema, req.body);
    this.service().assertPasswordPolicy(body.password);
    await this.otp().verify({
      destination: body.email,
      purpose: 'password-reset',
      code: body.code,
    });
    const result = await this.service().resetPassword(body.email, body.password);
    return sendSuccess(res, result);
  });

  private async requestOtpImpl(
    _req: Request,
    res: Response,
    body: ReturnType<typeof otpRequestBodySchema.parse>,
  ) {
    if (
      this.authService &&
      (body.purpose === 'login' || body.purpose === 'password-reset')
    ) {
      const exists =
        body.channel === 'email'
          ? await this.authService.hasAccount(body.destination)
          : await this.authService.hasPhoneAccount(body.destination);
      if (!exists) {
        await this.audit?.record({
          action: AUDIT_ACTIONS.LOGIN_OTP_REQUESTED,
          resource: 'user',
          status: 'succeeded',
          metadata: { channel: body.channel },
        });
        return sendSuccess(res, this.otp().describeRequest(body));
      }
    }

    if (body.purpose === 'signup') {
      await this.audit?.record({
        action: AUDIT_ACTIONS.SIGNUP_STARTED,
        resource: 'user',
        status: 'succeeded',
        metadata: { channel: body.channel },
      });
    } else {
      await this.audit?.record({
        action: AUDIT_ACTIONS.LOGIN_OTP_REQUESTED,
        resource: 'user',
        status: 'succeeded',
        metadata: { channel: body.channel },
      });
    }

    const result = await this.otp().request(body);
    return sendSuccess(res, result);
  }

  private async verifyOtpImpl(
    res: Response,
    body: ReturnType<typeof otpVerifyBodySchema.parse> & { channelHint?: 'email' | 'sms' },
  ) {
    try {
      const result = await this.otp().verify(body);
      const channel = body.channelHint ?? (body.destination.includes('@') ? 'email' : 'sms');

      if (result.purpose === 'signup' && this.authService) {
        if (!body.displayName) {
          throw new AuthenticationError('Invalid or expired OTP');
        }
        const session = await this.authService.completeVerifiedSignup({
          email: channel === 'email' ? result.destination : undefined,
          phone: channel === 'sms' ? result.destination : body.phone,
          displayName: body.displayName ?? 'User',
          organizationName: body.organizationName,
        });
        await this.audit?.record({
          actorId: session.user.id,
          action: AUDIT_ACTIONS.LOGIN_OTP_VERIFIED,
          resource: 'user',
          resourceId: session.user.id,
          status: 'succeeded',
          metadata: { channel },
        });
        return sendSuccess(res, { ...result, ...session });
      }

      if (result.purpose === 'login' && this.authService) {
        const session =
          channel === 'sms'
            ? await this.authService.createSessionForVerifiedIdentity({
                type: 'mobile',
                identifier: result.destination,
              })
            : await this.authService.createSessionForVerifiedEmail(result.destination);
        if (session) {
          await this.audit?.record({
            actorId: session.user.id,
            action: AUDIT_ACTIONS.LOGIN_OTP_VERIFIED,
            resource: 'user',
            resourceId: session.user.id,
            status: 'succeeded',
            metadata: { channel },
          });
          return sendSuccess(res, { ...result, ...session });
        }
        throw new AuthenticationError('Invalid or expired OTP');
      }

      return sendSuccess(res, result);
    } catch (error) {
      await this.audit?.record({
        action: AUDIT_ACTIONS.LOGIN_OTP_FAILED,
        resource: 'user',
        status: 'failed',
      });
      throw error;
    }
  }

  private otp(): OtpService {
    if (!this.otpService) {
      throw new ExternalServiceError('OTP is not configured', { provider: 'otp' });
    }

    return this.otpService;
  }

  private service(): AuthService {
    if (!this.authService) {
      throw new DatabaseError(
        'Authentication is not configured. Set DATABASE_URL, JWT_ACCESS_SECRET, and JWT_REFRESH_SECRET.',
      );
    }

    return this.authService;
  }
}
