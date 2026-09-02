import type { PrismaClient } from '@prisma/client';

import type { AppConfig } from '../types/config';
import type { AppLogger } from '../utils/logger';
import { DEFAULT_PERMISSIONS, DEFAULT_ROLE_PERMISSIONS, DEFAULT_ROLES } from './catalog';

export function shouldSyncRbacCatalog(config: Pick<AppConfig, 'isProduction' | 'isTest'>): boolean {
  return !config.isProduction && !config.isTest;
}

export async function syncRbacCatalogIfEnabled(options: {
  config: Pick<AppConfig, 'isProduction' | 'isTest'>;
  prisma?: PrismaClient | null;
  logger: Pick<AppLogger, 'info'>;
}): Promise<boolean> {
  if (!options.prisma || !shouldSyncRbacCatalog(options.config)) {
    return false;
  }

  await seedRbacCatalog(options.prisma);
  options.logger.info(
    {
      roles: DEFAULT_ROLES.length,
      permissions: DEFAULT_PERMISSIONS.length,
    },
    'RBAC catalog synced',
  );
  return true;
}

export async function seedRbacCatalog(prisma: PrismaClient): Promise<{
  roles: Map<string, { id: string }>;
  permissions: Map<string, { id: string }>;
}> {
  const roles = new Map<string, { id: string }>();
  for (const role of DEFAULT_ROLES) {
    const record = await prisma.role.upsert({
      where: { name: role.name },
      update: { description: role.description },
      create: { name: role.name, description: role.description },
    });
    roles.set(role.name, record);
  }

  const permissions = new Map<string, { id: string }>();
  for (const permission of DEFAULT_PERMISSIONS) {
    const record = await prisma.permission.upsert({
      where: { key: permission.key },
      update: { description: permission.description },
      create: { key: permission.key, description: permission.description },
    });
    permissions.set(permission.key, record);
  }

  for (const [roleName, permissionKeys] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
    const role = roles.get(roleName);
    if (!role) {
      throw new Error(`Missing catalog role: ${roleName}`);
    }

    for (const key of permissionKeys) {
      const permission = permissions.get(key);
      if (!permission) {
        throw new Error(`Missing catalog permission: ${key}`);
      }

      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: role.id,
          permissionId: permission.id,
        },
      });
    }
  }

  return { roles, permissions };
}
