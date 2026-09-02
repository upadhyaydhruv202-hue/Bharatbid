/**
 * Frontend permission checks are UX only. The API still enforces authorization.
 */

export function hasRole(
  user: { roles?: string[] } | null | undefined,
  ...roles: string[]
): boolean {
  const owned = new Set((user?.roles ?? []).map((role) => role.trim().toLowerCase()));
  return roles.some((role) => owned.has(role.trim().toLowerCase()));
}

export function hasPermission(
  user: { permissions?: string[] } | null | undefined,
  permission: string,
): boolean {
  const owned = new Set((user?.permissions ?? []).map((key) => key.trim().toLowerCase()));
  return owned.has(permission.trim().toLowerCase());
}
