import { FastifyInstance } from 'fastify';
import { CourseRole, PrismaClient } from '@prisma/client';
import { AppStore } from '../../store';
import { requireUser } from '../../lib/auth';
import { Errors } from '../../lib/errors';
import { requirePermission } from '../../lib/rbac';
import { validateId, parseIntParam } from '../../lib/validate';
import {
  encodeSectionMeta,
  mapCourseStatus,
  serializeSection,
  uniqueCourseSlug,
} from './helpers';

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

function serializeCourse(course: {
  id: string;
  slug: string;
  title: string;
  courseCode: string;
  description: string;
  thumbnailUrl: string | null;
  termLabel: string;
  isActive: boolean;
  deletedAt: Date | null;
  sections?: Array<{ id: string; title: string; description: string | null }>;
  _count?: { memberships: number };
}) {
  return {
    id: course.id,
    _id: course.id,
    slug: course.slug,
    title: course.title,
    name: course.title,
    code: course.courseCode,
    courseCode: course.courseCode,
    description: course.description,
    thumbnail: course.thumbnailUrl,
    thumbnailUrl: course.thumbnailUrl,
    termLabel: course.termLabel,
    status: mapCourseStatus(course),
    isActive: course.isActive,
    archivedAt: course.deletedAt?.toISOString() ?? null,
    enrollmentCount: course._count?.memberships ?? 0,
    sections: course.sections?.map(serializeSection) ?? [],
  };
}

