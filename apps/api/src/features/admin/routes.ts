import { FastifyInstance } from 'fastify';
import { PrismaClient, Prisma, SystemRole } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { AppStore, SubmissionWorkflowStatus } from '../../store';
import { requireUser } from '../../lib/auth';
import { requestBaseUrl } from '../../lib/request-base-url';
import { Errors } from '../../lib/errors';
import { validateId, parseIntParam } from '../../lib/validate';
import { requirePermission } from '../../lib/rbac';
import {
  allocateUsername,
  hashPassword,
  isValidEmail,
} from '../admin-auth/helpers';
import {
  DEFAULT_PLATFORM_CONFIG,
  PLATFORM_CONFIG_FIELDS,
} from '../rbac/constants';
import {
  mergePlatformConfig,
  paginationMeta,
  parseBanDuration,
  serializeAuditLog,
} from './helpers';
import { invalidatePlatformConfigCache } from '../../lib/platform-config';
import { registerAdminRbacRoutes } from './rbac-routes';
import { registerAdminCourseRoutes } from './course-routes';
import { registerAdminBadgeRoutes } from './badge-routes';

const OVERRIDE_STATUSES: SubmissionWorkflowStatus[] = [
  'passed',
  'failed',
  'needs_review',
];

function requireAdmin(
  auth: Awaited<ReturnType<typeof requireUser>>,
  reply: Parameters<typeof requireUser>[1],
): auth is NonNullable<typeof auth> {
  if (!auth) return false;
  if (auth.user.systemRole !== 'admin') {
    reply.code(403).send(Errors.forbidden());
    return false;
  }
  return true;
}

