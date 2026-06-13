import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { optionalUser, requireUser } from '../../lib/auth';
import { AppStore } from '../../store';
import { resolveVerifiedHandle } from './practice/resolve-handle';
import {
  fetchPracticeCfAnalytics,
  fetchPracticeCfProblems,
  fetchPracticeCfTags,
  fetchRandomUnsolvedCfProblem,
  fetchRecommendedCfProblems,
} from './practice/codeforces/codeforces-client';
import type {
  CfAnalyticsPayload,
  PracticeCfProblemsResponse,
} from './practice/codeforces/types';

async function resolveHandle(
  prisma: PrismaClient,
  userId: string | undefined,
  queryHandle?: string,
): Promise<string | undefined> {
  return resolveVerifiedHandle(prisma, 'codeforces', userId, queryHandle);
}

export function registerPracticeCodeforcesRoutes(
  app: FastifyInstance,
  store: AppStore,
  prisma: PrismaClient,
): void {
  app.get(
    '/v1/practice/codeforces/problems',
    {
      schema: {
        tags: ['competitions'],
        summary: 'Codeforces practice problems (DB-backed, paginated)',
      },
    },
    async (request, reply) => {
      const user = await optionalUser(request, reply, store);
      const q = request.query as {
        handle?: string;
        page?: string;
        limit?: string;
        q?: string;
        tag?: string;
        ratingMin?: string;
        ratingMax?: string;
        contestIdMin?: string;
        contestIdMax?: string;
        solved?: string;
        sort?: string;
      };

      try {
        const handle = await resolveHandle(prisma, user?.id, q.handle);
        const page = q.page ? parseInt(q.page, 10) : 1;
        const limit = q.limit ? parseInt(q.limit, 10) : 100;
        const ratingMin = q.ratingMin ? parseInt(q.ratingMin, 10) : undefined;
        const ratingMax = q.ratingMax ? parseInt(q.ratingMax, 10) : undefined;
        const contestIdMin = q.contestIdMin
          ? parseInt(q.contestIdMin, 10)
          : undefined;
        const contestIdMax = q.contestIdMax
          ? parseInt(q.contestIdMax, 10)
          : undefined;
        const solved =
          q.solved === 'true' || q.solved === 'false'
            ? (q.solved as 'true' | 'false')
            : undefined;
        const sort =
          q.sort === 'ratingAsc' ||
          q.sort === 'ratingDesc' ||
          q.sort === 'contestAsc' ||
          q.sort === 'contestDesc' ||
          q.sort === 'name'
            ? q.sort
            : undefined;

        const result = await fetchPracticeCfProblems(
          prisma,
          handle,
          {
            page: Number.isFinite(page) ? page : 1,
            limit: Number.isFinite(limit) ? limit : 100,
            q: q.q,
            tag: q.tag,
            ratingMin: Number.isFinite(ratingMin) ? ratingMin : undefined,
            ratingMax: Number.isFinite(ratingMax) ? ratingMax : undefined,
            contestIdMin: Number.isFinite(contestIdMin)
              ? contestIdMin
              : undefined,
            contestIdMax: Number.isFinite(contestIdMax)
              ? contestIdMax
              : undefined,
            solved,
            sort,
          },
          user?.id,
        );

        const body: PracticeCfProblemsResponse = {
          items: result.items,
          total: result.total,
          solvedCount: result.solvedCount,
          handle: handle ?? null,
          page: result.page,
          limit: result.limit,
        };
        return body;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return reply.status(502).send({ error: message });
      }
    },
  );

  app.get(
    '/v1/practice/codeforces/tags',
    {
      schema: {
        tags: ['competitions'],
        summary: 'Distinct Codeforces problem tags from DB',
      },
    },
    async (_request, reply) => {
      try {
        const tags = await fetchPracticeCfTags(prisma);
        return { tags };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return reply.status(502).send({ error: message });
      }
    },
  );

  app.get(
    '/v1/practice/codeforces/random',
    {
      schema: {
        tags: ['competitions'],
        summary: 'Random unsolved Codeforces problem for verified handle',
      },
    },
    async (request, reply) => {
      const auth = await requireUser(request, reply, store);
      if (!auth) return;

      const q = request.query as {
        ratingMin?: string;
        ratingMax?: string;
        tag?: string;
      };

      try {
        const handle = await resolveHandle(prisma, auth.user.id);
        if (!handle) {
          return reply
            .status(400)
            .send({ error: 'Link and verify your Codeforces account first.' });
        }

        const ratingMin = q.ratingMin ? parseInt(q.ratingMin, 10) : undefined;
        const ratingMax = q.ratingMax ? parseInt(q.ratingMax, 10) : undefined;

        const item = await fetchRandomUnsolvedCfProblem(prisma, handle, {
          ratingMin: Number.isFinite(ratingMin) ? ratingMin : undefined,
          ratingMax: Number.isFinite(ratingMax) ? ratingMax : undefined,
          tag: q.tag,
        });

        if (!item) {
          return reply
            .status(404)
            .send({ error: 'No unsolved problems match your filters.' });
        }

        return { item, handle };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return reply.status(502).send({ error: message });
      }
    },
  );

  app.get(
    '/v1/practice/codeforces/recommended',
    {
      schema: {
        tags: ['competitions'],
        summary: 'Unsolved problems near linked CF rating (±100)',
      },
    },
    async (request, reply) => {
      const auth = await requireUser(request, reply, store);
      if (!auth) return;

      try {
        const handle = await resolveHandle(prisma, auth.user.id);
        if (!handle) {
          return reply
            .status(400)
            .send({ error: 'Link and verify your Codeforces account first.' });
        }

        const account = await prisma.linkedAccount.findUnique({
          where: {
            userId_platform: { userId: auth.user.id, platform: 'codeforces' },
          },
        });

        const items = await fetchRecommendedCfProblems(
          prisma,
          handle,
          account?.platformRating ?? null,
        );
        return { items, handle, rating: account?.platformRating ?? null };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return reply.status(502).send({ error: message });
      }
    },
  );

  app.get(
    '/v1/practice/codeforces/analytics',
    {
      schema: {
        tags: ['competitions'],
        summary: 'Codeforces submission analytics for a handle',
      },
    },
    async (request, reply) => {
      const user = await optionalUser(request, reply, store);
      const query = request.query as { handle?: string };

      try {
        const handle = await resolveHandle(prisma, user?.id, query.handle);
        if (!handle?.trim()) {
          return reply.status(400).send({
            error:
              'Codeforces handle is required (link account or pass handle)',
          });
        }

        const body: CfAnalyticsPayload = await fetchPracticeCfAnalytics(handle);
        return { ...body, handle };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return reply.status(502).send({ error: message });
      }
    },
  );
}
