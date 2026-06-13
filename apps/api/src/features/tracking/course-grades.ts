import { FastifyInstance } from 'fastify';
import {
  CourseGradesRollupSchema,
  InstructorCourseGradesResponseSchema,
} from '@nibras/contracts';
import { PrismaClient } from '@prisma/client';
import { requireUser } from '../../lib/auth';
import { Errors } from '../../lib/errors';
import { requestBaseUrl } from '../../lib/request-base-url';
import { validateId } from '../../lib/validate';
import { AppStore } from '../../store';
import { canManageCourse, canViewCourseForRequest } from './policies/access';
import {
  buildInstructorGradesRollups,
  buildStudentGradesRollup,
  loadCourseGradeContext,
} from './grades-rollups';

export function registerCourseGradesRoutes(
  app: FastifyInstance,
  store: AppStore,
  prisma: PrismaClient,
): void {
  app.get(
    '/v1/tracking/courses/:courseId/grades/me',
    {
      schema: {
        tags: ['tracking'],
        summary: 'Student grades rollup for course',
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

      const rollup = await buildStudentGradesRollup(
        prisma,
        params.courseId,
        auth.user.id,
      );
      return CourseGradesRollupSchema.parse({
        courseId: params.courseId,
        ...rollup,
      });
    },
  );

  app.get(
    '/v1/tracking/courses/:courseId/grades',
    {
      schema: {
        tags: ['tracking'],
        summary: 'Instructor gradebook for all students in course',
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

      const members = await prisma.courseMembership.findMany({
        where: { courseId: params.courseId, role: 'student' },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              githubAccount: { select: { login: true } },
            },
          },
        },
        orderBy: { user: { username: 'asc' } },
      });

      const userIds = members.map((membership) => membership.userId);
      const { projects, latestByUserProject } = await loadCourseGradeContext(
        prisma,
        params.courseId,
        userIds,
      );
      const rollups = await buildInstructorGradesRollups(
        prisma,
        params.courseId,
        userIds,
        projects,
        latestByUserProject,
      );
      const rollupByUserId = new Map(
        rollups.map((entry) => [entry.userId, entry]),
      );

      const students = members.map((membership) => {
        const rollup = rollupByUserId.get(membership.userId) ?? {
          projects: [],
          assignments: [],
        };
        return {
          userId: membership.userId,
          username: membership.user.username,
          githubLogin: membership.user.githubAccount?.login ?? null,
          displayName: membership.user.displayName,
          projects: rollup.projects,
          assignments: rollup.assignments,
        };
      });

      return InstructorCourseGradesResponseSchema.parse({
        courseId: params.courseId,
        students,
      });
    },
  );
}
