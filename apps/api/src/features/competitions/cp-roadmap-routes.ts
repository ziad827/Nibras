import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { optionalUser, requireUser } from '../../lib/auth';
import { AppStore } from '../../store';
import { resolveVerifiedHandle } from './practice/resolve-handle';
import {
  clearCpRoadmapManualProgress,
  createCpRoadmapSuggestion,
  fetchCpRoadmapOverview,
  fetchCpRoadmapTopic,
  getCpRoadmapProblemNote,
  listMyCpRoadmapSuggestions,
  setCpRoadmapProblemSolved,
  setCpRoadmapReviewAt,
  upsertCpRoadmapProblemNote,
} from './practice/cp-roadmap/cp-roadmap-client';
import { fetchCpRoadmapStats } from './practice/cp-roadmap/cp-roadmap-stats';

async function resolveRoadmapHandles(
  prisma: PrismaClient,
  userId: string | undefined,
  query: { cfHandle?: string; lcHandle?: string; atcoderHandle?: string },
) {
  const [cfHandle, lcHandle, atcoderHandle] = await Promise.all([
    resolveVerifiedHandle(prisma, 'codeforces', userId, query.cfHandle),
    resolveVerifiedHandle(prisma, 'leetcode', userId, query.lcHandle),
    resolveVerifiedHandle(prisma, 'atcoder', userId, query.atcoderHandle),
  ]);
  return { cfHandle, lcHandle, atcoderHandle };
}