export function registerAdminRoutes(
  app: FastifyInstance,
  store: AppStore,
  prisma?: PrismaClient,
): void {
  /**
   * GET /v1/admin/submissions
   * List all submissions with optional status/project filtering.
   * Admin only.
   */
  app.get(
    '/v1/admin/submissions',
    { schema: { tags: ['admin'], summary: 'List all submissions (admin)' } },
    async (request, reply) => {
      const auth = await requireUser(request, reply, store);
      if (!requireAdmin(auth, reply)) return;

      const query = request.query as {
        status?: SubmissionWorkflowStatus;
        projectId?: string;
      };
      const results = await store.listTrackingReviewQueue(
        requestBaseUrl(request),
        {
          status: query.status,
          projectId: query.projectId,
        },
      );
      return { submissions: results };
    },
  );

  /**
   * PATCH /v1/admin/submissions/:submissionId/status
   * Manually override the verification status of a submission.
   * Allowed statuses: passed, failed, needs_review.
   * Admin only.
   */
  app.patch(
    '/v1/admin/submissions/:submissionId/status',
    {
      schema: {
        tags: ['admin'],
        summary: 'Override submission verification status',
      },
    },
    async (request, reply) => {
      const auth = await requireUser(request, reply, store);
      if (!requireAdmin(auth, reply)) return;

      const params = request.params as { submissionId: string };
      if (!validateId(params.submissionId, reply, 'submissionId')) return;
      const body = request.body as { status?: string; summary?: string };

      if (
        !body.status ||
        !OVERRIDE_STATUSES.includes(body.status as SubmissionWorkflowStatus)
      ) {
        return reply
          .code(400)
          .send(
            Errors.validation(
              `status must be one of: ${OVERRIDE_STATUSES.join(', ')}`,
            ),
          );
      }

      const submission = await store.getSubmissionForAdmin(
        requestBaseUrl(request),
        params.submissionId,
      );
      if (!submission) {
        return reply.code(404).send(Errors.notFound('Submission'));
      }

      const summary =
        body.summary ||
        (body.status === 'passed'
          ? 'Manually marked as passed by admin.'
          : body.status === 'needs_review'
            ? 'Manually flagged for review by admin.'
            : 'Manually marked as failed by admin.');

      const updated = await store.overrideSubmissionStatus(
        requestBaseUrl(request),
        params.submissionId,
        body.status as SubmissionWorkflowStatus,
        summary,
        auth.user.id,
      );
      if (!updated) {
        return reply.code(404).send(Errors.notFound('Submission'));
      }

      return {
        ok: true,
        submissionId: params.submissionId,
        status: updated.status,
        summary: updated.summary,
      };
    },
  );

  app.get(
    '/v1/admin/submissions/:submissionId/logs',
    {
      schema: { tags: ['admin'], summary: 'Get submission verification logs' },
    },
    async (request, reply) => {
      const auth = await requireUser(request, reply, store);
      if (!requireAdmin(auth, reply)) return;

      const params = request.params as { submissionId: string };
      if (!validateId(params.submissionId, reply, 'submissionId')) return;
      const submission = await store.getSubmissionForAdmin(
        requestBaseUrl(request),
        params.submissionId,
      );
      if (!submission) {
        return reply.code(404).send(Errors.notFound('Submission'));
      }

      const logs = await store.listSubmissionVerificationLogs(
        requestBaseUrl(request),
        params.submissionId,
      );
      return { submissionId: params.submissionId, logs };
    },
  );

  /**
   * POST /v1/admin/submissions/:submissionId/retry
   * Re-queue a submission for verification. Admin only.
   */
  app.post(
    '/v1/admin/submissions/:submissionId/retry',
    {
      schema: {
        tags: ['admin'],
        summary: 'Re-queue submission for verification',
      },
    },
    async (request, reply) => {
      const auth = await requireUser(request, reply, store);
      if (!requireAdmin(auth, reply)) return;

      const params = request.params as { submissionId: string };
      if (!validateId(params.submissionId, reply, 'submissionId')) return;
      const submission = await store.getSubmissionForAdmin(
        requestBaseUrl(request),
        params.submissionId,
      );
      if (!submission) {
        return reply.code(404).send(Errors.notFound('Submission'));
      }

      const updated = await store.overrideSubmissionStatus(
        requestBaseUrl(request),
        params.submissionId,
        'queued',
        'Manually re-queued by admin.',
        auth!.user.id,
      );
      if (!updated) {
        return reply.code(404).send(Errors.notFound('Submission'));
      }

      return { ok: true, submissionId: params.submissionId, status: 'queued' };
    },
  );

  /**
   * GET /v1/admin/projects
   * List all projects across all courses. Admin only.
   */
  app.get(
    '/v1/admin/projects',
    {
      schema: {
        tags: ['admin'],
        summary: 'List all projects across all courses',
      },
    },
    async (request, reply) => {
      const auth = await requireUser(request, reply, store);
      if (!requireAdmin(auth, reply)) return;

      const courses = await store.listTrackingCourses(
        requestBaseUrl(request),
        auth!.user.id,
      );
      const projectsByCourse = await Promise.all(
        courses.map(async (course) => {
          const projects = await store.listTrackingProjects(
            requestBaseUrl(request),
            course.id,
          );
          return { course, projects };
        }),
      );
      return { courses: projectsByCourse };
    },
  );

  /**
   * GET /v1/admin/users
   * Paginated user list (Prisma) or legacy full list (FileStore).
   */
  app.get(
    '/v1/admin/users',
    { schema: { tags: ['admin'], summary: 'List users' } },
    async (request, reply) => {
      const auth = await requireUser(request, reply, store);
      if (!requireAdmin(auth, reply)) return;
      if (!prisma) {
        const users = await store.listUsers(requestBaseUrl(request));
        return {
          users,
          pagination: { page: 1, limit: users.length, total: users.length },
        };
      }
      const query = request.query as {
        page?: string;
        limit?: string;
        role?: string;
        status?: string;
        banned?: string;
        search?: string;
        institution?: string;
      };
      const page = parseIntParam(query.page, 1, { min: 1 });
      const limit = parseIntParam(query.limit, 20, { min: 1, max: 100 });
      const where: import('@prisma/client').Prisma.UserWhereInput = {};
      if (query.role === 'admin' || query.role === 'user') {
        where.systemRole = query.role;
      } else if (query.role?.trim()) {
        where.rbacRole = { name: query.role.trim() };
      }
      if (query.banned === 'true' || query.banned === '1') {
        where.bannedAt = { not: null };
      }
      if (query.status === 'banned') {
        where.bannedAt = { not: null };
      } else if (query.status === 'active') {
        where.bannedAt = null;
      }
      if (query.search?.trim()) {
        where.OR = [
          { username: { contains: query.search.trim(), mode: 'insensitive' } },
          { email: { contains: query.search.trim(), mode: 'insensitive' } },
          {
            displayName: {
              contains: query.search.trim(),
              mode: 'insensitive',
            },
          },
        ];
      }
      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
          select: {
            id: true,
            username: true,
            email: true,
            displayName: true,
            systemRole: true,
            yearLevel: true,
            bannedAt: true,
            banReason: true,
            banExpiresAt: true,
            createdAt: true,
            rbacRole: { select: { name: true } },
          },
        }),
        prisma.user.count({ where }),
      ]);

      const reputationRows = await prisma.reputationEvent.groupBy({
        by: ['userId'],
        where: { userId: { in: users.map((user) => user.id) } },
        _sum: { delta: true },
      });
      const reputationByUser = new Map(
        reputationRows.map((row) => [row.userId, row._sum.delta ?? 0]),
      );

      return {
        users: users.map((user) => ({
          id: user.id,
          _id: user.id,
          name: user.displayName || user.username,
          displayName: user.displayName,
          username: user.username,
          email: user.email,
          role: {
            name:
              user.rbacRole?.name ||
              (user.systemRole === 'admin' ? 'admin' : 'student'),
          },
          systemRole: user.systemRole,
          status: user.bannedAt ? 'banned' : 'active',
          institution: null,
          reputation: reputationByUser.get(user.id) ?? 0,
          points: reputationByUser.get(user.id) ?? 0,
          yearLevel: user.yearLevel,
          bannedAt: user.bannedAt?.toISOString() ?? null,
          banExpiresAt: user.banExpiresAt?.toISOString() ?? null,
          createdAt: user.createdAt.toISOString(),
        })),
        pagination: paginationMeta(page, limit, total),
      };
    },
  );

  /**
   * PATCH /v1/admin/users/:userId/role
   * Change a user's system role (user ↔ admin). Admin only.
   */
  app.patch(
    '/v1/admin/users/:userId/role',
    { schema: { tags: ['admin'], summary: 'Change user system role' } },
    async (request, reply) => {
      const auth = await requireUser(request, reply, store);
      if (!requireAdmin(auth, reply)) return;
      const params = request.params as { userId: string };
      if (!validateId(params.userId, reply, 'userId')) return;
      const body = request.body as { role?: string };
      if (!body.role || !['user', 'admin'].includes(body.role)) {
        return reply
          .code(400)
          .send(Errors.validation('role must be "user" or "admin"'));
      }
      const updated = await store.setUserSystemRole(
        requestBaseUrl(request),
        params.userId,
        body.role as 'user' | 'admin',
      );
      if (!updated) {
        return reply.code(404).send(Errors.notFound('User'));
      }
      return {
        ok: true,
        userId: params.userId,
        systemRole: updated.systemRole,
      };
    },
  );

  /**
   * DELETE /v1/admin/courses/:courseId
   * Permanently delete a course and all its data. Admin only.
   */
  app.delete(
    '/v1/admin/courses/:courseId',
    { schema: { tags: ['admin'], summary: 'Delete a course (admin)' } },
    async (request, reply) => {
      const auth = await requireUser(request, reply, store);
      if (!requireAdmin(auth, reply)) return;

      const params = request.params as { courseId: string };
      if (!validateId(params.courseId, reply, 'courseId')) return;

      const deleted = await store.deleteTrackingCourse(
        requestBaseUrl(request),
        params.courseId,
      );
      if (!deleted) {
        return reply.code(404).send(Errors.notFound('Course'));
      }
      return { ok: true, courseId: params.courseId };
    },
  );

  /**
   * GET /v1/admin/students
   * List all students with their global year level. Admin only.
   */
  app.get(
    '/v1/admin/students',
    { schema: { tags: ['admin'], summary: 'List students with year level' } },
    async (request, reply) => {
      const auth = await requireUser(request, reply, store);
      if (!requireAdmin(auth, reply)) return;
      const students = await store.listStudentsWithYearLevel(
        requestBaseUrl(request),
      );
      return { students };
    },
  );

  /**
   * PATCH /v1/admin/students/:userId/year
   * Set a student's global year level. Admin only.
   */
  app.patch(
    '/v1/admin/students/:userId/year',
    { schema: { tags: ['admin'], summary: 'Set student global year level' } },
    async (request, reply) => {
      const auth = await requireUser(request, reply, store);
      if (!requireAdmin(auth, reply)) return;

      const params = request.params as { userId: string };
      if (!validateId(params.userId, reply, 'userId')) return;
      const body = request.body as { yearLevel?: number };
      if (
        typeof body.yearLevel !== 'number' ||
        !Number.isInteger(body.yearLevel) ||
        body.yearLevel < 1 ||
        body.yearLevel > 4
      ) {
        return reply
          .code(400)
          .send(
            Errors.validation('yearLevel must be an integer between 1 and 4'),
          );
      }

      await store.syncStudentYearGlobal(
        requestBaseUrl(request),
        params.userId,
        body.yearLevel,
      );
      return { ok: true, userId: params.userId, yearLevel: body.yearLevel };
    },
  );

  /**
   * GET /v1/admin/audit-logs
   * List audit log entries with optional filtering. Admin only.
   */
  app.get(
    '/v1/admin/audit-logs',
    { schema: { tags: ['admin'], summary: 'List audit log entries (admin)' } },
    async (request, reply) => {
      const auth = await requireUser(request, reply, store);
      if (!requireAdmin(auth, reply)) return;
      if (prisma && !(await requirePermission(auth, reply, prisma, 'audit-log:read'))) {
        return;
      }

      const query = request.query as {
        targetType?: string;
        action?: string;
        courseId?: string;
        userId?: string;
        fromDate?: string;
        toDate?: string;
        from?: string;
        to?: string;
        search?: string;
        page?: string;
        limit?: string;
        offset?: string;
      };

      const page = parseIntParam(query.page, 1, { min: 1 });
      const limit = parseIntParam(query.limit, 20, { min: 1, max: 100 });
      const offset =
        query.offset != null
          ? parseIntParam(query.offset, 0, { min: 0 })
          : (page - 1) * limit;
      const fromDate = query.fromDate || query.from;
      const toDate = query.toDate || query.to;

      if (prisma) {
        const where: Prisma.AuditLogWhereInput = {};
        if (query.targetType) where.targetType = query.targetType;
        if (query.action) where.action = { contains: query.action, mode: 'insensitive' };
        if (query.courseId) where.courseId = query.courseId;
        if (query.userId) where.userId = query.userId;
        if (fromDate || toDate) {
          where.createdAt = {
            ...(fromDate ? { gte: new Date(fromDate) } : {}),
            ...(toDate ? { lte: new Date(`${toDate}T23:59:59.999Z`) } : {}),
          };
        }
        if (query.search?.trim()) {
          where.OR = [
            { action: { contains: query.search.trim(), mode: 'insensitive' } },
            { targetId: { contains: query.search.trim(), mode: 'insensitive' } },
            { targetType: { contains: query.search.trim(), mode: 'insensitive' } },
          ];
        }

        const [rows, total] = await Promise.all([
          prisma.auditLog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip: offset,
            take: limit,
            include: {
              user: {
                select: {
                  displayName: true,
                  username: true,
                  email: true,
                },
              },
            },
          }),
          prisma.auditLog.count({ where }),
        ]);

        return {
          logs: rows.map(serializeAuditLog),
          pagination: paginationMeta(page, limit, total),
          total,
          limit,
          offset,
        };
      }

      const filters = {
        targetType: query.targetType,
        action: query.action,
        courseId: query.courseId,
        userId: query.userId,
        fromDate,
        toDate,
      };

      const [logs, total] = await Promise.all([
        store.listAuditLogs(requestBaseUrl(request), filters, {
          limit,
          offset,
        }),
        store.countAuditLogs(requestBaseUrl(request), filters),
      ]);

      return {
        logs,
        pagination: paginationMeta(page, limit, total),
        total,
        limit,
        offset,
      };
    },
  );

  /**
   * POST /v1/admin/submissions/bulk-retry
   * Re-queue multiple submissions for verification. Admin only.
   */
  app.post(
    '/v1/admin/submissions/bulk-retry',
    {
      schema: {
        tags: ['admin'],
        summary: 'Bulk re-queue submissions for verification',
      },
    },
    async (request, reply) => {
      const auth = await requireUser(request, reply, store);
      if (!requireAdmin(auth, reply)) return;

      const body = request.body as { submissionIds?: unknown };
      if (
        !Array.isArray(body.submissionIds) ||
        body.submissionIds.length === 0
      ) {
        return reply
          .code(400)
          .send(Errors.validation('submissionIds must be a non-empty array'));
      }
      const ids = body.submissionIds as string[];
      if (ids.length > 100) {
        return reply
          .code(400)
          .send(Errors.validation('Maximum 100 submissions per bulk retry'));
      }

      const { enqueueVerificationJob } = await import('../../lib/queue');
      const results = await Promise.allSettled(
        ids.map(async (submissionId) => {
          const updated = await store.overrideSubmissionStatus(
            requestBaseUrl(request),
            submissionId,
            'queued',
            'Manually re-queued by admin (bulk).',
            auth!.user.id,
          );
          if (!updated) return { submissionId, ok: false };
          // Enqueue to BullMQ — no-op when Redis is not set
          await enqueueVerificationJob({
            jobId: submissionId,
            submissionAttemptId: submissionId,
            attempt: 0,
            maxAttempts: 3,
          }).catch(() => {
            /* ignore queue errors */
          });
          return { submissionId, ok: true };
        }),
      );

      const succeeded = results.filter((r) => r.status === 'fulfilled').length;
      return { ok: true, succeeded, total: ids.length };
    },
  );

  /**
   * POST /v1/admin/projects/:projectId/archive
   * Archive a project. Admin only.
   */
  app.post(
    '/v1/admin/projects/:projectId/archive',
    { schema: { tags: ['admin'], summary: 'Archive a project' } },
    async (request, reply) => {
      const auth = await requireUser(request, reply, store);
      if (!requireAdmin(auth, reply)) return;

      const params = request.params as { projectId: string };
      if (!validateId(params.projectId, reply, 'projectId')) return;
      const project = await store.getTrackingProjectById(
        requestBaseUrl(request),
        params.projectId,
      );
      if (!project) {
        return reply.code(404).send(Errors.notFound('Project'));
      }
      const updated = await store.setTrackingProjectStatus(
        requestBaseUrl(request),
        auth!.user.id,
        params.projectId,
        'archived',
      );
      return { ok: true, project: updated };
    },
  );

  if (prisma) {
    app.get(
      '/v1/admin/courses',
      {
        schema: {
          tags: ['admin'],
          summary: 'List courses with enrollment stats',
        },
      },
      async (request, reply) => {
        const auth = await requireUser(request, reply, store);
        if (!requireAdmin(auth, reply)) return;
        const query = request.query as {
          page?: string;
          limit?: string;
          includeArchived?: string;
        };
        const page = parseIntParam(query.page, 1, { min: 1 });
        const limit = parseIntParam(query.limit, 20, { min: 1, max: 100 });
        const includeArchived =
          query.includeArchived === 'true' || query.includeArchived === '1';
        const where = includeArchived ? {} : { deletedAt: null };
        const [courses, total] = await Promise.all([
          prisma.course.findMany({
            where,
            orderBy: { updatedAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
            include: {
              _count: {
                select: { memberships: { where: { role: 'student' } } },
              },
            },
          }),
          prisma.course.count({ where }),
        ]);
        return {
          courses: courses.map((course) => ({
            id: course.id,
            slug: course.slug,
            title: course.title,
            courseCode: course.courseCode,
            termLabel: course.termLabel,
            isActive: course.isActive,
            archivedAt: course.deletedAt?.toISOString() ?? null,
            enrollmentCount: course._count.memberships,
          })),
          pagination: { page, limit, total },
        };
      },
    );

    app.patch(
      '/v1/admin/users/:userId',
      {
        schema: {
          tags: ['admin'],
          summary: 'Update user profile/admin fields',
        },
      },
      async (request, reply) => {
        const auth = await requireUser(request, reply, store);
        if (!requireAdmin(auth, reply)) return;
        const params = request.params as { userId: string };
        if (!validateId(params.userId, reply, 'userId')) return;
        const body = request.body as {
          displayName?: string;
          yearLevel?: number;
          notificationEmail?: string | null;
          role?: string;
          status?: string;
          institution?: string;
        };

        const updateData: Prisma.UserUpdateInput = {
          displayName: body.displayName,
          yearLevel: body.yearLevel,
          notificationEmail: body.notificationEmail,
        };

        if (body.status === 'banned') {
          updateData.bannedAt = new Date();
          updateData.banReason = 'Updated by administrator';
        } else if (body.status === 'active') {
          updateData.bannedAt = null;
          updateData.banReason = null;
          updateData.banExpiresAt = null;
        }

        if (body.role?.trim()) {
          const role = await prisma.role.findFirst({
            where: { name: body.role.trim() },
          });
          if (role) {
            updateData.rbacRole = { connect: { id: role.id } };
            updateData.systemRole =
              role.name === 'admin' || role.name === 'super-admin'
                ? SystemRole.admin
                : SystemRole.user;
          }
        }

        const updated = await prisma.user
          .update({
            where: { id: params.userId },
            data: updateData,
          })
          .catch(() => null);
        if (!updated) return reply.code(404).send(Errors.notFound('User'));
        await prisma.auditLog.create({
          data: {
            userId: auth!.user.id,
            action: 'user.updated',
            targetType: 'user',
            targetId: params.userId,
            payload: body,
          },
        });
        return { ok: true, userId: params.userId };
      },
    );

    app.post(
      '/v1/admin/users/:userId/ban',
      { schema: { tags: ['admin'], summary: 'Ban a user' } },
      async (request, reply) => {
        const auth = await requireUser(request, reply, store);
        if (!requireAdmin(auth, reply)) return;
        const params = request.params as { userId: string };
        if (!validateId(params.userId, reply, 'userId')) return;
        const body = request.body as {
          reason?: string;
          expiresAt?: string;
          duration?: string;
        };
        const banExpiresAt = parseBanDuration(body.duration, body.expiresAt);
        const updated = await prisma.user
          .update({
            where: { id: params.userId },
            data: {
              bannedAt: new Date(),
              banReason: body.reason?.trim() || 'Banned by administrator',
              banExpiresAt,
            },
          })
          .catch(() => null);
        if (!updated) return reply.code(404).send(Errors.notFound('User'));
        await prisma.auditLog.create({
          data: {
            userId: auth!.user.id,
            action: 'user.banned',
            targetType: 'user',
            targetId: params.userId,
            payload: { reason: body.reason, expiresAt: body.expiresAt },
          },
        });
        return {
          ok: true,
          userId: params.userId,
          bannedAt: updated.bannedAt?.toISOString(),
        };
      },
    );

    app.get(
      '/v1/admin/config',
      { schema: { tags: ['admin'], summary: 'Get platform configuration' } },
      async (request, reply) => {
        const auth = await requireUser(request, reply, store);
        if (!requireAdmin(auth, reply)) return;
        if (!(await requirePermission(auth, reply, prisma, 'config:read'))) {
          return;
        }
        const row = await prisma.platformConfig.upsert({
          where: { id: 'default' },
          create: { id: 'default', configJson: DEFAULT_PLATFORM_CONFIG },
          update: {},
        });
        const config =
          row.configJson && typeof row.configJson === 'object'
            ? (row.configJson as Record<string, unknown>)
            : DEFAULT_PLATFORM_CONFIG;
        return {
          config,
          fieldMeta: PLATFORM_CONFIG_FIELDS,
          ...config,
          updatedAt: row.updatedAt.toISOString(),
        };
      },
    );

    app.patch(
      '/v1/admin/config',
      { schema: { tags: ['admin'], summary: 'Update platform configuration' } },
      async (request, reply) => {
        const auth = await requireUser(request, reply, store);
        if (!requireAdmin(auth, reply)) return;
        if (!(await requirePermission(auth, reply, prisma, 'config:update'))) {
          return;
        }
        const body = request.body as {
          config?: Record<string, unknown>;
          [key: string]: unknown;
        };
        const existing = await prisma.platformConfig.findUnique({
          where: { id: 'default' },
        });
        const current =
          existing?.configJson && typeof existing.configJson === 'object'
            ? (existing.configJson as Record<string, unknown>)
            : DEFAULT_PLATFORM_CONFIG;
        const patch =
          body.config && typeof body.config === 'object'
            ? body.config
            : Object.fromEntries(
                Object.entries(body).filter(([key]) => key !== 'config'),
              );
        const configJson = mergePlatformConfig(current, patch) as Prisma.InputJsonValue;
        const row = await prisma.platformConfig.upsert({
          where: { id: 'default' },
          create: { id: 'default', configJson },
          update: { configJson },
        });
        await prisma.auditLog.create({
          data: {
            userId: auth!.user.id,
            action: 'platform.configUpdated',
            targetType: 'platform',
            targetId: 'default',
            payload: configJson,
          },
        });
        invalidatePlatformConfigCache();
        return {
          ok: true,
          config: row.configJson,
          ...(typeof row.configJson === 'object' && row.configJson != null
            ? (row.configJson as Record<string, unknown>)
            : {}),
          updatedAt: row.updatedAt.toISOString(),
        };
      },
    );

    app.post(
      '/v1/admin/users/:userId/adjust-points',
      { schema: { tags: ['admin'], summary: 'Adjust user reputation points' } },
      async (request, reply) => {
        const auth = await requireUser(request, reply, store);
        if (!requireAdmin(auth, reply)) return;
        if (!(await requirePermission(auth, reply, prisma, 'user:adjust-points'))) {
          return;
        }

        const params = request.params as { userId: string };
        if (!validateId(params.userId, reply, 'userId')) return;
        const body = request.body as { amount?: number; reason?: string };
        const amount = Number(body.amount);
        if (!Number.isFinite(amount) || amount === 0) {
          return reply
            .code(400)
            .send(Errors.validation('amount must be a non-zero number'));
        }
        if (!body.reason?.trim()) {
          return reply.code(400).send(Errors.validation('reason is required'));
        }

        const user = await prisma.user.findUnique({ where: { id: params.userId } });
        if (!user) return reply.code(404).send(Errors.notFound('User'));

        const source = `admin:adjust:${Date.now()}:${randomUUID()}`;
        await prisma.reputationEvent.create({
          data: {
            userId: params.userId,
            delta: amount,
            reason: body.reason.trim(),
            source,
            category: 'community',
          },
        });

        await prisma.auditLog.create({
          data: {
            userId: auth!.user.id,
            action: 'user.pointsAdjusted',
            targetType: 'user',
            targetId: params.userId,
            payload: { amount, reason: body.reason.trim() },
          },
        });

        return { ok: true, userId: params.userId, amount };
      },
    );

    app.post(
      '/v1/admin/users/bulk-create',
      { schema: { tags: ['admin'], summary: 'Bulk create users from CSV import' } },
      async (request, reply) => {
        const auth = await requireUser(request, reply, store);
        if (!requireAdmin(auth, reply)) return;
        if (!(await requirePermission(auth, reply, prisma, 'user:bulk-create'))) {
          return;
        }

        const body = request.body as {
          users?: Array<{
            name?: string;
            email?: string;
            password?: string;
            role?: string;
            institution?: string;
          }>;
        };
        if (!Array.isArray(body.users) || body.users.length === 0) {
          return reply
            .code(400)
            .send(Errors.validation('users array is required'));
        }

        const studentRole = await prisma.role.findUnique({
          where: { name: 'student' },
        });
        const created: string[] = [];
        const errors: string[] = [];

        for (const entry of body.users) {
          const email = entry.email?.trim().toLowerCase();
          const name = entry.name?.trim();
          if (!email || !isValidEmail(email)) {
            errors.push(`Invalid email: ${entry.email || '(missing)'}`);
            continue;
          }

          const existing = await prisma.user.findUnique({ where: { email } });
          if (existing) {
            errors.push(`Email already exists: ${email}`);
            continue;
          }

          const roleName = entry.role?.trim().toLowerCase() || 'student';
          const role =
            (await prisma.role.findFirst({ where: { name: roleName } })) ||
            studentRole;

          const username = await allocateUsername(prisma, email, name);
          const password = entry.password || randomUUID().slice(0, 12);
          const hashed = await hashPassword(password);

          const user = await prisma.user.create({
            data: {
              email,
              username,
              displayName: name || username,
              emailVerified: true,
              systemRole:
                role?.name === 'admin' || role?.name === 'super-admin'
                  ? SystemRole.admin
                  : SystemRole.user,
              roleId: role?.id,
            },
          });

          await prisma.authAccount.create({
            data: {
              id: randomUUID(),
              userId: user.id,
              providerId: 'credential',
              accountId: user.id,
              password: hashed,
            },
          });

          created.push(user.id);
        }

        return reply.code(201).send({
          ok: true,
          created: created.length,
          userIds: created,
          errors,
        });
      },
    );

    registerAdminRbacRoutes(app, store, prisma);
    registerAdminCourseRoutes(app, store, prisma);
    registerAdminBadgeRoutes(app, store, prisma);
  }
}
