import { NotFoundError } from '../errors';
import { getRequestContext } from '../utils/request-context';

export const DEMO_ORGANIZATION_ID = '11111111-1111-4111-8111-aaaaaaaaaaa1';
export const DEMO_ORGANIZATION_SLUG = 'cpcl-demo';

export interface OrganizationScope {
  organizationIds: string[];
  currentOrganizationId: string | null;
}

export function organizationFilter(scope?: OrganizationScope | null): { organizationId: { in: string[] } } | undefined {
  if (!scope) {
    return undefined;
  }
  return { organizationId: { in: scope.organizationIds.length > 0 ? scope.organizationIds : ['00000000-0000-4000-a000-000000000000'] } };
}

export function currentOrganizationId(scope?: OrganizationScope | null): string | undefined {
  return scope?.currentOrganizationId ?? scope?.organizationIds[0];
}

export function assertOrganizationAccess(resourceOrganizationId: string | null | undefined, scope?: OrganizationScope | null): void {
  if (!scope) {
    return;
  }
  if (!resourceOrganizationId || !scope.organizationIds.includes(resourceOrganizationId)) {
    throw new NotFoundError('Resource not found');
  }
}

export function scopeFromUser(user?: {
  organizationIds?: string[];
  currentOrganizationId?: string | null;
} | null): OrganizationScope | undefined {
  if (!user?.organizationIds) {
    return undefined;
  }
  return {
    organizationIds: user.organizationIds,
    currentOrganizationId: user.currentOrganizationId ?? user.organizationIds[0] ?? null,
  };
}

export function getOrganizationScope(): OrganizationScope | undefined {
  const ctx = getRequestContext();
  if (!ctx || ctx.organizationIds === undefined) {
    return undefined;
  }
  return {
    organizationIds: ctx.organizationIds,
    currentOrganizationId: ctx.currentOrganizationId ?? ctx.organizationIds[0] ?? null,
  };
}

export function tenantOrganizationWhere(): { organizationId: { in: string[] } } | undefined {
  return organizationFilter(getOrganizationScope());
}

export function requireCurrentOrganizationId(): string | undefined {
  return currentOrganizationId(getOrganizationScope());
}
