import { CompPlatform, Prisma, PrismaClient } from '@prisma/client';
import { getCachedProblemset, getUserCfData, problemUrl } from './cf-api';
import {
  contestIdFromPlatformProblemId,
  parseCfPlatformProblemId,
} from './cf-problem-id';
import type { PracticeCfProblemRow, PracticeCfProblemsQuery } from './types';
import { processCfSubmissions } from './cf-analytics';
import type { CfAnalyticsPayload } from './types';

function buildWhere(
  query: PracticeCfProblemsQuery,
  solvedKeys: string[] | undefined,
): Prisma.ProblemWhereInput {
  const where: Prisma.ProblemWhereInput = {
    platform: 'codeforces' as CompPlatform,
  };

  if (query.q?.trim()) {
    where.title = { contains: query.q.trim(), mode: 'insensitive' };
  }
  if (query.ratingMin !== undefined || query.ratingMax !== undefined) {
    where.difficulty = {
      ...(query.ratingMin !== undefined ? { gte: query.ratingMin } : {}),
      ...(query.ratingMax !== undefined ? { lte: query.ratingMax } : {}),
    };
  }
  if (query.tag?.trim()) {
    where.tags = { has: query.tag.trim().toLowerCase() };
  }
  if (query.solved === 'true') {
    where.platformProblemId = {
      in: solvedKeys?.length ? solvedKeys : ['__none__'],
    };
  } else if (query.solved === 'false' && solvedKeys?.length) {
    where.platformProblemId = { notIn: solvedKeys };
  }

  return where;
}

function buildOrderBy(sort?: string): Prisma.ProblemOrderByWithRelationInput[] {
  switch (sort) {
    case 'ratingAsc':
      return [{ difficulty: 'asc' }, { title: 'asc' }];
    case 'ratingDesc':
      return [{ difficulty: 'desc' }, { title: 'asc' }];
    case 'name':
      return [{ title: 'asc' }];
    case 'contestAsc':
      return [{ platformProblemId: 'asc' }];
    default:
      return [{ platformProblemId: 'desc' }];
  }
}

function matchesContestFilter(
  platformProblemId: string,
  contestIdMin?: number,
  contestIdMax?: number,
): boolean {
  if (contestIdMin === undefined && contestIdMax === undefined) return true;
  const contestId = contestIdFromPlatformProblemId(platformProblemId);
  if (contestId === undefined) return false;
  if (contestIdMin !== undefined && contestId < contestIdMin) return false;
  if (contestIdMax !== undefined && contestId > contestIdMax) return false;
  return true;
}

function toRow(
  p: {
    id: string;
    platformProblemId: string;
    title: string;
    url: string;
    difficulty: number;
    tags: string[];
  },
  statusMap: Map<string, { solved: boolean; attempted: boolean }>,
  solvedCountByKey?: Map<string, number>,
  manualSolvedIds?: Set<string>,
): PracticeCfProblemRow {
  const parsed = parseCfPlatformProblemId(p.platformProblemId);
  const st = statusMap.get(p.platformProblemId);
  const solved = Boolean(
    st?.solved || manualSolvedIds?.has(p.id),
  );
  return {
    id: p.id,
    problemId: p.platformProblemId,
    index: parsed.index,
    name: p.title,
    url: p.url,
    solved,
    attempted: st?.attempted ?? false,
    rating: p.difficulty,
    tags: p.tags,
    contestId: parsed.contestId ? String(parsed.contestId) : undefined,
    solvedCount: solvedCountByKey?.get(p.platformProblemId),
  };
}

