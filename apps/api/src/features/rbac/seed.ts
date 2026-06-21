import { PrismaClient, SystemRole } from '@prisma/client';
import {
  DEFAULT_PLATFORM_CONFIG,
  RBAC_PERMISSION_CODES,
  SYSTEM_ROLE_DEFINITIONS,
} from './constants';

export async function seedRbac(prisma: PrismaClient): Promise<{
  roles: number;
  permissions: number;
}> {
  for (const code of RBAC_PERMISSION_CODES) {
    await prisma.permission.upsert({
      where: { code },
      create: { code, description: code.replace(':', ' ') },
      update: {},
    });
  }

  const allPermissions = await prisma.permission.findMany({
    select: { id: true, code: true },
  });
  const permissionIdByCode = new Map(
    allPermissions.map((permission) => [permission.code, permission.id]),
  );

  for (const roleDef of SYSTEM_ROLE_DEFINITIONS) {
    const role = await prisma.role.upsert({
      where: { name: roleDef.name },
      create: {
        name: roleDef.name,
        description: roleDef.description,
        isSystem: true,
      },
      update: {
        description: roleDef.description,
        isSystem: true,
      },
    });

    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });

    const codes =
      roleDef.permissions === '*'
        ? RBAC_PERMISSION_CODES
        : roleDef.permissions;
    const permissionIds = codes
      .map((code) => permissionIdByCode.get(code))
      .filter((id): id is string => Boolean(id));

    if (permissionIds.length > 0) {
      await prisma.rolePermission.createMany({
        data: permissionIds.map((permissionId) => ({
          roleId: role.id,
          permissionId,
        })),
        skipDuplicates: true,
      });
    }
  }

  const adminRole = await prisma.role.findUnique({
    where: { name: 'admin' },
  });
  const studentRole = await prisma.role.findUnique({
    where: { name: 'student' },
  });

  if (adminRole && studentRole) {
    await prisma.user.updateMany({
      where: { systemRole: SystemRole.admin, roleId: null },
      data: { roleId: adminRole.id },
    });
    await prisma.user.updateMany({
      where: { systemRole: SystemRole.user, roleId: null },
      data: { roleId: studentRole.id },
    });
  }

  const existingConfig = await prisma.platformConfig.findUnique({
    where: { id: 'default' },
  });
  if (!existingConfig) {
    await prisma.platformConfig.create({
      data: {
        id: 'default',
        configJson: DEFAULT_PLATFORM_CONFIG,
      },
    });
  }

  const [roles, permissions] = await Promise.all([
    prisma.role.count(),
    prisma.permission.count(),
  ]);

  return { roles, permissions };
}

export async function getUserPermissionCodes(
  prisma: PrismaClient,
  userId: string,
): Promise<string[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      systemRole: true,
      rbacRole: {
        select: {
          name: true,
          permissions: {
            include: { permission: { select: { code: true } } },
          },
        },
      },
    },
  });
  if (!user) return [];
  if (user.rbacRole?.name === 'super-admin') {
    return [...RBAC_PERMISSION_CODES];
  }
  if (user.systemRole === SystemRole.admin && !user.rbacRole) {
    return [...RBAC_PERMISSION_CODES];
  }
  return (
    user.rbacRole?.permissions.map((entry) => entry.permission.code) ?? []
  );
}
