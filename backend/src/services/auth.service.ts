import { randomUUID } from 'node:crypto';

import type { PrismaClient } from '@prisma/client';

import type { TokenRevocationStore } from '../auth/token-revocation';
import { hashToken } from '../auth/token-hash';
import { assertAccountActive } from '../auth/account';
import type { TokenService } from '../auth/jwt';
import type { PasswordService } from '../auth/password';
import { toAuthenticatedUser, type AuthenticatedUser, type AuthSession } from '../auth/types';
import { AuthenticationError, AuthorizationError, ConflictError } from '../errors';
import { AUDIT_ACTIONS } from '../constants';
import type { AuditService } from '../audit/audit.service';
import { withTransaction } from '../lib/transaction';
import { createRepositories, type Repositories } from '../repositories';
import type { UserWithRoles } from '../repositories/types';

const INVALID_CREDENTIALS = 'Invalid email or password';

export interface AuthServiceDependencies {
  prisma: PrismaClient;
  passwordService: PasswordService;
  tokenService: TokenService;
  defaultRole: string;
  revocation?: TokenRevocationStore | null;
  onUserCreated?: (user: { id: string; email: string; displayName: string }) => void | Promise<void>;
  audit?: AuditService | null;
}

export class AuthService {
  constructor(private readonly deps: AuthServiceDependencies) {}

  async register(input: { email: string; password: string; displayName: string }): Promise<AuthSession> {
    const passwordHash = await this.deps.passwordService.hash(input.password);

    const session = await withTransaction(this.deps.prisma, async (tx) => {
      const repos = createRepositories(tx);
      let created;
      try {
        created = await repos.users.create({
          email: input.email,
          passwordHash,
          displayName: input.displayName,
        });
      } catch (error) {
        if (error instanceof ConflictError) {
          throw new ConflictError('An account with this email already exists');
        }
        throw error;
      }

      const role = await repos.roles.findByName(this.deps.defaultRole);
      if (role) {
        await repos.roles.assignUser(created.id, role.id);
      }
      await repos.organizations.createPersonalWorkspace(created.id, input.displayName);

      const user = (await repos.users.findByIdWithRoles(created.id)) ?? {
        ...created,
        roles: [],
        permissions: [],
      };
      return (await this.issueSession(repos, user)).session;
    });

    try {
      await this.deps.onUserCreated?.({
        id: session.user.id,
        email: session.user.email,
        displayName: session.user.displayName,
      });
    } catch {
      // Event emission must not fail registration.
    }

    await this.deps.audit?.record({
      actorId: session.user.id,
      action: AUDIT_ACTIONS.USER_CREATED,
      resource: 'user',
      resourceId: session.user.id,
      metadata: { email: session.user.email },
      status: 'succeeded',
    });

    return session;
  }

  async login(input: { email: string; password: string }): Promise<AuthSession> {
    const repos = createRepositories(this.deps.prisma);
    const record = await repos.users.findByEmailForAuth(input.email);

    if (!record) {
      await this.deps.passwordService.verifyUnknown(input.password);
      await this.deps.audit?.record({
        action: AUDIT_ACTIONS.USER_LOGIN,
        resource: 'user',
        status: 'failed',
      });
      throw new AuthenticationError(INVALID_CREDENTIALS);
    }

    const matches = record.passwordHash
      ? await this.deps.passwordService.verify(input.password, record.passwordHash)
      : (await this.deps.passwordService.verifyUnknown(input.password), false);
    if (!matches) {
      await this.deps.audit?.record({
        actorId: record.id,
        action: AUDIT_ACTIONS.USER_LOGIN,
        resource: 'user',
        resourceId: record.id,
        status: 'failed',
      });
      throw new AuthenticationError(INVALID_CREDENTIALS);
    }

    if (record.status !== 'active') {
      assertAccountActive(record.status);
    }

    const user = await repos.users.findByIdWithRoles(record.id);
    if (!user) {
      throw new AuthenticationError(INVALID_CREDENTIALS);
    }

    const session = (await this.issueSession(repos, user)).session;
    await this.deps.audit?.record({
      actorId: user.id,
      action: AUDIT_ACTIONS.USER_LOGIN,
      resource: 'user',
      resourceId: user.id,
      status: 'succeeded',
    });
    return session;
  }

