import { type PrismaClient } from '@prisma/client';
import { FastifyInstance } from 'fastify';
import {
  CreateInstructorApplicationRequestSchema,
  InstructorApplicationMeResponseSchema,
  InstructorApplicationSchema,
} from '@nibras/contracts';
import { requireUser } from '../../lib/auth';
import { Errors } from '../../lib/errors';
import { requirePermission } from '../../lib/rbac';
import { AppStore } from '../../store';

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

export function registerInstructorApplicationRoutes(
  app: FastifyInstance,
  store: AppStore,
  prisma: PrismaClient,
): void {
  app.post('/api/instructor-applications', async (request, reply) => {
    const auth = await requireUser(request, reply, store);
    if (!auth) return;

    const body = CreateInstructorApplicationRequestSchema.safeParse(
      request.body,
    );
    if (!body.success) {
      return reply.code(400).send(Errors.validation(body.error.message));
    }

    const existing = await prisma.instructorApplication.findUnique({
      where: { userId: auth.user.id },
    });
    if (existing && existing.status === 'approved') {
      return reply.code(409).send({
        message: 'Your instructor application is already approved.',
      });
    }

    const record = existing
      ? await prisma.instructorApplication.update({
          where: { userId: auth.user.id },
          data: {
            department: body.data.department,
            status: 'pending',
            reviewedBy: null,
            reviewedAt: null,
          },
        })
      : await prisma.instructorApplication.create({
          data: {
            userId: auth.user.id,
            department: body.data.department,
          },
        });

    return InstructorApplicationSchema.parse({
      ...record,
      reviewedAt: record.reviewedAt?.toISOString() ?? null,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    });
  });

  app.get('/api/instructor-applications/me', async (request, reply) => {
    const auth = await requireUser(request, reply, store);
    if (!auth) return;

    const record = await prisma.instructorApplication.findUnique({
      where: { userId: auth.user.id },
    });
    if (!record) {
      return InstructorApplicationMeResponseSchema.parse({
        status: null,
        department: null,
        submittedAt: null,
      });
    }

    return InstructorApplicationMeResponseSchema.parse({
      status: record.status,
      department: record.department,
      submittedAt: record.createdAt.toISOString(),
    });
  });

  app.get(
    '/v1/admin/instructor-applications',
    { schema: { tags: ['admin'], summary: 'List instructor applications' } },
    async (request, reply) => {
      const auth = await requireUser(request, reply, store);
      if (!requireAdminGate(auth, reply)) return;
      if (!(await requirePermission(auth, reply, prisma, 'user:read'))) {
        return;
      }

      const query = request.query as { status?: string };
      const status =
        query.status === 'pending' ||
        query.status === 'approved' ||
        query.status === 'rejected'
          ? query.status
          : undefined;

      const rows = await prisma.instructorApplication.findMany({
        where: status ? { status } : undefined,
        include: {
          user: { select: { displayName: true, username: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      return rows.map((row: (typeof rows)[number]) =>
        InstructorApplicationSchema.parse({
          id: row.id,
          userId: row.userId,
          department: row.department,
          status: row.status,
          reviewedBy: row.reviewedBy,
          reviewedAt: row.reviewedAt?.toISOString() ?? null,
          createdAt: row.createdAt.toISOString(),
          updatedAt: row.updatedAt.toISOString(),
          userName: row.user.displayName || row.user.username,
          userEmail: row.user.email,
        }),
      );
    },
  );

  async function resolveInstructorRoleId(): Promise<string | null> {
    const role = await prisma.role.findFirst({
      where: { name: 'instructor' },
      select: { id: true },
    });
    return role?.id ?? null;
  }

  app.patch(
    '/v1/admin/instructor-applications/:id/approve',
    { schema: { tags: ['admin'], summary: 'Approve instructor application' } },
    async (request, reply) => {
      const auth = await requireUser(request, reply, store);
      if (!requireAdminGate(auth, reply)) return;
      if (!(await requirePermission(auth, reply, prisma, 'role:assign'))) {
        return;
      }

      const params = request.params as { id: string };
      const application = await prisma.instructorApplication.findUnique({
        where: { id: params.id },
      });
      if (!application) {
        return reply.code(404).send(Errors.notFound('Application'));
      }

      const roleId = await resolveInstructorRoleId();
      if (!roleId) {
        return reply
          .code(500)
          .send({ message: 'Instructor role is not configured.' });
      }

      await prisma.$transaction([
        prisma.instructorApplication.update({
          where: { id: application.id },
          data: {
            status: 'approved',
            reviewedBy: auth!.user.id,
            reviewedAt: new Date(),
          },
        }),
        prisma.user.update({
          where: { id: application.userId },
          data: { roleId },
        }),
      ]);

      return { ok: true, id: application.id, status: 'approved' };
    },
  );

  app.patch(
    '/v1/admin/instructor-applications/:id/reject',
    { schema: { tags: ['admin'], summary: 'Reject instructor application' } },
    async (request, reply) => {
      const auth = await requireUser(request, reply, store);
      if (!requireAdminGate(auth, reply)) return;
      if (!(await requirePermission(auth, reply, prisma, 'role:assign'))) {
        return;
      }

      const params = request.params as { id: string };
      const application = await prisma.instructorApplication.findUnique({
        where: { id: params.id },
      });
      if (!application) {
        return reply.code(404).send(Errors.notFound('Application'));
      }

      await prisma.instructorApplication.update({
        where: { id: application.id },
        data: {
          status: 'rejected',
          reviewedBy: auth!.user.id,
          reviewedAt: new Date(),
        },
      });

      return { ok: true, id: application.id, status: 'rejected' };
    },
  );
}
