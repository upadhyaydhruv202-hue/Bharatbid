import type { Request, Response } from 'express';

import { getAuthenticatedUser, tryExtractBearerToken } from '../auth/authenticate';
import { DatabaseError, ExternalServiceError } from '../errors';
import { loginBodySchema, passwordResetConfirmBodySchema, passwordResetRequestBodySchema, refreshBodySchema, registerBodySchema } from '../schemas/auth';
import { otpRequestBodySchema, otpVerifyBodySchema, type OtpService } from '../otp';
import { parseBody } from '../schemas/parse';
import type { AuthService } from '../services/auth.service';
import { asyncHandler } from '../utils/async-handler';
import { sendSuccess } from '../utils/response';

export class AuthController {
  constructor(
    private readonly authService: AuthService | null,
    private readonly otpService: OtpService | null = null,
  ) {}

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

  requestOtp = asyncHandler(async (req: Request, res: Response) => {
    const body = parseBody(otpRequestBodySchema, req.body);
    if (
      this.authService &&
      body.channel === 'email' &&
      (body.purpose === 'login' || body.purpose === 'password-reset')
    ) {
      const exists = await this.authService.hasAccount(body.destination);
      if (!exists) {
        return sendSuccess(res, this.otp().describeRequest(body));
      }
    }
    const result = await this.otp().request(body);
    return sendSuccess(res, result);
  });

  verifyOtp = asyncHandler(async (req: Request, res: Response) => {
    const body = parseBody(otpVerifyBodySchema, req.body);
    const result = await this.otp().verify(body);
    if (result.purpose === 'login' && this.authService) {
      const session = await this.authService.createSessionForVerifiedEmail(result.destination);
      if (session) {
        return sendSuccess(res, { ...result, ...session });
      }
    }
    return sendSuccess(res, result);
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
