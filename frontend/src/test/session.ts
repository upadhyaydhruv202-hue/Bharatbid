import type { AuthSession } from '../auth/AuthProvider';
import type { AuthUser } from '../types/api';

export const TEST_USER: AuthUser = {
  id: 'user-1',
  email: 'demo.admin@example.com',
  displayName: 'Demo Admin',
  status: 'active',
  role: 'admin',
  roles: ['admin'],
  permissions: ['notifications.read', 'tenders.read', 'files.read'],
};

export const TEST_SESSION: AuthSession = {
  user: TEST_USER,
  accessToken: 'test-token',
  refreshToken: 'refresh-token',
};
