import type { Contest } from '@prisma/client';
import { effectiveDurationMinutes } from './contest-duration';

export type ContestListItem = {
  id: string;
  name: string;
  host: string;
  platformContestId: string;
  startsAt: string;
  endsAt: string;
  durationMinutes: number;
  url: string;
  phase: string;
  tags: string[];
  bookmarked: boolean;
  reminderSet: boolean;
};

export function toContestListItem(
  contest: Contest,
  bookmarkedIds: Set<string>,
  reminderIds: Set<string>,
): ContestListItem {
  return {
    id: contest.id,
    name: contest.name,
    host: contest.platform,
    platformContestId: contest.platformContestId,
    startsAt: contest.startsAt.toISOString(),
    endsAt: contest.endsAt.toISOString(),
    durationMinutes: effectiveDurationMinutes(
      contest.startsAt,
      contest.endsAt,
      contest.durationMinutes,
    ),
    url: contest.url,
    phase: contest.phase,
    tags: contest.tags,
    bookmarked: bookmarkedIds.has(contest.id),
    reminderSet: reminderIds.has(contest.id),
  };
}

export async function loadUserContestFlags(
  prisma: {
    contestBookmark: {
      findMany: (args: {
        where: { userId: string; contestId: { in: string[] } };
      }) => Promise<Array<{ contestId: string }>>;
    };
    contestReminder: {
      findMany: (args: {
        where: { userId: string; contestId: { in: string[] } };
      }) => Promise<Array<{ contestId: string }>>;
    };
  },
  userId: string,
  contestIds: string[],
): Promise<{ bookmarkedIds: Set<string>; reminderIds: Set<string> }> {
  if (contestIds.length === 0) {
    return { bookmarkedIds: new Set(), reminderIds: new Set() };
  }
  const [bookmarks, reminders] = await Promise.all([
    prisma.contestBookmark.findMany({
      where: { userId, contestId: { in: contestIds } },
    }),
    prisma.contestReminder.findMany({
      where: { userId, contestId: { in: contestIds } },
    }),
  ]);
  return {
    bookmarkedIds: new Set(bookmarks.map((b) => b.contestId)),
    reminderIds: new Set(reminders.map((r) => r.contestId)),
  };
}

export function buildContestListWhere(query: {
  upcoming?: string;
  active?: string;
  past?: string;
  host?: string;
  from?: string;
  to?: string;
}): { where: Record<string, unknown>; hasDateFilter: boolean } {
  const where: Record<string, unknown> = {};
  const now = new Date();
  let hasDateFilter = Boolean(
    query.upcoming || query.active || query.past || query.from || query.to,
  );

  if (query.upcoming === 'true') {
    where.startsAt = { gte: now };
  } else if (query.active === 'true') {
    where.startsAt = { lte: now };
    where.endsAt = { gte: now };
  } else if (query.past === 'true') {
    where.endsAt = { lt: now };
  }

  if (query.host) {
    where.platform = query.host;
  }

  if (query.from || query.to) {
    where.startsAt = {
      ...(typeof where.startsAt === 'object'
        ? (where.startsAt as Record<string, unknown>)
        : {}),
      ...(query.from ? { gte: new Date(query.from) } : {}),
      ...(query.to ? { lte: new Date(query.to) } : {}),
    };
    hasDateFilter = true;
  }

  return { where, hasDateFilter };
}