  async refresh(refreshToken: string): Promise<AuthSession> {
    const claims = this.deps.tokenService.verifyRefresh(refreshToken);
    const tokenHash = hashToken(refreshToken);

    const outcome = await withTransaction(this.deps.prisma, async (tx) => {
      const repos = createRepositories(tx);
      const stored = await repos.refreshTokens.findByTokenHash(tokenHash);

      if (!stored || stored.id !== claims.jti || stored.userId !== claims.sub) {
        return { kind: 'invalid' as const };
      }

      if (stored.revokedAt) {
        await repos.refreshTokens.revokeFamily(stored.familyId);
        return { kind: 'reuse' as const };
      }

      if (stored.expiresAt.getTime() <= Date.now()) {
        return { kind: 'expired' as const };
      }

      const user = await repos.users.findByIdWithRoles(stored.userId);
      if (!user || user.status !== 'active') {
        await repos.refreshTokens.revokeFamily(stored.familyId);
        return { kind: 'disabled' as const };
      }

      const issued = await this.issueSession(repos, user, stored.familyId);
      const claimed = await repos.refreshTokens.claimForRotation(stored.id, issued.refreshTokenId);
      if (!claimed) {
        await repos.refreshTokens.revoke(issued.refreshTokenId);
        return { kind: 'invalid' as const };
      }
      return { kind: 'session' as const, session: issued.session };
    });

    if (outcome.kind === 'session') {
      return outcome.session;
    }

    if (outcome.kind === 'reuse') {
      throw new AuthenticationError('Refresh token has been revoked');
    }

    if (outcome.kind === 'disabled') {
      throw new AuthorizationError('Account is disabled');
    }

    if (outcome.kind === 'expired') {
      throw new AuthenticationError('Token has expired');
    }

    throw new AuthenticationError('Invalid or malformed token');
  }

  async logout(refreshToken: string, accessToken?: string): Promise<{ revoked: true }> {
    const claims = this.deps.tokenService.verifyRefresh(refreshToken);
    const stored = await createRepositories(this.deps.prisma).refreshTokens.findByTokenHash(
      hashToken(refreshToken),
    );

    if (!stored || stored.id !== claims.jti || stored.userId !== claims.sub) {
      throw new AuthenticationError('Invalid or malformed token');
    }

    if (!stored.revokedAt) {
      await createRepositories(this.deps.prisma).refreshTokens.revokeFamily(stored.familyId);
    }

    await this.denyAccessToken(accessToken);
    await this.deps.audit?.record({
      actorId: stored.userId,
      action: AUDIT_ACTIONS.USER_LOGOUT,
      resource: 'user',
      resourceId: stored.userId,
      status: 'succeeded',
    });
    return { revoked: true };
  }

  private async denyAccessToken(accessToken?: string): Promise<void> {
    if (!accessToken || !this.deps.revocation) {
      return;
    }

    try {
      const claims = this.deps.tokenService.verifyAccess(accessToken);
      await this.deps.revocation.denyAccessJti(claims.jti);
    } catch {
      // Refresh-family logout still succeeds when the access token is missing or expired.
    }
  }

  async getMe(userId: string): Promise<AuthenticatedUser> {
    const repos = createRepositories(this.deps.prisma);
    const user = await repos.users.findByIdWithRoles(userId);
    if (!user) {
      throw new AuthenticationError('Authentication required');
    }

    if (user.status !== 'active') {
      throw new AuthorizationError('Account is disabled');
    }

    return toAuthenticatedUser(await this.withOrganizations(repos, user));
  }

  async hasAccount(email: string): Promise<boolean> {
    const record = await createRepositories(this.deps.prisma).users.findByEmailForAuth(email);
    return Boolean(record);
  }

  async hasPhoneAccount(phone: string): Promise<boolean> {
    const repos = createRepositories(this.deps.prisma);
    const record =
      (await repos.users.findByIdentity('mobile', phone)) ?? (await repos.users.findByPhone(phone));
    return Boolean(record);
  }

