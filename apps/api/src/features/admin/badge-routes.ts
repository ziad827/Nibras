import { randomUUID } from 'node:crypto';
import { FastifyInstance } from 'fastify';
import {
  BadgeCategory,
  BadgeRarity,
  PrismaClient,
} from '@prisma/client';
import { AppStore } from '../../store';
import { requireUser } from '../../lib/auth';
import { Errors } from '../../lib/errors';
import { requirePermission } from '../../lib/rbac';
import { validateId } from '../../lib/validate';
import { slugify } from './helpers';

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

function serializeBadge(badge: {
  id: string;
  name: string;
  description: string;
  icon: string | null;
  iconUrl: string | null;
  color: string | null;
  criteria: string | null;
  category: BadgeCategory;
  points: number;
  _count?: { userBadges: number };
}) {
  return {
    id: badge.id,
    _id: badge.id,
    name: badge.name,
    description: badge.description,
    icon: badge.icon || badge.iconUrl || 'fa-medal',
    color: badge.color || '#6366f1',
    category: badge.category,
    criteria: badge.criteria || '',
    points: badge.points,
    awardCount: badge._count?.userBadges ?? 0,
  };
}

function mapCategory(value?: string): BadgeCategory {
  const allowed = Object.values(BadgeCategory);
  if (value && allowed.includes(value as BadgeCategory)) {
    return value as BadgeCategory;
  }
  return BadgeCategory.onboarding;
}

export function registerAdminBadgeRoutes(
  app: FastifyInstance,
  store: AppStore,
  prisma: PrismaClient,
): void {
  app.get(
    '/v1/admin/badges',
    { schema: { tags: ['admin'], summary: 'List badges (admin)' } },
    async (request, reply) => {
      const auth = await requireUser(request, reply, store);
      if (!requireAdminGate(auth, reply)) return;
      if (!(await requirePermission(auth, reply, prisma, 'badge:manage'))) {
        return;
      }

      const badges = await prisma.badgeDefinition.findMany({
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        include: { _count: { select: { userBadges: true } } },
      });

      return { badges: badges.map(serializeBadge) };
    },
  );

  app.post(
    '/v1/admin/badges',
    { schema: { tags: ['admin'], summary: 'Create badge (admin)' } },
    async (request, reply) => {
      const auth = await requireUser(request, reply, store);
      if (!requireAdminGate(auth, reply)) return;
      if (!(await requirePermission(auth, reply, prisma, 'badge:manage'))) {
        return;
      }

      const body = request.body as {
        name?: string;
        description?: string;
        icon?: string;
        color?: string;
        category?: string;
        criteria?: string;
        points?: number;
      };
      const name = body.name?.trim();
      if (!name) {
        return reply.code(400).send(Errors.validation('name is required'));
      }

      const codeBase = slugify(name);
      let code = codeBase;
      let suffix = 0;
      while (await prisma.badgeDefinition.findUnique({ where: { code } })) {
        suffix += 1;
        code = `${codeBase}-${suffix}`;
      }

      const badge = await prisma.badgeDefinition.create({
        data: {
          code,
          name,
          description: body.description?.trim() || '',
          icon: body.icon?.trim() || 'fa-star',
          iconUrl: body.icon?.trim() || null,
          color: body.color?.trim() || '#6366f1',
          criteria: body.criteria?.trim() || null,
          category: mapCategory(body.category),
          rarity: BadgeRarity.common,
          points: typeof body.points === 'number' ? body.points : 0,
        },
        include: { _count: { select: { userBadges: true } } },
      });

      return reply.code(201).send(serializeBadge(badge));
    },
  );

  app.patch(
    '/v1/admin/badges/:badgeId',
    { schema: { tags: ['admin'], summary: 'Update badge (admin)' } },
    async (request, reply) => {
      const auth = await requireUser(request, reply, store);
      if (!requireAdminGate(auth, reply)) return;
      if (!(await requirePermission(auth, reply, prisma, 'badge:manage'))) {
        return;
      }

      const params = request.params as { badgeId: string };
      if (!validateId(params.badgeId, reply, 'badgeId')) return;
      const body = request.body as {
        name?: string;
        description?: string;
        icon?: string;
        color?: string;
        category?: string;
        criteria?: string;
        points?: number;
      };

      const badge = await prisma.badgeDefinition
        .update({
          where: { id: params.badgeId },
          data: {
            name: body.name?.trim() || undefined,
            description:
              body.description !== undefined
                ? body.description.trim()
                : undefined,
            icon: body.icon?.trim() || undefined,
            iconUrl: body.icon?.trim() || undefined,
            color: body.color?.trim() || undefined,
            criteria:
              body.criteria !== undefined ? body.criteria.trim() : undefined,
            category: body.category ? mapCategory(body.category) : undefined,
            points: typeof body.points === 'number' ? body.points : undefined,
          },
          include: { _count: { select: { userBadges: true } } },
        })
        .catch(() => null);
      if (!badge) return reply.code(404).send(Errors.notFound('Badge'));

      return serializeBadge(badge);
    },
  );

  app.delete(
    '/v1/admin/badges/:badgeId',
    { schema: { tags: ['admin'], summary: 'Delete badge (admin)' } },
    async (request, reply) => {
      const auth = await requireUser(request, reply, store);
      if (!requireAdminGate(auth, reply)) return;
      if (!(await requirePermission(auth, reply, prisma, 'badge:manage'))) {
        return;
      }

      const params = request.params as { badgeId: string };
      if (!validateId(params.badgeId, reply, 'badgeId')) return;

      await prisma.badgeDefinition.delete({ where: { id: params.badgeId } }).catch(
        () => null,
      );

      return { ok: true };
    },
  );

  app.post(
    '/v1/admin/badges/:badgeId/award',
    { schema: { tags: ['admin'], summary: 'Manually award badge to user' } },
    async (request, reply) => {
      const auth = await requireUser(request, reply, store);
      if (!requireAdminGate(auth, reply)) return;
      if (!(await requirePermission(auth, reply, prisma, 'badge:manage'))) {
        return;
      }

      const params = request.params as { badgeId: string };
      if (!validateId(params.badgeId, reply, 'badgeId')) return;
      const body = request.body as {
        studentId?: string;
        email?: string;
        userId?: string;
      };

      const lookup = body.studentId || body.userId || body.email?.trim();
      if (!lookup) {
        return reply
          .code(400)
          .send(Errors.validation('studentId or email is required'));
      }

      const user = await prisma.user.findFirst({
        where: body.email
          ? { email: body.email.trim().toLowerCase() }
          : { id: lookup },
      });
      if (!user) return reply.code(404).send(Errors.notFound('User'));

      const badge = await prisma.badgeDefinition.findUnique({
        where: { id: params.badgeId },
      });
      if (!badge) return reply.code(404).send(Errors.notFound('Badge'));

      await prisma.userBadge.upsert({
        where: {
          userId_badgeId: { userId: user.id, badgeId: badge.id },
        },
        create: { userId: user.id, badgeId: badge.id },
        update: {},
      });

      if (badge.points > 0) {
        await prisma.reputationEvent.upsert({
          where: {
            userId_source: {
              userId: user.id,
              source: `badge:manual:${badge.id}`,
            },
          },
          create: {
            userId: user.id,
            delta: badge.points,
            reason: `Manual badge award: ${badge.name}`,
            source: `badge:manual:${badge.id}`,
            category: 'community',
          },
          update: {},
        });
      }

      return { ok: true, userId: user.id, badgeId: badge.id };
    },
  );
}
