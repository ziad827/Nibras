import { Prisma, PrismaClient } from '@prisma/client';
import {
  BADGE_BY_CODE,
  BADGE_CATALOG,
  badgeSeedToDefinition,
  computeLevel,
  progressForMetric,
  type UserMetrics,
} from './badges-catalog';
import { ReputationService, type MyReputationDto } from '../reputation/service';
import {
  loadUserGamificationMetrics,
  incrementUserGamificationMetric,
} from './user-metrics';
import { traceDbOperation } from '../../lib/db-query-metrics';
import {
  cacheGetOrSet,
  invalidateLeaderboardCache,
  invalidateUserGamificationCache,
} from '../../lib/cache';
import {
  assignCompetitionRanks,
  buildLeaderboardCacheKey,
  periodStart,
  previousPeriodRange,
} from './leaderboard-utils';

export { buildLeaderboardCacheKey } from './leaderboard-utils';

export type AchievementsDashboardDto = {
  badges: BadgeDto[];
  reputation: MyReputationDto;
  newlyAwarded: BadgeDto[];
};

let catalogSynced = false;

export type BadgeDto = {
  id: string;
  code: string;
  name: string;
  description?: string;
  iconUrl?: string;
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
  category?: string;
  earnedAt?: string;
  progress?: number;
  threshold?: number;
};

export type LeaderboardEntryDto = {
  rank: number;
  userId: string;
  username: string;
  avatarUrl?: string;
  score: number;
  lifetimeScore?: number;
  delta?: number;
  badges?: number;
  level?: number;
};

export type LeaderboardFilters = {
  period?: 'all' | 'month' | 'week' | 'today';
  scope?: 'global' | 'course' | 'cohort';
  courseId?: string;
  page?: number;
  limit?: number;
};

function githubAvatarUrlForLogin(
  login: string | null | undefined,
  size = 64,
): string | undefined {
  const trimmed = login?.trim();
  if (!trimmed) return undefined;
  return `https://avatars.githubusercontent.com/${encodeURIComponent(trimmed)}?s=${size}`;
}

function progressForBadge(code: string, metrics: UserMetrics): number {
  const badge = BADGE_BY_CODE.get(code);
  if (!badge) return 0;
  return progressForMetric(badge.metric, metrics);
}

function isBadgeEarned(
  code: string,
  metrics: UserMetrics,
  threshold: number,
): boolean {
  return progressForBadge(code, metrics) >= threshold;
}

export class GamificationService {
  private readonly reputation: ReputationService;

  constructor(private readonly prisma: PrismaClient) {
    this.reputation = new ReputationService(prisma);
  }

  async ensureBadgeCatalog(): Promise<number> {
    if (catalogSynced) {
      const count = await this.prisma.badgeDefinition.count();
      if (count >= BADGE_CATALOG.length) {
        return count;
      }
    }

    await this.prisma.$transaction(
      BADGE_CATALOG.map((badge) => {
        const data = badgeSeedToDefinition(badge);
        return this.prisma.badgeDefinition.upsert({
          where: { code: badge.code },
          create: data,
          update: data,
        });
      }),
    );
    const count = await this.prisma.badgeDefinition.count();
    if (count >= BADGE_CATALOG.length) {
      catalogSynced = true;
    }
    return count;
  }

  /** Called from route startup hook after catalog sync. */
  markCatalogSynced(): void {
    catalogSynced = true;
  }

  private async getMetrics(
    userId: string,
    opts?: { force?: boolean },
  ): Promise<UserMetrics> {
    if (opts?.force) {
      return traceDbOperation('getMetrics', () =>
        loadUserGamificationMetrics(this.prisma, userId, opts),
      );
    }
    return traceDbOperation('getMetrics', () =>
      cacheGetOrSet(`nibras:gamification:metrics:${userId}`, 120, () =>
        loadUserGamificationMetrics(this.prisma, userId),
      ),
    );
  }

  private mapDefinitionsToBadges(
    definitions: Array<{
      id: string;
      code: string;
      name: string;
      description: string | null;
      iconUrl: string | null;
      rarity: BadgeDto['rarity'];
      category: string;
      threshold: number;
    }>,
    earned: Array<{ badgeId: string; earnedAt: Date }>,
    metrics: UserMetrics,
  ): BadgeDto[] {
    const earnedByBadgeId = new Map(earned.map((e) => [e.badgeId, e.earnedAt]));

    return definitions.map((def) => {
      const raw = progressForBadge(def.code, metrics);
      const capped = Math.min(raw, def.threshold);
      const earnedAt = earnedByBadgeId.get(def.id);
      return {
        id: def.id,
        code: def.code,
        name: def.name,
        description: def.description || undefined,
        iconUrl: def.iconUrl ?? undefined,
        rarity: def.rarity,
        category: def.category,
        earnedAt: earnedAt?.toISOString(),
        progress: earnedAt ? def.threshold : capped,
        threshold: def.threshold,
      };
    });
  }