export function registerCpRoadmapRoutes(
  app: FastifyInstance,
  store: AppStore,
  prisma: PrismaClient,
): void {
  app.get(
    '/v1/practice/cp-roadmap/roadmap',
    {
      schema: {
        tags: ['competitions'],
        summary: 'CP roadmap category tree with progress',
      },
    },
    async (request, reply) => {
      const user = await optionalUser(request, reply, store);
      const q = request.query as {
        cfHandle?: string;
        lcHandle?: string;
        atcoderHandle?: string;
      };
      const handles = await resolveRoadmapHandles(prisma, user?.id, q);
      return fetchCpRoadmapOverview(
        prisma,
        user?.id,
        handles.cfHandle,
        handles.lcHandle,
        handles.atcoderHandle,
      );
    },
  );

  app.get(
    '/v1/practice/cp-roadmap/topics/:topicId',
    {
      schema: {
        tags: ['competitions'],
        summary: 'CP roadmap topic detail with problems',
      },
    },
    async (request, reply) => {
      const user = await optionalUser(request, reply, store);
      const { topicId } = request.params as { topicId: string };
      const q = request.query as {
        cfHandle?: string;
        lcHandle?: string;
        atcoderHandle?: string;
      };
      const handles = await resolveRoadmapHandles(prisma, user?.id, q);
      const topic = await fetchCpRoadmapTopic(
        prisma,
        topicId,
        user?.id,
        handles.cfHandle,
        handles.lcHandle,
        handles.atcoderHandle,
      );
      if (!topic) {
        return reply.code(404).send({ error: 'Topic not found' });
      }
      return topic;
    },
  );

  app.get(
    '/v1/practice/cp-roadmap/stats',
    {
      schema: {
        tags: ['competitions'],
        summary: 'CP roadmap aggregate progress',
      },
    },
    async (request, reply) => {
      const user = await optionalUser(request, reply, store);
      const q = request.query as {
        cfHandle?: string;
        lcHandle?: string;
        atcoderHandle?: string;
      };
      const handles = await resolveRoadmapHandles(prisma, user?.id, q);
      return fetchCpRoadmapStats(
        prisma,
        user?.id,
        handles.cfHandle,
        handles.lcHandle,
        handles.atcoderHandle,
      );
    },
  );

  app.post(
    '/v1/practice/cp-roadmap/problems/:problemId/solved',
    {
      schema: {
        tags: ['competitions'],
        summary: 'Mark CP roadmap problem solved',
      },
    },
    async (request, reply) => {
      const auth = await requireUser(request, reply, store);
      if (!auth) return;

      const { problemId } = request.params as { problemId: string };
      const body = request.body as { solved?: boolean };

      try {
        await setCpRoadmapProblemSolved(
          prisma,
          auth.user.id,
          problemId,
          body.solved !== false,
        );
        return { ok: true };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to update progress';
        return reply.code(400).send({ error: message });
      }
    },
  );

  app.delete(
    '/v1/practice/cp-roadmap/problems/:problemId/solved',
    {
      schema: {
        tags: ['competitions'],
        summary: 'Clear manual CP roadmap progress',
      },
    },
    async (request, reply) => {
      const auth = await requireUser(request, reply, store);
      if (!auth) return;

      const { problemId } = request.params as { problemId: string };
      await clearCpRoadmapManualProgress(prisma, auth.user.id, problemId);
      return { ok: true };
    },
  );

  app.get(
    '/v1/practice/cp-roadmap/problems/:problemId/note',
    {
      schema: {
        tags: ['competitions'],
        summary: 'Get CP roadmap problem note',
      },
    },
    async (request, reply) => {
      const auth = await requireUser(request, reply, store);
      if (!auth) return;
      const { problemId } = request.params as { problemId: string };
      try {
        return await getCpRoadmapProblemNote(prisma, auth.user.id, problemId);
      } catch (err) {
        return reply
          .code(400)
          .send({ error: err instanceof Error ? err.message : 'Failed' });
      }
    },
  );

  app.patch(
    '/v1/practice/cp-roadmap/problems/:problemId/note',
    {
      schema: {
        tags: ['competitions'],
        summary: 'Save CP roadmap problem note',
      },
    },
    async (request, reply) => {
      const auth = await requireUser(request, reply, store);
      if (!auth) return;
      const { problemId } = request.params as { problemId: string };
      const body = request.body as { note?: string };
      if (typeof body.note !== 'string') {
        return reply.status(400).send({ error: 'note (string) is required' });
      }
      try {
        return await upsertCpRoadmapProblemNote(
          prisma,
          auth.user.id,
          problemId,
          body.note,
        );
      } catch (err) {
        return reply
          .code(400)
          .send({ error: err instanceof Error ? err.message : 'Failed' });
      }
    },
  );

  app.patch(
    '/v1/practice/cp-roadmap/problems/:problemId/review',
    {
      schema: {
        tags: ['competitions'],
        summary: 'Schedule CP roadmap problem review',
      },
    },
    async (request, reply) => {
      const auth = await requireUser(request, reply, store);
      if (!auth) return;
      const { problemId } = request.params as { problemId: string };
      const body = request.body as { reviewAt?: string | null };
      if (!('reviewAt' in body)) {
        return reply
          .status(400)
          .send({ error: 'reviewAt is required (ISO string or null)' });
      }
      try {
        return await setCpRoadmapReviewAt(
          prisma,
          auth.user.id,
          problemId,
          body.reviewAt ?? null,
        );
      } catch (err) {
        return reply
          .code(400)
          .send({ error: err instanceof Error ? err.message : 'Failed' });
      }
    },
  );

  app.post(
    '/v1/practice/cp-roadmap/suggestions',
    {
      schema: {
        tags: ['competitions'],
        summary: 'Suggest a CP roadmap problem',
      },
    },
    async (request, reply) => {
      const auth = await requireUser(request, reply, store);
      if (!auth) return;

      const body = request.body as {
        topicId?: string;
        title?: string;
        url?: string;
        notes?: string;
        difficulty?: number;
      };
      if (!body.topicId?.trim() || !body.title?.trim() || !body.url?.trim()) {
        return reply
          .code(400)
          .send({ error: 'topicId, title, and url are required' });
      }
      try {
        const suggestion = await createCpRoadmapSuggestion(
          prisma,
          auth.user.id,
          {
            topicId: body.topicId.trim(),
            title: body.title.trim(),
            url: body.url.trim(),
            notes: body.notes,
            difficulty: body.difficulty,
          },
        );
        return { suggestion };
      } catch (err) {
        return reply
          .code(400)
          .send({ error: err instanceof Error ? err.message : 'Failed' });
      }
    },
  );

  app.get(
    '/v1/practice/cp-roadmap/suggestions/mine',
    {
      schema: {
        tags: ['competitions'],
        summary: 'List my CP roadmap suggestions',
      },
    },
    async (request, reply) => {
      const auth = await requireUser(request, reply, store);
      if (!auth) return;
      const items = await listMyCpRoadmapSuggestions(prisma, auth.user.id);
      return { items };
    },
  );
}
