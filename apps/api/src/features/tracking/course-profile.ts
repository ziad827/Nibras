import { FastifyInstance } from 'fastify';
import {
  CourseInstructorSummarySchema,
  CoursePrerequisitesSchema,
  TrackingCourseDetailSchema,
  UpdateCourseProfileRequestSchema,
} from '@nibras/contracts';
import { Prisma, PrismaClient } from '@prisma/client';
import { requireUser } from '../../lib/auth';
import { Errors } from '../../lib/errors';
import { requestBaseUrl } from '../../lib/request-base-url';
import { validateId } from '../../lib/validate';
import { AppStore } from '../../store';
import { canManageCourse, canViewCourseForRequest } from './policies/access';
import { parseReputationWeights } from '../reputation/reputation-weights';

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

function reputationWeightsForDetail(raw: Prisma.JsonValue | null | undefined) {
  const weights = parseReputationWeights(raw);
  return {
    submission: weights.submission,
    answerAccepted: weights.answerAccepted,
    problem: weights.problem,
    dailySolve: weights.dailySolve,
    dailyMiss: weights.dailyMiss,
    contest: weights.contest,
  };
}

async function buildCourseDetail(
  prisma: PrismaClient,
  courseId: string,
  userId: string,
) {
  const course = await prisma.course.findFirst({
    where: { id: courseId, deletedAt: null },
  });
  if (!course) return null;

  const [
    videoCount,
    assignmentCount,
    publishedAssignmentCount,
    projectCount,
    progressAgg,
    instructorMemberships,
    linkedCatalog,
  ] = await Promise.all([
    prisma.courseVideo.count({
      where: { section: { courseId } },
    }),
    prisma.courseAssignment.count({ where: { courseId } }),
    prisma.courseAssignment.count({ where: { courseId, published: true } }),
    prisma.project.count({ where: { courseId, deletedAt: null } }),
    prisma.videoProgress.aggregate({
      where: {
        userId,
        video: { section: { courseId } },
      },
      _avg: { watchedProgress: true },
      _count: { id: true },
    }),
    prisma.courseMembership.findMany({
      where: {
        courseId,
        role: { in: ['instructor', 'ta'] },
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            bio: true,
            githubAccount: { select: { login: true } },
          },
        },
      },
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
    }),
    prisma.catalogCourse.findFirst({
      where: { trackingCourseId: courseId },
      include: {
        prerequisites: {
          include: {
            prerequisiteCourse: {
              select: {
                id: true,
                subjectCode: true,
                catalogNumber: true,
                title: true,
                trackingCourseId: true,
              },
            },
          },
        },
      },
    }),
  ]);

  const videoProgressPercent =
    videoCount > 0 && progressAgg._count.id > 0
      ? Math.round((progressAgg._avg.watchedProgress ?? 0) * 100)
      : 0;

  const syllabus =
    (course.syllabusJson as Record<string, unknown> | null) ?? null;
  const prerequisiteNotes = Array.isArray(syllabus?.prerequisites)
    ? syllabus.prerequisites.filter(
        (entry): entry is string =>
          typeof entry === 'string' && entry.trim().length > 0,
      )
    : [];

  const instructors = instructorMemberships.map((membership) =>
    CourseInstructorSummarySchema.parse({
      userId: membership.user.id,
      displayName: membership.user.displayName,
      username: membership.user.username,
      githubLogin: membership.user.githubAccount?.login ?? null,
      avatarUrl: githubAvatarUrl(membership.user.githubAccount?.login),
      bio: membership.user.bio,
      role: membership.role,
    }),
  );

  const prerequisites = CoursePrerequisitesSchema.parse({
    courses: (linkedCatalog?.prerequisites ?? []).map((entry) => ({
      catalogCourseId: entry.prerequisiteCourse.id,
      subjectCode: entry.prerequisiteCourse.subjectCode,
      catalogNumber: entry.prerequisiteCourse.catalogNumber,
      title: entry.prerequisiteCourse.title,
      trackingCourseId: entry.prerequisiteCourse.trackingCourseId,
    })),
    notes: prerequisiteNotes,
  });

  return TrackingCourseDetailSchema.parse({
    id: course.id,
    slug: course.slug,
    title: course.title,
    termLabel: course.termLabel,
    courseCode: course.courseCode,
    isActive: course.isActive,
    isPublic: course.isPublic,
    description: course.description || undefined,
    thumbnailUrl: course.thumbnailUrl,
    syllabusJson: course.syllabusJson as Record<string, unknown> | null,
    sequentialVideos: course.sequentialVideos,
    reputationWeights: reputationWeightsForDetail(course.reputationWeights),
    videoProgressPercent,
    videoCount,
    assignmentCount,
    publishedAssignmentCount,
    projectCount,
    instructors,
    prerequisites,
  });
}

export function registerCourseProfileRoutes(
  app: FastifyInstance,
  store: AppStore,
  prisma: PrismaClient,
): void {
  app.get(
    '/v1/tracking/courses/:courseId/detail',
    {
      schema: {
        tags: ['tracking'],
        summary: 'Course detail with progress summary',
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
      const detail = await buildCourseDetail(
        prisma,
        params.courseId,
        auth.user.id,
      );
      if (!detail) {
        reply.code(404).send(Errors.notFound('Course'));
        return;
      }
      return detail;
    },
  );

  app.patch(
    '/v1/tracking/courses/:courseId/profile',
    {
      schema: {
        tags: ['tracking'],
        summary: 'Update course profile (instructor)',
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
      const body = UpdateCourseProfileRequestSchema.parse(request.body ?? {});
      const existing = await prisma.course.findFirst({
        where: { id: params.courseId, deletedAt: null },
      });
      if (!existing) {
        reply.code(404).send(Errors.notFound('Course'));
        return;
      }
      await prisma.course.update({
        where: { id: params.courseId },
        data: {
          title: body.title,
          termLabel: body.termLabel,
          courseCode: body.courseCode,
          description: body.description,
          thumbnailUrl: body.thumbnailUrl === null ? null : body.thumbnailUrl,
          syllabusJson:
            body.syllabusJson === null
              ? Prisma.JsonNull
              : body.syllabusJson === undefined
                ? undefined
                : (body.syllabusJson as Prisma.InputJsonValue),
          sequentialVideos: body.sequentialVideos,
          isPublic: body.isPublic,
          reputationWeights:
            body.reputationWeights === null
              ? Prisma.JsonNull
              : body.reputationWeights === undefined
                ? undefined
                : (body.reputationWeights as Prisma.InputJsonValue),
        },
      });
      const detail = await buildCourseDetail(
        prisma,
        params.courseId,
        auth.user.id,
      );
      return detail;
    },
  );
}
