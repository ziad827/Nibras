import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { AppStore } from '../../store';
import { requireUser } from '../../lib/auth';
import { Errors } from '../../lib/errors';
import { requirePermission } from '../../lib/rbac';
import { validateId } from '../../lib/validate';
import { RBAC_PERMISSION_CODES } from '../rbac/constants';

type AdminAuth = NonNullable<Awaited<ReturnType<typeof requireUser>>>;

function requireAdminGate(
  auth: AdminAuth | null,
  reply: Parameters<typeof requireUser>[1],
): auth is AdminAuth {
  if (!auth) return false;
  if (auth.user.systemRole !== 'admin') {
    reply.code(403).send(Errors.forbidden());
    return false;
  }
  return true;
}

async function serializeRole(
  prisma: PrismaClient,
  role: {
    id: string;
    name: string;
    description: string;
    isSystem: boolean;
    permissions: Array<{ permission: { code: string } }>;
    _count?: { users: number };
  },
) {
  return {
    id: role.id,
    _id: role.id,
    name: role.name,
    description: role.description,
    isSystem: role.isSystem,
    permissions: role.permissions.map((entry) => entry.permission.code),
    userCount: role._count?.users ?? 0,
  };
}

export function registerAdminRbacRoutes(
  app: FastifyInstance,
  store: AppStore,
  prisma: PrismaClient,
): void {
  app.get(
    '/v1/admin/roles',
    { schema: { tags: ['admin'], summary: 'List roles' } },
    async (request, reply) => {
      const auth = await requireUser(request, reply, store);
      if (!requireAdminGate(auth, reply)) return;
      if (!(await requirePermission(auth, reply, prisma, 'role:read'))) return;

      const roles = await prisma.role.findMany({
        orderBy: { name: 'asc' },
        include: {
          permissions: { include: { permission: { select: { code: true } } } },
          _count: { select: { users: true } },
        },
      });

      return {
        roles: await Promise.all(
          roles.map((role) => serializeRole(prisma, role)),
        ),
      };
    },
  );

  app.get(
    '/v1/admin/roles/:roleId',
    { schema: { tags: ['admin'], summary: 'Get role by id' } },
    async (request, reply) => {
      const auth = await requireUser(request, reply, store);
      if (!requireAdminGate(auth, reply)) return;
      if (!(await requirePermission(auth, reply, prisma, 'role:read'))) return;

      const params = request.params as { roleId: string };
      if (!validateId(params.roleId, reply, 'roleId')) return;

      const role = await prisma.role.findUnique({
        where: { id: params.roleId },
        include: {
          permissions: { include: { permission: { select: { code: true } } } },
          _count: { select: { users: true } },
        },
      });
      if (!role) return reply.code(404).send(Errors.notFound('Role'));

      return serializeRole(prisma, role);
    },
  );

  app.post(
    '/v1/admin/roles',
    { schema: { tags: ['admin'], summary: 'Create role' } },
    async (request, reply) => {
      const auth = await requireUser(request, reply, store);
      if (!requireAdminGate(auth, reply)) return;
      if (!(await requirePermission(auth, reply, prisma, 'role:create'))) return;

      const body = request.body as {
        name?: string;
        description?: string;
        permissions?: string[];
      };
      const name = body.name?.trim();
      if (!name) {
        return reply.code(400).send(Errors.validation('name is required'));
      }

      const permissionCodes = (body.permissions ?? []).filter((code) =>
        RBAC_PERMISSION_CODES.includes(code as (typeof RBAC_PERMISSION_CODES)[number]),
      );
      const permissions = await prisma.permission.findMany({
        where: { code: { in: permissionCodes } },
      });

      const role = await prisma.role.create({
        data: {
          name,
          description: body.description?.trim() || '',
          isSystem: false,
          permissions: {
            create: permissions.map((permission) => ({
              permissionId: permission.id,
            })),
          },
        },
        include: {
          permissions: { include: { permission: { select: { code: true } } } },
          _count: { select: { users: true } },
        },
      });

      return reply.code(201).send(await serializeRole(prisma, role));
    },
  );

  app.patch(
    '/v1/admin/roles/:roleId',
    { schema: { tags: ['admin'], summary: 'Update role' } },
    async (request, reply) => {
      const auth = await requireUser(request, reply, store);
      if (!requireAdminGate(auth, reply)) return;
      if (!(await requirePermission(auth, reply, prisma, 'role:update'))) return;

      const params = request.params as { roleId: string };
      if (!validateId(params.roleId, reply, 'roleId')) return;
      const body = request.body as {
        name?: string;
        description?: string;
        permissions?: string[];
      };

      const existing = await prisma.role.findUnique({
        where: { id: params.roleId },
      });
      if (!existing) return reply.code(404).send(Errors.notFound('Role'));
      if (existing.isSystem && body.name && body.name !== existing.name) {
        return reply
          .code(400)
          .send(Errors.validation('System roles cannot be renamed'));
      }

      if (Array.isArray(body.permissions)) {
        const permissionCodes = body.permissions.filter((code) =>
          RBAC_PERMISSION_CODES.includes(
            code as (typeof RBAC_PERMISSION_CODES)[number],
          ),
        );
        const permissions = await prisma.permission.findMany({
          where: { code: { in: permissionCodes } },
        });
        await prisma.rolePermission.deleteMany({
          where: { roleId: params.roleId },
        });
        if (permissions.length > 0) {
          await prisma.rolePermission.createMany({
            data: permissions.map((permission) => ({
              roleId: params.roleId,
              permissionId: permission.id,
            })),
          });
        }
      }

      const role = await prisma.role.update({
        where: { id: params.roleId },
        data: {
          name: body.name?.trim() || undefined,
          description:
            body.description !== undefined
              ? body.description.trim()
              : undefined,
        },
        include: {
          permissions: { include: { permission: { select: { code: true } } } },
          _count: { select: { users: true } },
        },
      });

      return serializeRole(prisma, role);
    },
  );

  app.post(
    '/v1/admin/users/:userId/assign-role',
    { schema: { tags: ['admin'], summary: 'Assign RBAC role to user' } },
    async (request, reply) => {
      const auth = await requireUser(request, reply, store);
      if (!requireAdminGate(auth, reply)) return;
      if (!(await requirePermission(auth, reply, prisma, 'role:assign'))) return;

      const params = request.params as { userId: string };
      if (!validateId(params.userId, reply, 'userId')) return;
      const body = request.body as { roleId?: string };
      if (!body.roleId || !validateId(body.roleId, reply, 'roleId')) return;

      const role = await prisma.role.findUnique({ where: { id: body.roleId } });
      if (!role) return reply.code(404).send(Errors.notFound('Role'));

      const updated = await prisma.user.update({
        where: { id: params.userId },
        data: {
          roleId: body.roleId,
          systemRole:
            role.name === 'admin' || role.name === 'super-admin'
              ? 'admin'
              : 'user',
        },
      }).catch(() => null);
      if (!updated) return reply.code(404).send(Errors.notFound('User'));

      await prisma.auditLog.create({
        data: {
          userId: auth!.user.id,
          action: 'user.roleAssigned',
          targetType: 'user',
          targetId: params.userId,
          payload: { roleId: body.roleId, roleName: role.name },
        },
      });

      return { ok: true, userId: params.userId, role: { name: role.name } };
    },
  );
}
