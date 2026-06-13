import type { LeaderboardFilters } from './service';

export function buildLeaderboardCacheKey(
  requesterId: string,
  period: string,
  scope: string,
  courseId: string,
  page: number,
  limit: number,
): string {
  return `nibras:leaderboard:${requesterId}:${period}:${scope}:${courseId}:${page}:${limit}`;
}

export function periodStart(period: LeaderboardFilters['period']): Date | null {
  const now = new Date();
  switch (period) {
    case 'today': {
      const d = new Date(now);
      d.setUTCHours(0, 0, 0, 0);
      return d;
    }
    case 'week': {
      const d = new Date(now);
      const day = d.getUTCDay();
      const diff = day === 0 ? 6 : day - 1;
      d.setUTCDate(d.getUTCDate() - diff);
      d.setUTCHours(0, 0, 0, 0);
      return d;
    }
    case 'month':
      return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    default:
      return null;
  }
}

/** Inclusive start, exclusive end for the period immediately before the current one. */
export function previousPeriodRange(
  period: LeaderboardFilters['period'],
): { start: Date; end: Date } | null {
  const currentStart = periodStart(period);
  if (!currentStart || period === 'all') return null;

  if (period === 'today') {
    const start = new Date(currentStart);
    start.setUTCDate(start.getUTCDate() - 1);
    return { start, end: currentStart };
  }

  if (period === 'week') {
    const start = new Date(currentStart);
    start.setUTCDate(start.getUTCDate() - 7);
    return { start, end: currentStart };
  }

  if (period === 'month') {
    const end = currentStart;
    const start = new Date(
      Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - 1, 1),
    );
    return { start, end };
  }

  return null;
}

/** Standard competition ranking: 1, 1, 3 for tied scores. */
export function assignCompetitionRanks<T extends { score: number }>(
  rows: T[],
  offset = 0,
): Array<T & { rank: number }> {
  const result: Array<T & { rank: number }> = [];
  let index = 0;
  while (index < rows.length) {
    const score = rows[index].score;
    let tieEnd = index;
    while (tieEnd + 1 < rows.length && rows[tieEnd + 1].score === score) {
      tieEnd += 1;
    }
    const rank = offset + index + 1;
    for (let i = index; i <= tieEnd; i++) {
      result.push({ ...rows[i], rank });
    }
    index = tieEnd + 1;
  }
  return result;
}
