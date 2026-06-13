import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { requireUser } from '../../lib/auth';
import { Errors } from '../../lib/errors';
import { validateId } from '../../lib/validate';
import { AppStore } from '../../store';
import {
  assertInstructorAccess,
  buildAtRiskStudents,
  buildCourseAssignmentMetrics,
  buildCourseMetrics,
  buildCourseSectionMetrics,
  buildCourseSummaries,
  buildEngagement,
  buildOverview,
  buildPlatformEngagementTrends,
  buildPlatformMetrics,
  buildStudentMetrics,
  buildStudentProgress,
  buildStudents,
  exportStudentsCsv,
  resolveDateRange,
  resolveManagedCourseIds,
  type AnalyticsQuery,
} from './aggregate';

export function registerAnalyticsRoutes(
  app: FastifyInstance,
  store: AppStore,
  prisma: PrismaClient,
): void {
  async function guardInstructor(
    request: import('fastify').FastifyRequest,
    reply: import('fastify').FastifyReply,
  ) {
    const auth = await requireUser(request, reply, store);
    if (!auth) return null;
    if (!assertInstructorAccess(auth)) {
      reply.code(403).send(Errors.forbidden());
      return null;
    }
    const courseIds = await resolveManagedCourseIds(auth, prisma);
    if (courseIds.length === 0 && auth.user.systemRole !== 'admin') {
      reply.code(403).send(Errors.forbidden());
      return null;
    }
    return { auth, courseIds };
  }

  async function resolveScopedRange(
    request: import('fastify').FastifyRequest,
    reply: import('fastify').FastifyReply,
    courseIds: string[],
  ) {
    const query = request.query as AnalyticsQuery;
    const resolved = await resolveDateRange(query, courseIds, prisma);
    if ('error' in resolved) {
      reply.code(400).send(resolved.error);
      return null;
    }
    return resolved;
  }

  app.get(
    '/v1/analytics/overview',
    { schema: { tags: ['analytics'], summary: 'Analytics overview' } },
    async (request, reply) => {
      const ctx = await guardInstructor(request, reply);
      if (!ctx) return;
      const resolved = await resolveScopedRange(request, reply, ctx.courseIds);
      if (!resolved) return;
      return buildOverview(prisma, resolved.courseIds, resolved.range);
    },
  );

  app.get(
    '/v1/analytics/courses',
    { schema: { tags: ['analytics'], summary: 'Course summaries' } },
    async (request, reply) => {
      const ctx = await guardInstructor(request, reply);
      if (!ctx) return;
      const resolved = await resolveScopedRange(request, reply, ctx.courseIds);
      if (!resolved) return;
      return buildCourseSummaries(prisma, resolved.courseIds, resolved.range);
    },
  );

  app.get(
    '/v1/analytics/engagement',
    { schema: { tags: ['analytics'], summary: 'Engagement analytics' } },
    async (request, reply) => {
      const ctx = await guardInstructor(request, reply);
      if (!ctx) return;
      const resolved = await resolveScopedRange(request, reply, ctx.courseIds);
      if (!resolved) return;
      return buildEngagement(prisma, resolved.courseIds, resolved.range);
    },
  );

  app.get(
    '/v1/analytics/students',
    { schema: { tags: ['analytics'], summary: 'Student analytics' } },
    async (request, reply) => {
      const ctx = await guardInstructor(request, reply);
      if (!ctx) return;
      const query = request.query as AnalyticsQuery;
      const resolved = await resolveScopedRange(request, reply, ctx.courseIds);
      if (!resolved) return;
      return buildStudents(prisma, resolved.courseIds, resolved.range, {
        cohort: query.cohort,
        risk: query.risk,
      });
    },
  );

  app.get(
    '/v1/analytics/students/at-risk',
    { schema: { tags: ['analytics'], summary: 'At-risk students' } },
    async (request, reply) => {
      const ctx = await guardInstructor(request, reply);
      if (!ctx) return;
      const resolved = await resolveScopedRange(request, reply, ctx.courseIds);
      if (!resolved) return;
      return buildAtRiskStudents(prisma, resolved.courseIds, resolved.range);
    },
  );

  app.get(
    '/v1/analytics/students/:studentId',
    { schema: { tags: ['analytics'], summary: 'Individual student metrics' } },
    async (request, reply) => {
      const ctx = await guardInstructor(request, reply);
      if (!ctx) return;
      const params = request.params as { studentId: string };
      if (!validateId(params.studentId, reply, 'studentId')) return;
      const resolved = await resolveScopedRange(request, reply, ctx.courseIds);
      if (!resolved) return;
      return buildStudentMetrics(
        prisma,
        params.studentId,
        resolved.courseIds,
        resolved.range,
      );
    },
  );

  app.get(
    '/v1/analytics/students/:studentId/progress',
    { schema: { tags: ['analytics'], summary: 'Student progress over time' } },
    async (request, reply) => {
      const ctx = await guardInstructor(request, reply);
      if (!ctx) return;
      const params = request.params as { studentId: string };
      if (!validateId(params.studentId, reply, 'studentId')) return;
      const resolved = await resolveScopedRange(request, reply, ctx.courseIds);
      if (!resolved) return;
      return buildStudentProgress(
        prisma,
        params.studentId,
        resolved.courseIds,
        resolved.range,
      );
    },
  );

  app.get(
    '/v1/analytics/courses/:courseId',
    { schema: { tags: ['analytics'], summary: 'Single course metrics' } },
    async (request, reply) => {
      const ctx = await guardInstructor(request, reply);
      if (!ctx) return;
      const params = request.params as { courseId: string };
      if (!validateId(params.courseId, reply, 'courseId')) return;
      if (
        !ctx.courseIds.includes(params.courseId) &&
        ctx.auth.user.systemRole !== 'admin'
      ) {
        return reply.code(403).send(Errors.forbidden());
      }
      const resolved = await resolveScopedRange(request, reply, [
        params.courseId,
      ]);
      if (!resolved) return;
      return buildCourseMetrics(prisma, params.courseId, resolved.range);
    },
  );

  app.get(
    '/v1/analytics/courses/:courseId/sections',
    {
      schema: {
        tags: ['analytics'],
        summary: 'Section-by-section video completion',
      },
    },
    async (request, reply) => {
      const ctx = await guardInstructor(request, reply);
      if (!ctx) return;
      const params = request.params as { courseId: string };
      if (!validateId(params.courseId, reply, 'courseId')) return;
      if (
        !ctx.courseIds.includes(params.courseId) &&
        ctx.auth.user.systemRole !== 'admin'
      ) {
        return reply.code(403).send(Errors.forbidden());
      }
      const sections = await buildCourseSectionMetrics(prisma, params.courseId);
      return { courseId: params.courseId, sections };
    },
  );

  app.get(
    '/v1/analytics/courses/:courseId/assignments',
    {
      schema: {
        tags: ['analytics'],
        summary: 'Per-assignment performance breakdown',
      },
    },
    async (request, reply) => {
      const ctx = await guardInstructor(request, reply);
      if (!ctx) return;
      const params = request.params as { courseId: string };
      if (!validateId(params.courseId, reply, 'courseId')) return;
      if (
        !ctx.courseIds.includes(params.courseId) &&
        ctx.auth.user.systemRole !== 'admin'
      ) {
        return reply.code(403).send(Errors.forbidden());
      }
      const assignments = await buildCourseAssignmentMetrics(
        prisma,
        params.courseId,
      );
      return { courseId: params.courseId, assignments };
    },
  );

  app.get(
    '/v1/analytics/platform',
    {
      schema: {
        tags: ['analytics'],
        summary: 'Platform-wide aggregate metrics',
      },
    },
    async (request, reply) => {
      const ctx = await guardInstructor(request, reply);
      if (!ctx) return;
      const resolved = await resolveScopedRange(request, reply, ctx.courseIds);
      if (!resolved) return;
      return buildPlatformMetrics(prisma, resolved.range);
    },
  );

  app.get(
    '/v1/analytics/platform/engagement',
    { schema: { tags: ['analytics'], summary: 'Platform engagement trends' } },
    async (request, reply) => {
      const ctx = await guardInstructor(request, reply);
      if (!ctx) return;
      const resolved = await resolveScopedRange(request, reply, ctx.courseIds);
      if (!resolved) return;
      return {
        series: await buildPlatformEngagementTrends(prisma, resolved.range),
      };
    },
  );

  app.get(
    '/v1/analytics/export/students',
    {
      schema: { tags: ['analytics'], summary: 'Export student analytics CSV' },
    },
    async (request, reply) => {
      const ctx = await guardInstructor(request, reply);
      if (!ctx) return;
      const query = request.query as AnalyticsQuery & { format?: string };
      if (query.format && query.format !== 'csv') {
        return reply
          .code(400)
          .send(Errors.validation('Only format=csv is supported'));
      }
      const resolved = await resolveScopedRange(request, reply, ctx.courseIds);
      if (!resolved) return;
      const csv = await exportStudentsCsv(
        prisma,
        resolved.courseIds,
        resolved.range,
      );
      reply.header('Content-Type', 'text/csv; charset=utf-8');
      reply.header(
        'Content-Disposition',
        'attachment; filename="students-analytics.csv"',
      );
      return csv;
    },
  );
}
