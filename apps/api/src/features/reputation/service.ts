import {
  PrismaClient,
  ReputationCategory,
  SubmissionStatus,
} from '@prisma/client';
import { getReputationLevelLabel } from '@nibras/contracts';
import type { UserProfileViewerRole } from '@nibras/contracts';
import { computeLevel } from '../gamification/badges-catalog';
import { buildSyncReason, presentReputationHistory } from './history-labels';
import { syncLinkedAccountAura } from './linked-account-aura';
import { invalidateLeaderboardCache } from '../../lib/cache';
import {
  loadCourseReputationWeights,
  DEFAULT_REPUTATION_WEIGHTS,
} from './reputation-weights';

const REPUTATION_SYNC_INTERVAL_MS = 15 * 60 * 1000;

const BREAKDOWN_CATEGORY_LABELS: Record<ReputationCategory, string> = {
  course: 'Projects',
  community: 'Community',
  problem: 'Practice',
  contest: 'Competitions',
  badge: 'Badges',
};

export type ReputationBreakdownItem = {
  category: string;
  label: string;
  total: number;
  weeklyDelta: number;
};

export type ReputationEventDto = {
  id: string;
  delta: number;
  /** Primary line shown in Recent activity */
  reason: string;
  /** Optional context (project name, question title, etc.) */
  detail?: string;
  category?: string;
  categoryLabel?: string;
  createdAt: string;
};

export type MyReputationDto = {
  total: number;
  weeklyDelta: number;
  monthlyDelta: number;
  rank: number | null;
  percentile: number | null;
  levelLabel: string;
  breakdown: ReputationBreakdownItem[];
  history: ReputationEventDto[];
};

export type PublicReputationDto = {
  total: number;
  levelLabel: string;
  rank?: number | null;
  percentile?: number | null;
  breakdown?: ReputationBreakdownItem[];
  history?: ReputationEventDto[];
};

type PendingReputationEvent = {
  delta: number;
  reason: string;
  source: string;
  category: ReputationCategory;
  createdAt?: Date;
};

function startOfWeek(d: Date): Date {
  const copy = new Date(d);
  const day = copy.getUTCDay();
  const diff = day === 0 ? 6 : day - 1;
  copy.setUTCDate(copy.getUTCDate() - diff);
  copy.setUTCHours(0, 0, 0, 0);
  return copy;
}

function startOfMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

export class ReputationService {
  constructor(private readonly prisma: PrismaClient) {}