  assertPasswordPolicy(password: string): void {
    this.deps.passwordService.validate(password);
  }

  async resetPassword(email: string, password: string): Promise<{ reset: true }> {
    this.deps.passwordService.validate(password);
    const passwordHash = await this.deps.passwordService.hash(password);
    const repos = createRepositories(this.deps.prisma);
    const record = await repos.users.findByEmailForAuth(email);

    if (!record) {
      throw new AuthenticationError('Invalid or expired OTP');
    }

    if (record.status !== 'active') {
      assertAccountActive(record.status);
    }

    await repos.users.update(record.id, { passwordHash });
    await repos.refreshTokens.revokeAllForUser(record.id);
    await this.deps.revocation?.revokeUserAccess(record.id);
    return { reset: true };
  }

  async createSessionForVerifiedEmail(email: string): Promise<AuthSession | null> {
    return this.createSessionForVerifiedIdentity({ type: 'email', identifier: email });
  }

  async createSessionForVerifiedIdentity(input: {
    type: 'email' | 'mobile';
    identifier: string;
  }): Promise<AuthSession | null> {
    const repos = createRepositories(this.deps.prisma);
    const record =
      input.type === 'email'
        ? await repos.users.findByEmailForAuth(input.identifier)
        : ((await repos.users.findByIdentity('mobile', normalizePhone(input.identifier))) ??
          (await repos.users.findByPhone(input.identifier)));
    if (!record) {
      return null;
    }

    if (record.status !== 'active') {
      assertAccountActive(record.status);
    }

    const user = await repos.users.findByIdWithRoles(record.id);
    if (!user) {
      return null;
    }

    return (await this.issueSession(repos, user)).session;
  }

  async completeVerifiedSignup(input: {
    email?: string;
    phone?: string;
    displayName: string;
    organizationName?: string;
  }): Promise<AuthSession> {
    const email = input.email?.trim().toLowerCase();
    const phone = input.phone ? normalizePhone(input.phone) : undefined;
    if (!email && !phone) {
      throw new AuthenticationError('Invalid or expired OTP');
    }

    const session = await withTransaction(this.deps.prisma, async (tx) => {
      const repos = createRepositories(tx);
      const existing = email
        ? await repos.users.findByEmailForAuth(email)
        : await repos.users.findByPhone(phone!);
      if (existing) {
        if (existing.status !== 'active') {
          assertAccountActive(existing.status);
        }
        if (phone && !existing.phone) {
          await repos.users.update(existing.id, { phone });
          await repos.users.linkIdentity(existing.id, 'mobile', phone);
        }
        if (email) {
          await repos.users.linkIdentity(existing.id, 'email', email);
        }
        const user = (await repos.users.findByIdWithRoles(existing.id)) ?? {
          ...existing,
          roles: [],
          permissions: [],
        };
        return (await this.issueSession(repos, user)).session;
      }

      const created = await repos.users.create({
        email: email ?? placeholderEmailForPhone(phone!),
        displayName: input.displayName,
        phone: phone ?? null,
      });
      const role = await repos.roles.findByName(this.deps.defaultRole);
      if (role) {
        await repos.roles.assignUser(created.id, role.id);
      }
      await repos.organizations.createPersonalWorkspace(created.id, input.displayName, input.organizationName);
      if (email) {
        await repos.users.linkIdentity(created.id, 'email', email);
      }
      if (phone) {
        await repos.users.linkIdentity(created.id, 'mobile', phone);
      }
      const user = (await repos.users.findByIdWithRoles(created.id)) ?? {
        ...created,
        roles: [],
        permissions: [],
      };
      return (await this.issueSession(repos, user)).session;
    });

    await this.deps.audit?.record({
      actorId: session.user.id,
      action: AUDIT_ACTIONS.SIGNUP_COMPLETED,
      resource: 'user',
      resourceId: session.user.id,
      metadata: { method: email ? 'email' : 'mobile' },
      status: 'succeeded',
    });
    return session;
  }

