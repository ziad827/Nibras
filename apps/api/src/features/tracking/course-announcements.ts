import { FastifyInstance } from 'fastify';
import {
  CourseAnnouncementSchema,
  CreateCourseAnnouncementRequestSchema,
  NOTIFICATION_EMAIL_PREF,
  UpdateCourseAnnouncementRequestSchema,
} from '@nibras/contracts';
import { PrismaClient } from '@prisma/client';
import { requireUser, AuthenticatedRequest } from '../../lib/auth';
import { Errors } from '../../lib/errors';
import { requestBaseUrl } from '../../lib/request-base-url';
import { validateId } from '../../lib/validate';
import { AppStore } from '../../store';
import { canManageCourse, canViewCourseForRequest } from './policies/access';

function githubAvatarUrl(
  login: string | null | undefined,
  size = 128,
): string | undefined {
  const trimmed = login?.trim();
  if (!trimmed) return undefined;
  const url = `https://avatars.githubusercontent.com/${encodeURIComponent(trimmed)}?s=${size}`;
  try {
    return new URL(url).toString();
  } catch {
    return undefined;
  }
}

function courseOverviewLink(courseSlug: string): string {
  const webBase =
    process.env.NIBRAS_WEB_BASE_URL ??
    process.env.NEXT_PUBLIC_NIBRAS_WEB_BASE_URL ??
    '';
  if (webBase) {
    return `${webBase.replace(/\/$/, '')}/Courses/Course%20Description/courseContent.html?course=${encodeURIComponent(courseSlug)}`;
  }
  return `/Courses/Course%20Description/courseContent.html?course=${encodeURIComponent(courseSlug)}`;
}

async function serializeAnnouncement(
  row: {
    id: string;
    courseId: string;
    title: string;
    body: string;
    publishedAt: Date;
    createdById: string;
    author: {
      id: string;
      displayName: string | null;
      githubAccount: { login: string } | null;
    };
  },
) {
  const githubLogin = row.author.githubAccount?.login ?? null;
  return CourseAnnouncementSchema.parse({
    id: row.id,
    courseId: row.courseId,
    title: row.title,
    body: row.body,
    publishedAt: row.publishedAt.toISOString(),
    createdById: row.createdById,
    author: {
      userId: row.author.id,
      displayName: row.author.displayName,
      avatarUrl: githubAvatarUrl(githubLogin),
    },
  });
}

async function notifyStudentsOfAnnouncement(
  store: AppStore,
  apiBaseUrl: string,
  prisma: PrismaClient,
  courseId: string,
  courseSlug: string,
  title: string,
  body: string,
): Promise<void> {
  const students = await prisma.courseMembership.findMany({
    where: { courseId, role: 'student' },
    select: { userId: true },
  });
  const link = courseOverviewLink(courseSlug);
  const preview =
    body.length > 120 ? `${body.slice(0, 120)}…` : body;
  await Promise.all(
    students.map((student) =>
      store.createNotification(apiBaseUrl, student.userId, {
        type: NOTIFICATION_EMAIL_PREF.COURSE_ANNOUNCEMENT,
        title: `New announcement: ${title}`,
        body: preview,
        link,
      }),
    ),
  );
}

function canEditAnnouncement(
  auth: AuthenticatedRequest,
  courseId: string,
  createdById: string,
): boolean {
  return canManageCourse(auth, courseId) || auth.user.id === createdById;
}

