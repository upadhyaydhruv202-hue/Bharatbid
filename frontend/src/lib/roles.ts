import type { AuthUser } from '../types/api';

const ROLE_LABELS: Record<string, string> = {
  procurement_officer: 'Procurement officer',
  reviewer: 'Reviewer',
  admin: 'Administrator',
  manager: 'Manager',
  staff: 'Staff',
  user: 'User',
};

export function roleLabel(user: Pick<AuthUser, 'role' | 'roles'> | null | undefined): string {
  const names = user?.roles?.length ? user.roles : user?.role ? [user.role] : [];
  const preferred = names.find((name) => name === 'procurement_officer' || name === 'reviewer' || name === 'admin') ?? names[0];
  if (!preferred) {
    return 'Signed in';
  }
  return ROLE_LABELS[preferred] ?? preferred.replace(/_/g, ' ');
}