  async listBadgesForUser(
    userId: string,
    opts?: { metrics?: UserMetrics; skipCatalog?: boolean },
  ): Promise<BadgeDto[]> {
    if (!opts?.skipCatalog) {
      await this.ensureBadgeCatalog();
    }

    const [definitions, earned, metrics] = await Promise.all([
      this.prisma.badgeDefinition.findMany({
        orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
      }),
      this.prisma.userBadge.findMany({ where: { userId } }),
      opts?.metrics ? Promise.resolve(opts.metrics) : this.getMetrics(userId),
    ]);

    return this.mapDefinitionsToBadges(definitions, earned, metrics);
  }

  async getAchievementsDashboard(
    userId: string,
    opts?: { sync?: boolean },
  ): Promise<AchievementsDashboardDto> {
    await this.ensureBadgeCatalog();
    if (opts?.sync === true) {
      await this.reputation.syncReputationFromActivity(userId, { force: true });
    }

    const metrics = await this.getMetrics(userId, {
      force: opts?.sync === true,
    });
    const definitions = await this.prisma.badgeDefinition.findMany({
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
    });

    const newlyAwarded = await this.checkAndAwardBadges(userId, {
      skipSync: true,
      metrics,
      definitions,
    });

    const [earnedRows, reputation] = await Promise.all([
      this.prisma.userBadge.findMany({ where: { userId } }),
      this.reputation.getMyReputation(userId, { sync: false }),
    ]);

    const badges = this.mapDefinitionsToBadges(
      definitions,
      earnedRows,
      metrics,
    );

    return { badges, reputation, newlyAwarded };
  }

  async checkAndAwardBadges(
    userId: string,
    opts?: {
      skipSync?: boolean;
      metrics?: UserMetrics;
      definitions?: Array<{
        id: string;
        code: string;
        name: string;
        description: string | null;
        iconUrl: string | null;
        rarity: BadgeDto['rarity'];
        category: string;
        threshold: number;
        points: number;
      }>;
    },
  ): Promise<BadgeDto[]> {
    if (!opts?.skipSync) {
      await this.ensureBadgeCatalog();
      await this.reputation.syncReputationFromActivity(userId, { force: true });
    }

    const definitions =
      opts?.definitions ??
      (await this.prisma.badgeDefinition.findMany({
        orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
      }));

    const newlyAwarded: BadgeDto[] = [];
    let currentMetrics = opts?.metrics ?? (await this.getMetrics(userId));
    let changed = true;

    while (changed) {
      changed = false;
      const existing = await this.prisma.userBadge.findMany({
        where: { userId },
        select: { badgeId: true },
      });
      const existingIds = new Set(existing.map((e) => e.badgeId));

      for (const def of definitions) {
        if (existingIds.has(def.id)) continue;
        if (!isBadgeEarned(def.code, currentMetrics, def.threshold)) continue;

        const earned = await this.prisma.userBadge.create({
          data: { userId, badgeId: def.id },
        });
        void incrementUserGamificationMetric(
          this.prisma,
          userId,
          'earnedBadges',
        );

        if (def.points > 0) {
          await this.prisma.reputationEvent.upsert({
            where: { userId_source: { userId, source: `badge:${def.code}` } },
            create: {
              userId,
              delta: def.points,
              reason: `Earned badge: ${def.name}`,
              source: `badge:${def.code}`,
              category: 'badge',
              createdAt: earned.earnedAt,
            },
            update: {},
          });
          void invalidateLeaderboardCache();
        }

        newlyAwarded.push({
          id: def.id,
          code: def.code,
          name: def.name,
          description: def.description || undefined,
          iconUrl: def.iconUrl ?? undefined,
          rarity: def.rarity,
          category: def.category,
          earnedAt: earned.earnedAt.toISOString(),
        });
        changed = true;
        const earnedCount =
          typeof currentMetrics.earnedBadges === 'number'
            ? currentMetrics.earnedBadges
            : 0;
        currentMetrics = {
          ...currentMetrics,
          earnedBadges: earnedCount + 1,
        };
      }
    }

    if (changed) {
      await invalidateUserGamificationCache(userId);
    }

    return newlyAwarded;
  }