export function registerAdminCourseRoutes(
  app: FastifyInstance,
  store: AppStore,
  prisma: PrismaClient,
): void {
  app.get(
    '/v1/admin/courses/:courseId',
    { schema: { tags: ['admin'], summary: 'Get course by id (admin)' } },
    async (request, reply) => {
      const auth = await requireUser(request, reply, store);
      if (!requireAdminGate(auth, reply)) return;
      if (!(await requirePermission(auth, reply, prisma, 'course:read'))) return;

      const params = request.params as { courseId: string };
      if (!validateId(params.courseId, reply, 'courseId')) return;

      const course = await prisma.course.findUnique({
        where: { id: params.courseId },
        include: {
          sections: { orderBy: { sortOrder: 'asc' } },
          _count: { select: { memberships: { where: { role: 'student' } } } },
        },
      });
      if (!course) return reply.code(404).send(Errors.notFound('Course'));

      return serializeCourse(course);
    },
  );

  app.post(
    '/v1/admin/courses',
    { schema: { tags: ['admin'], summary: 'Create course (admin)' } },
    async (request, reply) => {
      const auth = await requireUser(request, reply, store);
      if (!requireAdminGate(auth, reply)) return;
      if (!(await requirePermission(auth, reply, prisma, 'course:create'))) {
        return;
      }

      const body = request.body as {
        title?: string;
        code?: string;
        description?: string;
        level?: string;
        status?: string;
        thumbnail?: string;
        sections?: Array<{
          name?: string;
          capacity?: number;
          schedule?: string;
        }>;
      };

      const title = body.title?.trim();
      const code = body.code?.trim();
      if (!title || !code) {
        return reply
          .code(400)
          .send(Errors.validation('title and code are required'));
      }

      const slug = await uniqueCourseSlug(prisma, code);
      const isActive = body.status !== 'draft';

      const course = await prisma.course.create({
        data: {
          slug,
          title,
          courseCode: code,
          description: body.description?.trim() || '',
          termLabel: body.level?.trim() || 'General',
          thumbnailUrl: body.thumbnail?.trim() || null,
          isActive,
          sections: {
            create: (body.sections ?? [])
              .filter((section) => section.name?.trim())
              .map((section, index) => ({
                title: section.name!.trim(),
                description: encodeSectionMeta({
                  schedule: section.schedule,
                  capacity: section.capacity,
                }),
                sortOrder: index,
              })),
          },
        },
        include: {
          sections: { orderBy: { sortOrder: 'asc' } },
          _count: { select: { memberships: true } },
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: auth!.user.id,
          action: 'course.created',
          targetType: 'course',
          targetId: course.id,
          payload: { title, code },
        },
      });

      return reply.code(201).send(serializeCourse(course));
    },
  );

  app.patch(
    '/v1/admin/courses/:courseId',
    { schema: { tags: ['admin'], summary: 'Update course (admin)' } },
    async (request, reply) => {
      const auth = await requireUser(request, reply, store);
      if (!requireAdminGate(auth, reply)) return;
      if (!(await requirePermission(auth, reply, prisma, 'course:update'))) {
        return;
      }

      const params = request.params as { courseId: string };
      if (!validateId(params.courseId, reply, 'courseId')) return;
      const body = request.body as {
        title?: string;
        code?: string;
        description?: string;
        level?: string;
        status?: string;
        thumbnail?: string;
      };

      const status = body.status?.trim();
      const data: Record<string, unknown> = {};
      if (body.title?.trim()) data.title = body.title.trim();
      if (body.code?.trim()) data.courseCode = body.code.trim();
      if (body.description !== undefined) {
        data.description = body.description.trim();
      }
      if (body.level?.trim()) data.termLabel = body.level.trim();
      if (body.thumbnail !== undefined) {
        data.thumbnailUrl = body.thumbnail.trim() || null;
      }
      if (status === 'active') {
        data.isActive = true;
        data.deletedAt = null;
      } else if (status === 'draft') {
        data.isActive = false;
        data.deletedAt = null;
      } else if (status === 'archived') {
        data.isActive = false;
        data.deletedAt = new Date();
      }

      const course = await prisma.course
        .update({
          where: { id: params.courseId },
          data,
          include: {
            sections: { orderBy: { sortOrder: 'asc' } },
            _count: { select: { memberships: { where: { role: 'student' } } } },
          },
        })
        .catch(() => null);
      if (!course) return reply.code(404).send(Errors.notFound('Course'));

      return serializeCourse(course);
    },
  );

  app.post(
    '/v1/admin/courses/:courseId/sections',
    { schema: { tags: ['admin'], summary: 'Create course section (admin)' } },
    async (request, reply) => {
      const auth = await requireUser(request, reply, store);
      if (!requireAdminGate(auth, reply)) return;
      if (!(await requirePermission(auth, reply, prisma, 'section:create'))) {
        return;
      }

      const params = request.params as { courseId: string };
      if (!validateId(params.courseId, reply, 'courseId')) return;
      const body = request.body as {
        name?: string;
        capacity?: number;
        schedule?: string;
      };
      const name = body.name?.trim();
      if (!name) {
        return reply.code(400).send(Errors.validation('name is required'));
      }

      const course = await prisma.course.findUnique({
        where: { id: params.courseId },
        select: { id: true },
      });
      if (!course) return reply.code(404).send(Errors.notFound('Course'));

      const count = await prisma.courseSection.count({
        where: { courseId: params.courseId },
      });

      const section = await prisma.courseSection.create({
        data: {
          courseId: params.courseId,
          title: name,
          description: encodeSectionMeta({
            schedule: body.schedule,
            capacity: body.capacity,
          }),
          sortOrder: count,
        },
      });

      return {
        ok: true,
        id: section.id,
        sectionId: section.id,
        section: serializeSection(section),
      };
    },
  );

  app.patch(
    '/v1/admin/sections/:sectionId',
    { schema: { tags: ['admin'], summary: 'Update course section (admin)' } },
    async (request, reply) => {
      const auth = await requireUser(request, reply, store);
      if (!requireAdminGate(auth, reply)) return;
      if (!(await requirePermission(auth, reply, prisma, 'course:update'))) {
        return;
      }

      const params = request.params as { sectionId: string };
      if (!validateId(params.sectionId, reply, 'sectionId')) return;
      const body = request.body as {
        name?: string;
        capacity?: number;
        schedule?: string;
      };

      const section = await prisma.courseSection
        .update({
          where: { id: params.sectionId },
          data: {
            title: body.name?.trim() || undefined,
            description:
              body.schedule !== undefined || body.capacity !== undefined
                ? encodeSectionMeta({
                    schedule: body.schedule,
                    capacity: body.capacity,
                  })
                : undefined,
          },
        })
        .catch(() => null);
      if (!section) return reply.code(404).send(Errors.notFound('Section'));

      return { ok: true, section: serializeSection(section) };
    },
  );

  app.post(
    '/v1/admin/sections/:sectionId/enroll',
    { schema: { tags: ['admin'], summary: 'Enroll users in course section' } },
    async (request, reply) => {
      const auth = await requireUser(request, reply, store);
      if (!requireAdminGate(auth, reply)) return;
      if (!(await requirePermission(auth, reply, prisma, 'section:enroll'))) {
        return;
      }

      const params = request.params as { sectionId: string };
      if (!validateId(params.sectionId, reply, 'sectionId')) return;
      const body = request.body as {
        userIds?: string[];
        emails?: string[];
        students?: string[];
      };

      const section = await prisma.courseSection.findUnique({
        where: { id: params.sectionId },
        select: { courseId: true },
      });
      if (!section) return reply.code(404).send(Errors.notFound('Section'));

      const identifiers = [
        ...(body.userIds ?? []),
        ...(body.students ?? []),
        ...(body.emails ?? []),
      ].filter(Boolean);

      if (identifiers.length === 0) {
        return reply
          .code(400)
          .send(Errors.validation('userIds or emails are required'));
      }

      const users = await prisma.user.findMany({
        where: {
          OR: [
            { id: { in: identifiers } },
            { email: { in: identifiers.map((v) => v.toLowerCase()) } },
          ],
        },
        select: { id: true },
      });

      const enrolled = await Promise.all(
        users.map((user) =>
          prisma.courseMembership.upsert({
            where: {
              courseId_userId: {
                courseId: section.courseId,
                userId: user.id,
              },
            },
            create: {
              courseId: section.courseId,
              userId: user.id,
              role: CourseRole.student,
            },
            update: {},
          }),
        ),
      );

      return { ok: true, enrolled: enrolled.length };
    },
  );
}
