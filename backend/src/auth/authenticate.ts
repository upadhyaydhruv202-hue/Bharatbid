import type { NextFunction, Request, RequestHandler, Response } from 'express';

import { ERROR_CODES } from '../constants';
import { AppError, AuthenticationError, DatabaseError } from '../errors';
import type { UserRepository } from '../repositories/user.repository';
import { asyncHandler } from '../utils/async-handler';
import { setRequestActor } from '../utils/request-context';
import { assertAccountActive } from './account';
import type { TokenRevocationStore } from './token-revocation';
import type { TokenService } from './jwt';
import { toAuthenticatedUser, type AuthenticatedUser } from './types';

export interface AuthenticateDependencies {
  tokenService: TokenService | null;
  users: UserRepository | null;
  revocation?: TokenRevocationStore | null;
}

export function extractBearerToken(header: string | undefined): string {
  if (!header) {
    throw new AuthenticationError('Authentication required');
  }

  const match = /^(Bearer)\s+(\S+)$/i.exec(header.trim());
  if (!match) {
    throw new AuthenticationError('Invalid or malformed token');
  }

  return match[2];
}

export function tryExtractBearerToken(header: string | undefined): string | undefined {
  if (!header) {
    return undefined;
  }

  try {
    return extractBearerToken(header);
  } catch {
    return undefined;
  }
}

export function getAuthenticatedUser(req: Request): AuthenticatedUser {
  if (!req.user) {
    throw new AuthenticationError('Authentication required');
  }

  return req.user;
}

export function authenticate(dependencies: AuthenticateDependencies): RequestHandler {
  return asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
    const token = extractBearerToken(req.header('authorization'));

    if (!dependencies.tokenService) {
      throw new AppError(ERROR_CODES.INTERNAL_ERROR, 'Authentication is not configured', 500);
    }

    const claims = dependencies.tokenService.verifyAccess(token);
    if (dependencies.revocation) {
      await dependencies.revocation.assertAccessAllowed(claims);
    }

    if (!dependencies.users) {
      throw new DatabaseError('Database is not configured');
    }

    const record = await dependencies.users.findByIdWithRoles(claims.sub);

    if (!record) {
      throw new AuthenticationError('Authentication required');
    }

    assertAccountActive(record.status);

    req.user = toAuthenticatedUser(record);
    setRequestActor(req.user.id);
    next();
  });
}