export function registerCourseAnnouncementRoutes(
  app: FastifyInstance,
  store: AppStore,
  prisma: PrismaClient,
): void {
  app.get(
    '/v1/tracking/courses/:courseId/announcements',
    {
      schema: {
        tags: ['tracking'],
        summary: 'List course announcements',
      },
    },
    async (request, reply) => {
      const auth = await requireUser(request, reply, store);
      if (!auth) return;
      const params = request.params as { courseId: string };
      if (!validateId(params.courseId, reply, 'courseId')) return;
      const apiBaseUrl = requestBaseUrl(request);
      if (
        !(await canViewCourseForRequest(
          store,
          apiBaseUrl,
          auth,
          params.courseId,
        ))
      ) {
        reply.code(403).send(Errors.forbidden());
        return;
      }

      const rows = await prisma.courseAnnouncement.findMany({
        where: { courseId: params.courseId },
        orderBy: { publishedAt: 'desc' },
        include: {
          author: {
            select: {
              id: true,
              displayName: true,
              githubAccount: { select: { login: true } },
            },
          },
        },
      });

      return Promise.all(rows.map((row) => serializeAnnouncement(row)));
    },
  );

  app.post(
    '/v1/tracking/courses/:courseId/announcements',
    {
      schema: {
        tags: ['tracking'],
        summary: 'Create a course announcement (instructor)',
      },
    },
    async (request, reply) => {
      const auth = await requireUser(request, reply, store);
      if (!auth) return;
      const params = request.params as { courseId: string };
      if (!validateId(params.courseId, reply, 'courseId')) return;
      if (!canManageCourse(auth, params.courseId)) {
        reply.code(403).send(Errors.forbidden());
        return;
      }
      const body = CreateCourseAnnouncementRequestSchema.parse(
        request.body ?? {},
      );
      const course = await prisma.course.findFirst({
        where: { id: params.courseId, deletedAt: null },
        select: { id: true, slug: true },
      });
      if (!course) {
        reply.code(404).send(Errors.notFound('Course'));
        return;
      }

      const row = await prisma.courseAnnouncement.create({
        data: {
          courseId: params.courseId,
          title: body.title,
          body: body.body,
          createdById: auth.user.id,
        },
        include: {
          author: {
            select: {
              id: true,
              displayName: true,
              githubAccount: { select: { login: true } },
            },
          },
        },
      });

      void notifyStudentsOfAnnouncement(
        store,
        requestBaseUrl(request),
        prisma,
        params.courseId,
        course.slug,
        body.title,
        body.body,
      ).catch(() => {
        /* notification errors are non-fatal */
      });

      reply.code(201);
      return serializeAnnouncement(row);
    },
  );

  app.patch(
    '/v1/tracking/courses/:courseId/announcements/:announcementId',
    {
      schema: {
        tags: ['tracking'],
        summary: 'Update a course announcement',
      },
    },
    async (request, reply) => {
      const auth = await requireUser(request, reply, store);
      if (!auth) return;
      const params = request.params as {
        courseId: string;
        announcementId: string;
      };
      if (!validateId(params.courseId, reply, 'courseId')) return;
      if (!validateId(params.announcementId, reply, 'announcementId')) return;

      const existing = await prisma.courseAnnouncement.findFirst({
        where: { id: params.announcementId, courseId: params.courseId },
      });
      if (!existing) {
        reply.code(404).send(Errors.notFound('Announcement'));
        return;
      }
      if (!canEditAnnouncement(auth, params.courseId, existing.createdById)) {
        reply.code(403).send(Errors.forbidden());
        return;
      }

      const body = UpdateCourseAnnouncementRequestSchema.parse(
        request.body ?? {},
      );
      const course = await prisma.course.findFirst({
        where: { id: params.courseId, deletedAt: null },
        select: { slug: true },
      });
      if (!course) {
        reply.code(404).send(Errors.notFound('Course'));
        return;
      }

      const row = await prisma.courseAnnouncement.update({
        where: { id: params.announcementId },
        data: {
          title: body.title,
          body: body.body,
          publishedAt: new Date(),
        },
        include: {
          author: {
            select: {
              id: true,
              displayName: true,
              githubAccount: { select: { login: true } },
            },
          },
        },
      });

      if (body.title || body.body) {
        void notifyStudentsOfAnnouncement(
          store,
          requestBaseUrl(request),
          prisma,
          params.courseId,
          course.slug,
          row.title,
          row.body,
        ).catch(() => {});
      }

      return serializeAnnouncement(row);
    },
  );

  app.delete(
    '/v1/tracking/courses/:courseId/announcements/:announcementId',
    {
      schema: {
        tags: ['tracking'],
        summary: 'Delete a course announcement',
      },
    },
    async (request, reply) => {
      const auth = await requireUser(request, reply, store);
      if (!auth) return;
      const params = request.params as {
        courseId: string;
        announcementId: string;
      };
      if (!validateId(params.courseId, reply, 'courseId')) return;
      if (!validateId(params.announcementId, reply, 'announcementId')) return;

      const existing = await prisma.courseAnnouncement.findFirst({
        where: { id: params.announcementId, courseId: params.courseId },
      });
      if (!existing) {
        reply.code(404).send(Errors.notFound('Announcement'));
        return;
      }
      if (!canEditAnnouncement(auth, params.courseId, existing.createdById)) {
        reply.code(403).send(Errors.forbidden());
        return;
      }

      await prisma.courseAnnouncement.delete({
        where: { id: params.announcementId },
      });
      return { ok: true };
    },
  );
}
