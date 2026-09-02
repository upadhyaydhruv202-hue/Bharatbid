/**
 * Default RBAC catalog. BharatBid roles and platform infrastructure permissions.
 *
 * Role names are stored lowercase (`admin`) and compared case-insensitively.
 * ADMIN is not a middleware bypass. It receives every catalog permission through seed data.
 */

export const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  STAFF: 'staff',
  USER: 'user',
  PROCUREMENT_OFFICER: 'procurement_officer',
  REVIEWER: 'reviewer',
} as const;

export type DefaultRoleName = (typeof ROLES)[keyof typeof ROLES];

export const PERMISSIONS = {
  USERS_READ: 'users.read',
  USERS_WRITE: 'users.write',
  ROLES_READ: 'roles.read',
  ROLES_WRITE: 'roles.write',
  REPORTS_GENERATE: 'reports.generate',
  NOTIFICATIONS_READ: 'notifications.read',
  NOTIFICATIONS_WRITE: 'notifications.write',
  AI_USE: 'ai.use',
  DOCUMENTS_ANALYZE: 'documents.analyze',
  DOCUMENTS_READ: 'documents.read',
  FILES_READ: 'files.read',
  FILES_WRITE: 'files.write',
  JOBS_READ: 'jobs.read',
  AUDIT_READ: 'audit.read',
  ADMIN_SETTINGS: 'admin.settings',
  TENDERS_READ: 'tenders.read',
  TENDERS_WRITE: 'tenders.write',
  BIDDERS_READ: 'bidders.read',
  BIDDERS_WRITE: 'bidders.write',
  BIDS_READ: 'bids.read',
  BIDS_WRITE: 'bids.write',
} as const;

export type DefaultPermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const DEFAULT_ROLES: ReadonlyArray<{ name: DefaultRoleName; description: string }> = [
  { name: ROLES.ADMIN, description: 'Full access to platform capabilities' },
  { name: ROLES.MANAGER, description: 'Manage users, reports, and notifications' },
  { name: ROLES.STAFF, description: 'Operational access' },
  { name: ROLES.USER, description: 'Standard application access' },
  { name: ROLES.PROCUREMENT_OFFICER, description: 'Create and manage tenders, bidders, and bid submissions' },
  { name: ROLES.REVIEWER, description: 'View tenders, bidders, and bid submissions for review preparation' },
];

export const DEFAULT_PERMISSIONS: ReadonlyArray<{ key: DefaultPermissionKey; description: string }> = [
  { key: PERMISSIONS.USERS_READ, description: 'View users' },
  { key: PERMISSIONS.USERS_WRITE, description: 'Create and update users' },
  { key: PERMISSIONS.ROLES_READ, description: 'View roles and permissions' },
  { key: PERMISSIONS.ROLES_WRITE, description: 'Create roles and assign permissions' },
  { key: PERMISSIONS.REPORTS_GENERATE, description: 'Generate reports' },
  { key: PERMISSIONS.NOTIFICATIONS_READ, description: 'View notifications' },
  { key: PERMISSIONS.NOTIFICATIONS_WRITE, description: 'Create and update notifications' },
  { key: PERMISSIONS.AI_USE, description: 'Use AI features' },
  { key: PERMISSIONS.DOCUMENTS_ANALYZE, description: 'Upload and analyze documents with AI' },
  { key: PERMISSIONS.DOCUMENTS_READ, description: 'Read document analysis results' },
  { key: PERMISSIONS.FILES_READ, description: 'Read uploaded files and signed download URLs' },
  { key: PERMISSIONS.FILES_WRITE, description: 'Upload and delete files' },
  { key: PERMISSIONS.JOBS_READ, description: 'Read background job status' },
  { key: PERMISSIONS.AUDIT_READ, description: 'Read audit events' },
  { key: PERMISSIONS.ADMIN_SETTINGS, description: 'Change administrative settings' },
  { key: PERMISSIONS.TENDERS_READ, description: 'View tenders and tender requirements' },
  { key: PERMISSIONS.TENDERS_WRITE, description: 'Create and update tenders and tender requirements' },
  { key: PERMISSIONS.BIDDERS_READ, description: 'View bidder profiles' },
  { key: PERMISSIONS.BIDDERS_WRITE, description: 'Create and update bidders' },
  { key: PERMISSIONS.BIDS_READ, description: 'View bid submissions' },
  { key: PERMISSIONS.BIDS_WRITE, description: 'Create, update, and submit bid submissions' },
];

export const DEFAULT_ROLE_PERMISSIONS: Record<DefaultRoleName, readonly DefaultPermissionKey[]> = {
  [ROLES.ADMIN]: DEFAULT_PERMISSIONS.map((permission) => permission.key),
  [ROLES.MANAGER]: [
    PERMISSIONS.USERS_READ,
    PERMISSIONS.ROLES_READ,
    PERMISSIONS.REPORTS_GENERATE,
    PERMISSIONS.NOTIFICATIONS_READ,
    PERMISSIONS.NOTIFICATIONS_WRITE,
    PERMISSIONS.AI_USE,
    PERMISSIONS.DOCUMENTS_ANALYZE,
    PERMISSIONS.DOCUMENTS_READ,
    PERMISSIONS.FILES_READ,
    PERMISSIONS.FILES_WRITE,
    PERMISSIONS.JOBS_READ,
    PERMISSIONS.AUDIT_READ,
    PERMISSIONS.TENDERS_READ,
    PERMISSIONS.BIDDERS_READ,
    PERMISSIONS.BIDS_READ,
  ],
  [ROLES.STAFF]: [
    PERMISSIONS.NOTIFICATIONS_READ,
    PERMISSIONS.JOBS_READ,
    PERMISSIONS.FILES_READ,
    PERMISSIONS.FILES_WRITE,
  ],
  [ROLES.USER]: [PERMISSIONS.NOTIFICATIONS_READ, PERMISSIONS.FILES_READ, PERMISSIONS.FILES_WRITE],
  [ROLES.PROCUREMENT_OFFICER]: [
    PERMISSIONS.NOTIFICATIONS_READ,
    PERMISSIONS.FILES_READ,
    PERMISSIONS.FILES_WRITE,
    PERMISSIONS.JOBS_READ,
    PERMISSIONS.AUDIT_READ,
    PERMISSIONS.TENDERS_READ,
    PERMISSIONS.TENDERS_WRITE,
    PERMISSIONS.BIDDERS_READ,
    PERMISSIONS.BIDDERS_WRITE,
    PERMISSIONS.BIDS_READ,
    PERMISSIONS.BIDS_WRITE,
  ],
  [ROLES.REVIEWER]: [
    PERMISSIONS.NOTIFICATIONS_READ,
    PERMISSIONS.FILES_READ,
    PERMISSIONS.JOBS_READ,
    PERMISSIONS.TENDERS_READ,
    PERMISSIONS.BIDDERS_READ,
    PERMISSIONS.BIDS_READ,
  ],
};
