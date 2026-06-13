import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { requireUser } from '../../lib/auth';
import { AppStore } from '../../store';
import { GamificationService } from './service';

function parseLeaderboardPeriod(
  raw?: string,
): 'all' | 'month' | 'week' | 'today' {
  if (raw && ['all', 'month', 'week', 'today'].includes(raw)) {
    return raw as 'all' | 'month' | 'week' | 'today';
  }
  return 'week';
}

function parseLeaderboardScope(raw?: string): 'global' | 'course' | 'cohort' {
  if (raw && ['global', 'course', 'cohort'].includes(raw)) {
    return raw as 'global' | 'course' | 'cohort';
  }
  return 'global';
}

export function registerGamificationRoutes(
  app: FastifyInstance,
  store: AppStore,
  prisma: PrismaClient,
): void {
  const gamification = new GamificationService(prisma);

  app.get(
    '/v1/gamification/achievements-dashboard',
    {
      schema: {
        tags: ['gamification'],
        summary: 'Achievements page data (badges + reputation)',
      },
    },
    async (request, reply) => {
      const auth = await requireUser(request, reply, store);
      if (!auth) return;
      const query = request.query as { sync?: string };
      const forceSync = query.sync === 'true' || query.sync === '1';

      return gamification.getAchievementsDashboard(auth.user.id, {
        sync: forceSync,
      });
    },
  );

  app.get(
    '/v1/gamification/all-badges',
    { schema: { tags: ['gamification'], summary: 'List all badges' } },
    async (request, reply) => {
      const auth = await requireUser(request, reply, store);
      if (!auth) return;
      const badges = await gamification.listBadgesForUser(auth.user.id);
      return { badges };
    },
  );

  app.post(
    '/v1/gamification/check-award',
    { schema: { tags: ['gamification'], summary: 'Check and award badges' } },
    async (request, reply) => {
      const auth = await requireUser(request, reply, store);
      if (!auth) return;
      const awarded = await gamification.checkAndAwardBadges(auth.user.id);
      return { awarded };
    },
  );

  app.get(
    '/v1/gamification/leaderboards',
    { schema: { tags: ['gamification'], summary: 'Get leaderboard' } },
    async (request, reply) => {
      const auth = await requireUser(request, reply, store);
      if (!auth) return;
      const query = request.query as {
        period?: string;
        scope?: string;
        courseId?: string;
        page?: string;
        limit?: string;
      };
      const page = Math.max(1, parseInt(query.page || '1', 10) || 1);
      const limit = Math.min(
        100,
        Math.max(1, parseInt(query.limit || '25', 10) || 25),
      );
      const period = parseLeaderboardPeriod(query.period);
      const scope = parseLeaderboardScope(query.scope);

      try {
        return await gamification.getLeaderboard(auth.user.id, {
          period,
          scope,
          courseId: query.courseId,
          page,
          limit,
        });
      } catch (err) {
        const error = err as {
          statusCode?: number;
          code?: string;
          message?: string;
        };
        if (error.statusCode === 400) {
          return reply.status(400).send({
            code: error.code ?? 'BAD_REQUEST',
            message: error.message ?? 'Invalid leaderboard request',
          });
        }
        throw err;
      }
    },
  );

  app.get(
    '/v1/gamification/leaderboards/me',
    { schema: { tags: ['gamification'], summary: 'Get my leaderboard rank' } },
    async (request, reply) => {
      const auth = await requireUser(request, reply, store);
      if (!auth) return;
      const query = request.query as {
        period?: string;
        scope?: string;
        courseId?: string;
      };
      const period = parseLeaderboardPeriod(query.period);
      const scope = parseLeaderboardScope(query.scope);

      try {
        return await gamification.getMyLeaderboardRank(auth.user.id, {
          period,
          scope,
          courseId: query.courseId,
        });
      } catch (err) {
        const error = err as {
          statusCode?: number;
          code?: string;
          message?: string;
        };
        if (error.statusCode === 400) {
          return reply.status(400).send({
            code: error.code ?? 'BAD_REQUEST',
            message: error.message ?? 'Invalid leaderboard request',
          });
        }
        throw err;
      }
    },
  );

  app.get(
    '/v1/gamification/leaderboards/config',
    { schema: { tags: ['gamification'], summary: 'Get leaderboard config' } },
    async (request, reply) => {
      const auth = await requireUser(request, reply, store);
      if (!auth) return;
      const courses = await gamification.getLeaderboardCourses(auth.user.id);
      return {
        periods: [
          { value: 'all', label: 'All Time' },
          { value: 'month', label: 'This Month' },
          { value: 'week', label: 'This Week' },
          { value: 'today', label: 'Today' },
        ],
        scopes: [
          { value: 'global', label: 'Global' },
          { value: 'course', label: 'Course' },
          { value: 'cohort', label: 'Academic year' },
        ],
        courses,
      };
    },
  );
}
