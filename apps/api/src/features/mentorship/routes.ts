import {
  MentorProfileStatus,
  type PrismaClient,
} from '@prisma/client';
import { FastifyInstance } from 'fastify';
import {
  CreateMentorshipRequestSchema,
  MentorProfileSchema,
  MentorSuggestionSchema,
  MentorshipRequestSchema,
  UpdateMentorProfileRequestSchema,
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

function serializeMentorSuggestion(
  profile: {
    userId: string;
    bio: string | null;
    expertise: string[];
    availability: string | null;
    user: { displayName: string | null; username: string; email: string };
  },
  score: number,
) {
  const name = profile.user.displayName || profile.user.username;
  return MentorSuggestionSchema.parse({
    _id: profile.userId,
    id: profile.userId,
    userId: profile.userId,
    mentorId: profile.userId,
    mentorName: name,
    name,
    role: 'Mentor',
    bio: profile.bio,
    expertise: profile.expertise,
    confidence: score,
    matchConfidence: score,
    score,
    availability: profile.availability,
    responseTime: profile.availability,
  });
}

export function registerMentorshipRoutes(
  app: FastifyInstance,
  store: AppStore,
  prisma: PrismaClient,
): void {
  app.get('/api/mentorship/suggestions/me', async (request, reply) => {
    const auth = await requireUser(request, reply, store);
    if (!auth) return;

    const query = request.query as { limit?: string };
    const limit = Math.min(
      50,
      Math.max(1, Number.parseInt(query.limit || '20', 10) || 20),
    );

    const mentors = await prisma.mentorProfile.findMany({
      where: {
        status: MentorProfileStatus.approved,
        userId: { not: auth.user.id },
      },
      include: {
        user: { select: { displayName: true, username: true, email: true } },
      },
      take: limit * 2,
    });

    const existing = await prisma.mentorshipRequest.findMany({
      where: { menteeId: auth.user.id },
      select: { mentorId: true },
    });
    const requested = new Set(existing.map((row: { mentorId: string }) => row.mentorId));

    const suggestions = mentors
      .filter((mentor: (typeof mentors)[number]) => !requested.has(mentor.userId))
      .map((mentor: (typeof mentors)[number], index: number) =>
        serializeMentorSuggestion(mentor, Math.max(55, 95 - index * 3)),
      )
      .slice(0, limit);

    return { suggestions };
  });

  app.put('/api/mentorship/profile/me', async (request, reply) => {
    const auth = await requireUser(request, reply, store);
    if (!auth) return;

    const body = UpdateMentorProfileRequestSchema.safeParse(request.body);
    if (!body.success) {
      return reply.code(400).send(Errors.validation(body.error.message));
    }

    const record = await prisma.mentorProfile.upsert({
      where: { userId: auth.user.id },
      create: {
        userId: auth.user.id,
        bio: body.data.bio ?? null,
        expertise: body.data.expertise ?? [],
        availability: body.data.availability ?? null,
        status: MentorProfileStatus.pending,
      },
      update: {
        bio: body.data.bio ?? undefined,
        expertise: body.data.expertise ?? undefined,
        availability: body.data.availability ?? undefined,
        status: MentorProfileStatus.pending,
      },
      include: {
        user: { select: { displayName: true, username: true, email: true } },
      },
    });

    return MentorProfileSchema.parse({
      userId: record.userId,
      bio: record.bio,
      expertise: record.expertise,
      availability: record.availability,
      status: record.status,
      userName: record.user.displayName || record.user.username,
      userEmail: record.user.email,
    });
  });

  app.post('/api/mentorship/request', async (request, reply) => {
    const auth = await requireUser(request, reply, store);
    if (!auth) return;

    const body = CreateMentorshipRequestSchema.safeParse(request.body);
    if (!body.success) {
      return reply.code(400).send(Errors.validation(body.error.message));
    }

    const mentor = await prisma.mentorProfile.findFirst({
      where: {
        userId: body.data.mentorId,
        status: MentorProfileStatus.approved,
      },
    });
    if (!mentor) {
      return reply.code(404).send(Errors.notFound('Mentor'));
    }

    const record = await prisma.mentorshipRequest.upsert({
      where: {
        menteeId_mentorId: {
          menteeId: auth.user.id,
          mentorId: body.data.mentorId,
        },
      },
      create: {
        menteeId: auth.user.id,
        mentorId: body.data.mentorId,
        message: body.data.message,
      },
      update: {
        message: body.data.message,
        status: 'pending',
      },
      include: {
        mentor: {
          select: { displayName: true, username: true },
        },
      },
    });

    return MentorshipRequestSchema.parse({
      id: record.id,
      mentorId: record.mentorId,
      mentorName:
        record.mentor.displayName || record.mentor.username || 'Mentor',
      message: record.message,
      status: record.status,
      createdAt: record.createdAt.toISOString(),
    });
  });

  app.get('/api/mentorship/requests/me', async (request, reply) => {
    const auth = await requireUser(request, reply, store);
    if (!auth) return;

    const rows = await prisma.mentorshipRequest.findMany({
      where: { menteeId: auth.user.id },
      include: {
        mentor: { select: { displayName: true, username: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      requests: rows.map((row: (typeof rows)[number]) =>
        MentorshipRequestSchema.parse({
          id: row.id,
          mentorId: row.mentorId,
          mentorName: row.mentor.displayName || row.mentor.username,
          message: row.message,
          status: row.status,
          createdAt: row.createdAt.toISOString(),
        }),
      ),
    };
  });

  app.get('/api/mentorship/admin/profiles', async (request, reply) => {
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
        ? (query.status as MentorProfileStatus)
        : undefined;

    const rows = await prisma.mentorProfile.findMany({
      where: status ? { status } : undefined,
      include: {
        user: { select: { displayName: true, username: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      profiles: rows.map((row: (typeof rows)[number]) =>
        MentorProfileSchema.parse({
          userId: row.userId,
          bio: row.bio,
          expertise: row.expertise,
          availability: row.availability,
          status: row.status,
          userName: row.user.displayName || row.user.username,
          userEmail: row.user.email,
        }),
      ),
    };
  });

  async function patchMentorStatus(
    userId: string,
    status: MentorProfileStatus,
  ) {
    return prisma.mentorProfile.update({
      where: { userId },
      data: { status },
    });
  }

  app.patch(
    '/api/mentorship/admin/profiles/:userId/approve',
    async (request, reply) => {
      const auth = await requireUser(request, reply, store);
      if (!requireAdminGate(auth, reply)) return;
      if (!(await requirePermission(auth, reply, prisma, 'user:update'))) {
        return;
      }
      const params = request.params as { userId: string };
      try {
        await patchMentorStatus(params.userId, MentorProfileStatus.approved);
      } catch {
        return reply.code(404).send(Errors.notFound('Mentor profile'));
      }
      return { ok: true, userId: params.userId, status: 'approved' };
    },
  );

  app.patch(
    '/api/mentorship/admin/profiles/:userId/reject',
    async (request, reply) => {
      const auth = await requireUser(request, reply, store);
      if (!requireAdminGate(auth, reply)) return;
      if (!(await requirePermission(auth, reply, prisma, 'user:update'))) {
        return;
      }
      const params = request.params as { userId: string };
      try {
        await patchMentorStatus(params.userId, MentorProfileStatus.rejected);
      } catch {
        return reply.code(404).send(Errors.notFound('Mentor profile'));
      }
      return { ok: true, userId: params.userId, status: 'rejected' };
    },
  );

  app.patch(
    '/api/mentorship/admin/profiles/:userId/availability',
    async (request, reply) => {
      const auth = await requireUser(request, reply, store);
      if (!auth) return;

      const params = request.params as { userId: string };
      const isSelf = auth.user.id === params.userId;
      if (!isSelf) {
        if (!requireAdminGate(auth, reply)) return;
        if (!(await requirePermission(auth, reply, prisma, 'user:update'))) {
          return;
        }
      }

      const body = request.body as { availability?: string };
      try {
        const updated = await prisma.mentorProfile.update({
          where: { userId: params.userId },
          data: { availability: body.availability ?? null },
          include: {
            user: { select: { displayName: true, username: true, email: true } },
          },
        });
        return MentorProfileSchema.parse({
          userId: updated.userId,
          bio: updated.bio,
          expertise: updated.expertise,
          availability: updated.availability,
          status: updated.status,
          userName: updated.user.displayName || updated.user.username,
          userEmail: updated.user.email,
        });
      } catch {
        return reply.code(404).send(Errors.notFound('Mentor profile'));
      }
    },
  );
}