export async function fetchPracticeCfProblems(
  prisma: PrismaClient,
  handle: string | undefined,
  query: PracticeCfProblemsQuery,
  userId?: string,
): Promise<{
  items: PracticeCfProblemRow[];
  total: number;
  solvedCount: number;
  page: number;
  limit: number;
}> {
  const page = Math.max(1, query.page ?? 1);
  const limit = Math.min(200, Math.max(1, query.limit ?? 100));
  const hasContestFilter =
    query.contestIdMin !== undefined || query.contestIdMax !== undefined;

  const { statusMap } = await getUserCfData(handle);
  let solvedKeys = [...statusMap.entries()]
    .filter(([, st]) => st.solved)
    .map(([k]) => k);

  if (userId) {
    const manualRows = await prisma.userProblemProgress.findMany({
      where: {
        userId,
        solved: true,
        problem: { platform: 'codeforces' },
      },
      select: { problem: { select: { platformProblemId: true } } },
    });
    const manualKeys = manualRows.map((row) => row.problem.platformProblemId);
    solvedKeys = [...new Set([...solvedKeys, ...manualKeys])];
  }

  const solvedCount = solvedKeys.length;

  const where = buildWhere(query, solvedKeys);
  const orderBy = buildOrderBy(query.sort);

  const problemSelect = {
    id: true,
    platformProblemId: true,
    title: true,
    url: true,
    difficulty: true,
    tags: true,
  } as const;

  const loadManualSolvedIds = async (problemIds: string[]) => {
    if (!userId || problemIds.length === 0) return new Set<string>();
    const rows = await prisma.userProblemProgress.findMany({
      where: {
        userId,
        solved: true,
        problemId: { in: problemIds },
      },
      select: { problemId: true },
    });
    return new Set(rows.map((row) => row.problemId));
  };

  if (hasContestFilter) {
    const all = await prisma.problem.findMany({
      where,
      orderBy,
      select: problemSelect,
    });
    const filtered = all.filter((p) =>
      matchesContestFilter(
        p.platformProblemId,
        query.contestIdMin,
        query.contestIdMax,
      ),
    );
    const total = filtered.length;
    const slice = filtered.slice((page - 1) * limit, page * limit);
    const manualSolvedIds = await loadManualSolvedIds(slice.map((p) => p.id));
    const { solvedCountByKey } = await getCachedProblemset();
    return {
      items: slice.map((p) =>
        toRow(p, statusMap, solvedCountByKey, manualSolvedIds),
      ),
      total,
      solvedCount,
      page,
      limit,
    };
  }

  const total = await prisma.problem.count({ where });
  const problems = await prisma.problem.findMany({
    where,
    orderBy,
    skip: (page - 1) * limit,
    take: limit,
    select: problemSelect,
  });

  const manualSolvedIds = await loadManualSolvedIds(problems.map((p) => p.id));
  const { solvedCountByKey } = await getCachedProblemset();

  return {
    items: problems.map((p) =>
      toRow(p, statusMap, solvedCountByKey, manualSolvedIds),
    ),
    total,
    solvedCount,
    page,
    limit,
  };
}

export async function fetchPracticeCfTags(
  prisma: PrismaClient,
): Promise<string[]> {
  const rows = await prisma.$queryRaw<Array<{ tag: string }>>`
    SELECT DISTINCT unnest(tags) AS tag
    FROM "Problem"
    WHERE platform = 'codeforces'
    ORDER BY tag
    LIMIT 500
  `;
  return rows.map((r) => r.tag);
}

export async function fetchRandomUnsolvedCfProblem(
  prisma: PrismaClient,
  handle: string | undefined,
  query: Pick<PracticeCfProblemsQuery, 'ratingMin' | 'ratingMax' | 'tag'>,
): Promise<PracticeCfProblemRow | null> {
  if (!handle?.trim()) return null;

  const { statusMap } = await getUserCfData(handle);
  const solvedKeys = [...statusMap.entries()]
    .filter(([, st]) => st.solved)
    .map(([k]) => k);
  const where = buildWhere({ ...query, solved: 'false' }, solvedKeys);
  const count = await prisma.problem.count({ where });
  if (count === 0) return null;

  const skip = Math.floor(Math.random() * count);
  const problem = await prisma.problem.findFirst({
    where,
    skip,
    select: {
      id: true,
      platformProblemId: true,
      title: true,
      url: true,
      difficulty: true,
      tags: true,
    },
  });
  if (!problem) return null;

  const { solvedCountByKey } = await getCachedProblemset();
  return toRow(problem, statusMap, solvedCountByKey);
}

export async function fetchRecommendedCfProblems(
  prisma: PrismaClient,
  handle: string | undefined,
  platformRating: number | null | undefined,
  limit = 8,
): Promise<PracticeCfProblemRow[]> {
  if (!handle?.trim() || platformRating == null) return [];

  const ratingMin = Math.max(800, platformRating - 100);
  const ratingMax = platformRating + 100;
  const { statusMap } = await getUserCfData(handle);
  const solvedKeys = [...statusMap.entries()]
    .filter(([, st]) => st.solved)
    .map(([k]) => k);
  const where = buildWhere(
    { ratingMin, ratingMax, solved: 'false' },
    solvedKeys,
  );

  const problems = await prisma.problem.findMany({
    where,
    orderBy: [{ difficulty: 'asc' }, { platformProblemId: 'desc' }],
    take: limit,
    select: {
      id: true,
      platformProblemId: true,
      title: true,
      url: true,
      difficulty: true,
      tags: true,
    },
  });

  const { solvedCountByKey } = await getCachedProblemset();
  return problems.map((p) => toRow(p, statusMap, solvedCountByKey));
}

export async function fetchPracticeCfAnalytics(
  handle: string,
): Promise<CfAnalyticsPayload> {
  const { submissions } = await getUserCfData(handle);
  return processCfSubmissions(submissions);
}

/** Legacy helper for CF URL building from cached API shape. */
export { problemUrl };
