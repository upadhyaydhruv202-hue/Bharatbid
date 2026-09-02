import { describe, expect, it } from 'vitest';

import { hasPermission, hasRole } from './rbac';

describe('frontend RBAC helpers (UX only)', () => {
  const user = {
    roles: ['user', 'staff'],
    permissions: ['notifications.read', 'files.read'],
  };

  it('hides privileged UI when the permission is missing', () => {
    expect(hasPermission(user, 'files.read')).toBe(true);
    expect(hasPermission(user, 'tenders.write')).toBe(false);
    expect(hasRole(user, 'ADMIN')).toBe(false);
    expect(hasRole(user, 'STAFF')).toBe(true);
  });
});