  private async resolveScopeUserIds(
    userId: string,
    scope: LeaderboardFilters['scope'],
    courseId?: string,
  ): Promise<string[] | null> {
    if (scope === 'course') {
      if (!courseId) {
        throw Object.assign(
          new Error('courseId is required when scope is course'),
          {
            statusCode: 400,
            code: 'COURSE_ID_REQUIRED',
          },
        );
      }
      const membership = await this.prisma.courseMembership.findFirst({
        where: { userId, courseId },
        select: { courseId: true },
      });
      if (!membership) return [userId];
      const peers = await this.prisma.courseMembership.findMany({
        where: { courseId: membership.courseId },
        select: { userId: true },
        distinct: ['userId'],
      });
      return peers.map((p) => p.userId);
    }
    if (scope === 'cohort') {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { yearLevel: true },
      });
      const peers = await this.prisma.user.findMany({
        where: { yearLevel: user?.yearLevel ?? 1 },
        select: { id: true },
      });
      return peers.map((p) => p.id);
    }
    return null;
  }

  async getLeaderboard(
    requesterId: string,
    filters: LeaderboardFilters = {},
  ): Promise<{
    entries: LeaderboardEntryDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.min(100, Math.max(1, filters.limit ?? 25));
    const period = filters.period ?? 'week';
    const scope = filters.scope ?? 'global';
    const courseId = filters.courseId ?? '';
    const cacheKey = buildLeaderboardCacheKey(
      requesterId,
      period,
      scope,
      courseId,
      page,
      limit,
    );

    return cacheGetOrSet(cacheKey, 60, () =>
      this.fetchLeaderboardUncached(requesterId, {
        ...filters,
        page,
        limit,
        period,
        scope,
      }),
    );
  }

  private async sumReputationByUsers(
    userIds: string[],
    opts: {
      since?: Date | null;
      until?: Date;
      scopeUserIds?: string[] | null;
    },
  ): Promise<Map<string, number>> {
    if (userIds.length === 0) return new Map();

    const where: {
      userId: { in: string[] };
      createdAt?: { gte?: Date; lt?: Date };
    } = { userId: { in: userIds } };

    if (opts.since) {
      where.createdAt = { gte: opts.since };
      if (opts.until) {
        where.createdAt.lt = opts.until;
      }
    } else if (opts.until) {
      where.createdAt = { lt: opts.until };
    }

    const grouped = await this.prisma.reputationEvent.groupBy({
      by: ['userId'],
      where,
      _sum: { delta: true },
    });

    const map = new Map<string, number>();
    for (const row of grouped) {
      map.set(row.userId, row._sum.delta ?? 0);
    }
    return map;
  }

  private buildLeaderboardWhereSql(
    since: Date | null,
    scopeUserIds: string[] | null,
  ): Prisma.Sql {
    const parts: Prisma.Sql[] = [];
    if (since) parts.push(Prisma.sql`"createdAt" >= ${since}`);
    if (scopeUserIds)
      parts.push(Prisma.sql`"userId" IN (${Prisma.join(scopeUserIds)})`);
    if (parts.length === 0) return Prisma.sql``;
    return Prisma.sql`WHERE ${Prisma.join(parts, ' AND ')}`;
  }

  private async queryLeaderboardPage(
    since: Date | null,
    scopeUserIds: string[] | null,
    page: number,
    limit: number,
  ): Promise<{
    rows: Array<{ userId: string; score: number; rank: number }>;
    total: number;
  }> {
    const whereSql = this.buildLeaderboardWhereSql(since, scopeUserIds);
    const offset = (page - 1) * limit;

    const countRows = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count FROM (
        SELECT "userId"
        FROM "ReputationEvent"
        ${whereSql}
        GROUP BY "userId"
        HAVING SUM(delta) > 0
      ) AS ranked
    `;
    const total = Number(countRows[0]?.count ?? 0);

    const rows = await this.prisma.$queryRaw<
      Array<{ userId: string; score: number; rank: bigint }>
    >`
      SELECT "userId", score, rank FROM (
        SELECT "userId", SUM(delta)::int AS score,
          RANK() OVER (ORDER BY SUM(delta) DESC) AS rank
        FROM "ReputationEvent"
        ${whereSql}
        GROUP BY "userId"
        HAVING SUM(delta) > 0
      ) AS ranked
      ORDER BY score DESC, "userId" ASC
      LIMIT ${limit} OFFSET ${offset}
    `;

    return {
      rows: rows.map((row) => ({
        userId: row.userId,
        score: row.score,
        rank: Number(row.rank),
      })),
      total,
    };
  }

  private async fetchLeaderboardUncached(
    requesterId: string,
    filters: LeaderboardFilters & { page: number; limit: number },
  ): Promise<{
    entries: LeaderboardEntryDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = filters.page;
    const limit = filters.limit;
    const period = filters.period ?? 'week';
    const since = periodStart(period);
    const scopeUserIds = await this.resolveScopeUserIds(
      requesterId,
      filters.scope ?? 'global',
      filters.courseId,
    );

    const { rows: pageSlice, total } = await this.queryLeaderboardPage(
      since,
      scopeUserIds,
      page,
      limit,
    );
    const pageUserIds = pageSlice.map((r) => r.userId);

    const prevRange = previousPeriodRange(period);

    const [users, badgeCounts, lifetimeSums, prevSums] = await Promise.all([
      this.prisma.user.findMany({
        where: { id: { in: pageUserIds } },
        select: {
          id: true,
          username: true,
          githubAccount: { select: { login: true } },
        },
      }),
      this.prisma.userBadge.groupBy({
        by: ['userId'],
        where: { userId: { in: pageUserIds } },
        _count: { id: true },
      }),
      this.sumReputationByUsers(pageUserIds, {}),
      prevRange
        ? this.sumReputationByUsers(pageUserIds, {
            since: prevRange.start,
            until: prevRange.end,
          })
        : Promise.resolve(new Map<string, number>()),
    ]);

    const userMap = new Map(
      users.map((u) => [
        u.id,
        { username: u.username, login: u.githubAccount?.login ?? null },
      ]),
    );
    const badgeMap = new Map(badgeCounts.map((b) => [b.userId, b._count.id]));

    const entries: LeaderboardEntryDto[] = pageSlice.map((row) => {
      const user = userMap.get(row.userId);
      const lifetimeScore = lifetimeSums.get(row.userId) ?? 0;
      const prevScore = prevRange ? (prevSums.get(row.userId) ?? 0) : undefined;
      return {
        rank: row.rank,
        userId: row.userId,
        username: user?.username ?? 'unknown',
        avatarUrl: githubAvatarUrlForLogin(user?.login),
        score: row.score,
        lifetimeScore,
        delta: prevRange != null ? row.score - (prevScore ?? 0) : undefined,
        badges: badgeMap.get(row.userId) ?? 0,
        level: computeLevel(lifetimeScore),
      };
    });

    return { entries, total, page, limit };
  }

  async getMyLeaderboardRank(
    userId: string,
    filters: Omit<LeaderboardFilters, 'page' | 'limit'> = {},
  ): Promise<{
    rank: number | null;
    score: number;
    lifetimeScore: number;
    delta: number;
    level: number;
    badges: number;
  }> {
    const period = filters.period ?? 'week';
    const since = periodStart(period);
    const scopeUserIds = await this.resolveScopeUserIds(
      userId,
      filters.scope ?? 'global',
      filters.courseId,
    );

    const where: { createdAt?: { gte: Date }; userId?: { in: string[] } } = {};
    if (since) where.createdAt = { gte: since };
    if (scopeUserIds) where.userId = { in: scopeUserIds };

    const prevRange = previousPeriodRange(period);

    const [myAgg, grouped, badgeCount, lifetimeAgg, prevAgg] =
      await Promise.all([
        this.prisma.reputationEvent.aggregate({
          where: { ...where, userId },
          _sum: { delta: true },
        }),
        this.prisma.reputationEvent.groupBy({
          by: ['userId'],
          where,
          _sum: { delta: true },
          orderBy: { _sum: { delta: 'desc' } },
        }),
        this.prisma.userBadge.count({ where: { userId } }),
        this.prisma.reputationEvent.aggregate({
          where: { userId },
          _sum: { delta: true },
        }),
        prevRange
          ? this.prisma.reputationEvent.aggregate({
              where: {
                userId,
                createdAt: { gte: prevRange.start, lt: prevRange.end },
              },
              _sum: { delta: true },
            })
          : Promise.resolve({ _sum: { delta: 0 } }),
      ]);

    const score = myAgg._sum.delta ?? 0;
    const lifetimeScore = lifetimeAgg._sum.delta ?? 0;
    const prevScore = prevRange ? (prevAgg._sum.delta ?? 0) : 0;
    const scored = assignCompetitionRanks(
      grouped
        .map((g) => ({ userId: g.userId, score: g._sum.delta ?? 0 }))
        .filter((g) => g.score > 0),
    );
    const myRow = scored.find((s) => s.userId === userId);

    return {
      rank: myRow?.rank ?? null,
      score,
      lifetimeScore,
      delta: prevRange ? score - prevScore : 0,
      level: computeLevel(lifetimeScore),
      badges: badgeCount,
    };
  }

  async getLeaderboardCourses(
    userId: string,
  ): Promise<Array<{ id: string; name: string }>> {
    const memberships = await this.prisma.courseMembership.findMany({
      where: { userId },
      select: {
        course: { select: { id: true, title: true } },
      },
    });
    return memberships.map((m) => ({ id: m.course.id, name: m.course.title }));
  }
}