  async syncReputationFromActivity(
    userId: string,
    opts?: { force?: boolean },
  ): Promise<void> {
    if (!opts?.force) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { lastReputationSyncAt: true },
      });
      if (
        user?.lastReputationSyncAt &&
        Date.now() - user.lastReputationSyncAt.getTime() <
          REPUTATION_SYNC_INTERVAL_MS
      ) {
        return;
      }
    }

    const events: PendingReputationEvent[] = [];

    const passedSubmissions = await this.prisma.submissionAttempt.findMany({
      where: { userId, status: SubmissionStatus.passed },
      select: {
        id: true,
        submittedAt: true,
        createdAt: true,
        project: { select: { name: true, courseId: true } },
      },
    });
    const courseIds = [
      ...new Set(
        passedSubmissions
          .map((s) => s.project.courseId)
          .filter(
            (id): id is string => typeof id === 'string' && id.length > 0,
          ),
      ),
    ];
    const courseWeights = await loadCourseReputationWeights(
      this.prisma,
      courseIds,
    );
    for (const sub of passedSubmissions) {
      const courseId = sub.project.courseId;
      const weights =
        (courseId ? courseWeights.get(courseId) : undefined) ??
        DEFAULT_REPUTATION_WEIGHTS;
      events.push({
        delta: weights.submission,
        reason: buildSyncReason('submission', {
          projectName: sub.project.name,
        }),
        source: `submission:${sub.id}`,
        category: 'course',
        createdAt: sub.submittedAt ?? sub.createdAt,
      });
    }

    const acceptedAnswers = await this.prisma.communityAnswer.findMany({
      where: { authorId: userId, accepted: true },
      select: {
        id: true,
        createdAt: true,
        question: { select: { title: true } },
      },
    });
    for (const answer of acceptedAnswers) {
      events.push({
        delta: DEFAULT_REPUTATION_WEIGHTS.answerAccepted,
        reason: buildSyncReason('answer-accepted', {
          questionTitle: answer.question.title,
        }),
        source: `answer-accepted:${answer.id}`,
        category: 'community',
        createdAt: answer.createdAt,
      });
    }

    const solvedProblems = await this.prisma.userProblemProgress.findMany({
      where: { userId, solved: true },
      select: {
        problemId: true,
        solvedAt: true,
        createdAt: true,
        problem: { select: { title: true } },
      },
    });
    for (const p of solvedProblems) {
      events.push({
        delta: DEFAULT_REPUTATION_WEIGHTS.problem,
        reason: buildSyncReason('problem', { problemTitle: p.problem.title }),
        source: `problem:${p.problemId}`,
        category: 'problem',
        createdAt: p.solvedAt ?? p.createdAt,
      });
    }

    // Daily problem solves
    const dailySolves = await this.prisma.dailyProblemAssignment.findMany({
      where: { userId, solved: true },
      select: {
        id: true,
        solvedAt: true,
        createdAt: true,
        problem: { select: { title: true } },
      },
    });
    for (const ds of dailySolves) {
      events.push({
        delta: DEFAULT_REPUTATION_WEIGHTS.dailySolve,
        reason: buildSyncReason('daily-solve', {
          problemTitle: ds.problem.title,
        }),
        source: `daily-solve:${ds.id}`,
        category: 'problem',
        createdAt: ds.solvedAt ?? ds.createdAt,
      });
    }

    // Daily missed penalties
    const dailyMisses = await this.prisma.dailyProblemAssignment.findMany({
      where: { userId, missedAt: { not: null }, solved: false, skipped: false },
      select: { id: true, missedAt: true },
    });
    for (const dm of dailyMisses) {
      events.push({
        delta: DEFAULT_REPUTATION_WEIGHTS.dailyMiss,
        reason: buildSyncReason('daily-miss', {}),
        source: `daily-miss:${dm.id}`,
        category: 'problem',
        createdAt: dm.missedAt!,
      });
    }

    const contestParticipations =
      await this.prisma.userContestParticipation.findMany({
        where: { userId },
        select: {
          contestId: true,
          createdAt: true,
          contest: { select: { name: true } },
        },
      });
    for (const c of contestParticipations) {
      events.push({
        delta: DEFAULT_REPUTATION_WEIGHTS.contest,
        reason: buildSyncReason('contest', { contestName: c.contest.name }),
        source: `contest:${c.contestId}`,
        category: 'contest',
        createdAt: c.createdAt,
      });
    }

    const userBadges = await this.prisma.userBadge.findMany({
      where: { userId },
      include: { badge: true },
    });
    for (const ub of userBadges) {
      if (ub.badge.points > 0) {
        events.push({
          delta: ub.badge.points,
          reason: buildSyncReason('badge', { badgeName: ub.badge.name }),
          source: `badge:${ub.badge.code}`,
          category: 'badge',
          createdAt: ub.earnedAt,
        });
      }
    }

    const existing = await this.prisma.reputationEvent.findMany({
      where: { userId },
      select: { source: true },
    });
    const existingSources = new Set(existing.map((row) => row.source));

    const toCreate = events.filter(
      (event) => !existingSources.has(event.source),
    );
    if (toCreate.length > 0) {
      await this.prisma.reputationEvent.createMany({
        data: toCreate.map((event) => ({
          userId,
          delta: event.delta,
          reason: event.reason,
          source: event.source,
          category: event.category,
          createdAt: event.createdAt ?? new Date(),
        })),
        skipDuplicates: true,
      });
      void invalidateLeaderboardCache();
    }

    await syncLinkedAccountAura(this.prisma, userId);

    await this.prisma.user.update({
      where: { id: userId },
      data: { lastReputationSyncAt: new Date() },
    });
  }

  async getMyReputation(
    userId: string,
    opts?: { sync?: boolean },
  ): Promise<MyReputationDto> {
    if (opts?.sync) {
      await this.syncReputationFromActivity(userId, { force: true });
    }

    const now = new Date();
    const weekStart = startOfWeek(now);
    const monthStart = startOfMonth(now);

    const [historyEvents, weekEvents, monthEvents, totalAgg, rankInfo] =
      await Promise.all([
        this.prisma.reputationEvent.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: 50,
        }),
        this.prisma.reputationEvent.aggregate({
          where: { userId, createdAt: { gte: weekStart } },
          _sum: { delta: true },
        }),
        this.prisma.reputationEvent.aggregate({
          where: { userId, createdAt: { gte: monthStart } },
          _sum: { delta: true },
        }),
        this.prisma.reputationEvent.aggregate({
          where: { userId },
          _sum: { delta: true },
        }),
        this.computeRank(userId),
      ]);

    const fullTotal = totalAgg._sum.delta ?? 0;
    const weeklyDelta = weekEvents._sum.delta ?? 0;
    const monthlyDelta = monthEvents._sum.delta ?? 0;
    const { rank, percentile } = rankInfo;

    const history = await presentReputationHistory(this.prisma, historyEvents);
    const breakdown = await this.computeBreakdown(userId, weekStart);

    return {
      total: fullTotal,
      weeklyDelta,
      monthlyDelta,
      rank,
      percentile,
      levelLabel: getReputationLevelLabel(fullTotal),
      breakdown,
      history,
    };
  }

  async getUserReputation(
    targetUserId: string,
    viewerRole: UserProfileViewerRole,
  ): Promise<PublicReputationDto> {
    const dto = await this.getMyReputation(targetUserId, { sync: false });
    const detailed =
      viewerRole === 'self' ||
      viewerRole === 'admin' ||
      viewerRole === 'instructor';
    if (detailed) {
      return {
        total: dto.total,
        levelLabel: dto.levelLabel,
        rank: dto.rank,
        percentile: dto.percentile,
        breakdown: dto.breakdown,
        history: dto.history,
      };
    }
    return {
      total: dto.total,
      levelLabel: dto.levelLabel,
    };
  }

  private async computeBreakdown(
    userId: string,
    weekStart: Date,
  ): Promise<ReputationBreakdownItem[]> {
    const [totalGrouped, weekGrouped] = await Promise.all([
      this.prisma.reputationEvent.groupBy({
        by: ['category'],
        where: { userId },
        _sum: { delta: true },
      }),
      this.prisma.reputationEvent.groupBy({
        by: ['category'],
        where: { userId, createdAt: { gte: weekStart } },
        _sum: { delta: true },
      }),
    ]);
    const weekMap = new Map(
      weekGrouped.map((row) => [row.category, row._sum.delta ?? 0]),
    );
    return totalGrouped
      .map((row) => ({
        category: row.category,
        label: BREAKDOWN_CATEGORY_LABELS[row.category] ?? row.category,
        total: row._sum.delta ?? 0,
        weeklyDelta: weekMap.get(row.category) ?? 0,
      }))
      .filter((row) => row.total !== 0 || row.weeklyDelta !== 0)
      .sort((a, b) => b.total - a.total);
  }

  async getUserTotalScore(userId: string): Promise<number> {
    const agg = await this.prisma.reputationEvent.aggregate({
      where: { userId },
      _sum: { delta: true },
    });
    return agg._sum.delta ?? 0;
  }

  private async computeRank(
    userId: string,
  ): Promise<{ rank: number | null; percentile: number | null }> {
    const userAgg = await this.prisma.reputationEvent.aggregate({
      where: { userId },
      _sum: { delta: true },
    });
    const userTotal = userAgg._sum.delta ?? 0;
    if (userTotal <= 0) {
      return { rank: null, percentile: null };
    }

    const [higherRows, totalRows] = await Promise.all([
      this.prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*)::bigint AS count
        FROM (
          SELECT "userId"
          FROM "ReputationEvent"
          GROUP BY "userId"
          HAVING SUM(delta) > ${userTotal}
        ) AS ranked
      `,
      this.prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*)::bigint AS count
        FROM (
          SELECT "userId"
          FROM "ReputationEvent"
          GROUP BY "userId"
          HAVING SUM(delta) > 0
        ) AS ranked
      `,
    ]);

    const higherCount = Number(higherRows[0]?.count ?? 0);
    const totalCount = Number(totalRows[0]?.count ?? 0);
    const rank = higherCount + 1;
    const percentile =
      totalCount > 0
        ? Math.round(((totalCount - rank) / totalCount) * 100)
        : null;

    return { rank, percentile };
  }

  getLevelForScore(score: number): number {
    return computeLevel(score);
  }
}