  async signInWithGoogleIdentity(identity: {
    subject: string;
    email?: string;
    emailVerified: boolean;
    name?: string;
    organizationName?: string;
  }): Promise<AuthSession> {
    const session = await withTransaction(this.deps.prisma, async (tx) => {
      const repos = createRepositories(tx);
      let record = await repos.users.findByGoogleSubject(identity.subject);
      if (!record && identity.email && identity.emailVerified) {
        const byEmail = await repos.users.findByEmailForAuth(identity.email);
        if (byEmail) {
          if (byEmail.googleSubject && byEmail.googleSubject !== identity.subject) {
            throw new ConflictError('This Google account cannot be linked');
          }
          await repos.users.update(byEmail.id, { googleSubject: identity.subject });
          record = { ...byEmail, googleSubject: identity.subject };
        }
      }

      if (!record) {
        if (!identity.email || !identity.emailVerified) {
          throw new AuthenticationError('Google account email is not verified');
        }
        const created = await repos.users.create({
          email: identity.email,
          displayName: identity.name?.trim() || identity.email.split('@')[0] || 'User',
          googleSubject: identity.subject,
        });
        const role = await repos.roles.findByName(this.deps.defaultRole);
        if (role) {
          await repos.roles.assignUser(created.id, role.id);
        }
        await repos.organizations.createPersonalWorkspace(
          created.id,
          created.displayName,
          identity.organizationName,
        );
        record = {
          ...created,
          passwordHash: null,
          phone: null,
          googleSubject: identity.subject,
        };
      }

      if (record.status !== 'active') {
        assertAccountActive(record.status);
      }

      await repos.users.linkIdentity(record.id, 'google', identity.subject);
      if (identity.email && identity.emailVerified) {
        await repos.users.linkIdentity(record.id, 'email', identity.email);
      }

      const user = await repos.users.findByIdWithRoles(record.id);
      if (!user) {
        throw new AuthenticationError('Invalid Google credential');
      }
      return (await this.issueSession(repos, user)).session;
    });

    await this.deps.audit?.record({
      actorId: session.user.id,
      action: AUDIT_ACTIONS.LOGIN_GOOGLE_SUCCESS,
      resource: 'user',
      resourceId: session.user.id,
      status: 'succeeded',
    });
    return session;
  }

  private async withOrganizations(repos: Repositories, user: UserWithRoles): Promise<UserWithRoles> {
    const organizations = await repos.users.listOrganizations(user.id);
    return {
      ...user,
      organizations,
      organizationIds: organizations.map((item) => item.id),
      currentOrganizationId: organizations.find((item) => item.isDefault)?.id ?? organizations[0]?.id ?? null,
    };
  }

  private async issueSession(
    repos: Repositories,
    user: UserWithRoles,
    familyId?: string,
  ): Promise<{ session: AuthSession; refreshTokenId: ReturnType<typeof randomUUID> }> {
    const authUser = toAuthenticatedUser(await this.withOrganizations(repos, user));
    const refreshId = randomUUID();
    const nextFamilyId = familyId ?? randomUUID();
    const tvn = (await this.deps.revocation?.currentAccessVersion(user.id)) ?? 0;
    const accessToken = this.deps.tokenService.signAccess({
      userId: user.id,
      role: authUser.role,
      tvn,
    });
    const refreshToken = this.deps.tokenService.signRefresh({
      userId: user.id,
      role: authUser.role,
      jti: refreshId,
    });

    await repos.refreshTokens.create({
      id: refreshId,
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      familyId: nextFamilyId,
      expiresAt: new Date(Date.now() + this.deps.tokenService.refreshExpiresInSeconds * 1000),
    });

    return {
      refreshTokenId: refreshId,
      session: {
        user: authUser,
        tokens: {
          accessToken,
          refreshToken,
          tokenType: 'Bearer',
          expiresIn: this.deps.tokenService.accessExpiresInSeconds,
        },
      },
    };
  }
}

function placeholderEmailForPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return `m${digits}@identity.bharatbid.invalid`;
}

function normalizePhone(phone: string): string {
  const trimmed = phone.trim();
  if (trimmed.startsWith('+')) {
    return `+${trimmed.slice(1).replace(/\D/g, '')}`;
  }
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 10) {
    return `+91${digits}`;
  }
  return `+${digits}`;
}
