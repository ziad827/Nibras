import type { FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { Errors } from './errors';
import { getUserPermissionCodes } from '../features/rbac/seed';

type AuthContext = {
  user: { id: string; systemRole: string };
};

export async function userHasPermission(
  prisma: PrismaClient,
  userId: string,
  permission: string,
): Promise<boolean> {
  const permissions = await getUserPermissionCodes(prisma, userId);
  return permissions.includes(permission);
}

export async function requirePermission(
  auth: AuthContext | null,
  reply: FastifyReply,
  prisma: PrismaClient,
  permission: string,
): Promise<boolean> {
  if (!auth) return false;
  if (auth.user.systemRole === 'admin') {
    const allowed = await userHasPermission(prisma, auth.user.id, permission);
    if (!allowed) {
      reply.code(403).send(Errors.forbidden());
      return false;
    }
    return true;
  }
  reply.code(403).send(Errors.forbidden());
  return false;
}
