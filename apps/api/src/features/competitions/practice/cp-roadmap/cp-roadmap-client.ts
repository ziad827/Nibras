import { PrismaClient } from '@prisma/client';
import { GamificationService } from '../../../gamification/service';
import { recomputeUserGamificationMetrics } from '../../../gamification/user-metrics';
import { parseRoadmapProblemUrl } from './problem-id';
import {
  countTopicProblems,
  countTopics,
  loadProblemBySlug,
  loadRoadmapTree,
  loadTopicBySlug,
} from './cp-roadmap-repository';
import { loadCachedPlatformStatus } from './platform-status-cache';

export type CpRoadmapProblemStatus = {
  solved: boolean;
  userMarked: boolean;
  reviewAt?: string | null;
};

export type CpRoadmapResourceDto = {
  id: string;
  resource_title: string;
  resource_url: string;
  sourcePlatform: string;
  is_starred?: boolean;
  resource_comments?: string;
};

export type CpRoadmapProblemRow = {
  problemId: string;
  title: string;
  url: string;
  sourcePlatform: string;
  difficulty: number;
  isStarred: boolean;
  solveCount?: number;
  solved: boolean;
  userMarked: boolean;
  reviewAt?: string | null;
};

export type CpRoadmapTopicSummary = {
  topicId: string;
  title: string;
  difficulty?: number;
  importance?: number;
  phase?: number;
  prerequisites?: string;
  solvedCount: number;
  totalCount: number;
  percent: number;
  complete: boolean;
};

export type CpRoadmapSubCategorySummary = {
  subCategoryId: string;
  title: string;
  description?: string;
  topics: CpRoadmapTopicSummary[];
  solvedCount: number;
  totalCount: number;
};

export type CpRoadmapCategorySummary = {
  categoryId: string;
  title: string;
  description?: string;
  solvedCount: number;
  totalCount: number;
  percent: number;
  subCategories: CpRoadmapSubCategorySummary[];
};

export type CpRoadmapRoadmapResponse = {
  categories: CpRoadmapCategorySummary[];
  topicCount: number;
  problemCount: number;
  solvedCount: number;
  percent: number;
  codeforcesHandle?: string;
  leetcodeHandle?: string;
  atcoderHandle?: string;
};

export type CpRoadmapTopicResponse = {
  topicId: string;
  topicDbId: string;
  title: string;
  difficulty?: number;
  importance?: number;
  phase?: number;
  prerequisites?: string;
  categoryId: string;
  subCategoryId: string;
  resources: CpRoadmapResourceDto[];
  templateCodes: string[];
  templates: Array<{ id: string; url: string }>;
  problems: CpRoadmapProblemRow[];
  solvedCount: number;
  totalCount: number;
  percent: number;
  complete: boolean;
};

type DbProgressRow = {
  solved: boolean;
  userMarked: boolean;
  reviewAt: Date | null;
};

type ProblemLike = {
  slug: string;
  url: string;
  title: string;
  sourcePlatform: string;
  difficulty: number;
  isStarred: boolean;
  solveCount: number | null;
};

async function notifyCpRoadmapGamification(
  prisma: PrismaClient,
  userId: string,
): Promise<void> {
  await recomputeUserGamificationMetrics(prisma, userId).catch(() => undefined);
  const gamification = new GamificationService(prisma);
  await gamification.checkAndAwardBadges(userId).catch(() => undefined);
}

export function mergeCpRoadmapStatus(
  problemId: string,
  problemUrl: string,
  dbProgress: Map<string, DbProgressRow>,
  cfStatus: Map<string, { solved: boolean }>,
  lcStatus: Map<string, { solved: boolean }>,
  atcoderStatus: Map<string, { solved: boolean }>,
): CpRoadmapProblemStatus {
  const db = dbProgress.get(problemId);
  if (db?.userMarked) {
    return {
      solved: db.solved,
      userMarked: true,
      reviewAt: db.reviewAt?.toISOString() ?? null,
    };
  }

  const parsed = parseRoadmapProblemUrl(problemUrl);
  if (parsed?.platform === 'codeforces') {
    const synced = cfStatus.get(parsed.platformProblemId)?.solved ?? false;
    if (synced) {
      return {
        solved: true,
        userMarked: false,
        reviewAt: db?.reviewAt?.toISOString() ?? null,
      };
    }
  } else if (parsed?.platform === 'leetcode') {
    const synced = lcStatus.get(parsed.platformProblemId)?.solved ?? false;
    if (synced) {
      return {
        solved: true,
        userMarked: false,
        reviewAt: db?.reviewAt?.toISOString() ?? null,
      };
    }
  } else if (parsed?.platform === 'atcoder') {
    const synced = atcoderStatus.get(parsed.platformProblemId)?.solved ?? false;
    if (synced) {
      return {
        solved: true,
        userMarked: false,
        reviewAt: db?.reviewAt?.toISOString() ?? null,
      };
    }
  }

  if (db) {
    return {
      solved: db.solved,
      userMarked: false,
      reviewAt: db.reviewAt?.toISOString() ?? null,
    };
  }

  return { solved: false, userMarked: false, reviewAt: null };
}

async function loadDbProgress(
  prisma: PrismaClient,
  userId: string | undefined,
): Promise<Map<string, DbProgressRow>> {
  const map = new Map<string, DbProgressRow>();
  if (!userId) return map;

  const rows = await prisma.cpRoadmapProblemProgress.findMany({
    where: { userId },
    select: {
      roadmapProblemId: true,
      solved: true,
      userMarked: true,
      reviewAt: true,
    },
  });

  for (const row of rows) {
    map.set(row.roadmapProblemId, {
      solved: row.solved,
      userMarked: row.userMarked,
      reviewAt: row.reviewAt,
    });
  }
  return map;
}

function summarizeProblems(
  problems: ProblemLike[],
  dbProgress: Map<string, DbProgressRow>,
  cfStatus: Map<string, { solved: boolean }>,
  lcStatus: Map<string, { solved: boolean }>,
  atcoderStatus: Map<string, { solved: boolean }>,
  meta: {
    topicId: string;
    title: string;
    difficulty?: number | null;
    importance?: number | null;
    phase?: number | null;
    prerequisites?: string | null;
  },
): CpRoadmapTopicSummary {
  let solvedCount = 0;
  for (const problem of problems) {
    const status = mergeCpRoadmapStatus(
      problem.slug,
      problem.url,
      dbProgress,
      cfStatus,
      lcStatus,
      atcoderStatus,
    );
    if (status.solved) solvedCount++;
  }
  const totalCount = problems.length;
  return {
    topicId: meta.topicId,
    title: meta.title,
    difficulty: meta.difficulty ?? undefined,
    importance: meta.importance ?? undefined,
    phase: meta.phase ?? undefined,
    prerequisites: meta.prerequisites ?? undefined,
    solvedCount,
    totalCount,
    percent: totalCount > 0 ? Math.round((solvedCount / totalCount) * 100) : 0,
    complete: totalCount > 0 && solvedCount === totalCount,
  };
}

function toProblemRow(
  problem: ProblemLike,
  dbProgress: Map<string, DbProgressRow>,
  cfStatus: Map<string, { solved: boolean }>,
  lcStatus: Map<string, { solved: boolean }>,
  atcoderStatus: Map<string, { solved: boolean }>,
): CpRoadmapProblemRow {
  const status = mergeCpRoadmapStatus(
    problem.slug,
    problem.url,
    dbProgress,
    cfStatus,
    lcStatus,
    atcoderStatus,
  );
  return {
    problemId: problem.slug,
    title: problem.title,
    url: problem.url,
    sourcePlatform: problem.sourcePlatform,
    difficulty: problem.difficulty,
    isStarred: problem.isStarred,
    solveCount: problem.solveCount ?? undefined,
    solved: status.solved,
    userMarked: status.userMarked,
    reviewAt: status.reviewAt,
  };
}

export async function fetchCpRoadmapOverview(
  prisma: PrismaClient,
  userId: string | undefined,
  cfHandle: string | undefined,
  lcHandle: string | undefined,
  atcoderHandle?: string | undefined,
): Promise<CpRoadmapRoadmapResponse> {
  const [tree, dbProgress, platformStatus, topicCount, linkCount] =
    await Promise.all([
      loadRoadmapTree(prisma),
      loadDbProgress(prisma, userId),
      loadCachedPlatformStatus(cfHandle, lcHandle, atcoderHandle),
      countTopics(prisma),
      countTopicProblems(prisma),
    ]);
  const { cfStatus, lcStatus, atcoderStatus } = platformStatus;

  let globalSolved = 0;
  let globalTotal = 0;

  const categories: CpRoadmapCategorySummary[] = tree.map((category) => {
    let categorySolved = 0;
    let categoryTotal = 0;

    const subCategories = category.subCategories.map((sub) => {
      let subSolved = 0;
      let subTotal = 0;
      const topics = sub.topics.map((topic) => {
        const problems = topic.topicProblems.map((tp) => tp.problem);
        const summary = summarizeProblems(
          problems,
          dbProgress,
          cfStatus,
          lcStatus,
          atcoderStatus,
          {
            topicId: topic.slug,
            title: topic.title,
            difficulty: topic.difficulty,
            importance: topic.importance,
            phase: topic.phase,
            prerequisites: topic.prerequisites,
          },
        );
        categorySolved += summary.solvedCount;
        categoryTotal += summary.totalCount;
        subSolved += summary.solvedCount;
        subTotal += summary.totalCount;
        return summary;
      });

      return {
        subCategoryId: sub.slug,
        title: sub.title,
        description: sub.description ?? undefined,
        topics,
        solvedCount: subSolved,
        totalCount: subTotal,
      };
    });

    globalSolved += categorySolved;
    globalTotal += categoryTotal;

    return {
      categoryId: category.slug,
      title: category.title,
      description: category.description ?? undefined,
      solvedCount: categorySolved,
      totalCount: categoryTotal,
      percent:
        categoryTotal > 0
          ? Math.round((categorySolved / categoryTotal) * 100)
          : 0,
      subCategories,
    };
  });

  return {
    categories,
    topicCount,
    problemCount: linkCount,
    solvedCount: globalSolved,
    percent:
      globalTotal > 0 ? Math.round((globalSolved / globalTotal) * 100) : 0,
    codeforcesHandle: cfHandle,
    leetcodeHandle: lcHandle,
    atcoderHandle,
  };
}

export async function fetchCpRoadmapTopic(
  prisma: PrismaClient,
  topicId: string,
  userId: string | undefined,
  cfHandle: string | undefined,
  lcHandle: string | undefined,
  atcoderHandle?: string | undefined,
): Promise<CpRoadmapTopicResponse | null> {
  const topic = await loadTopicBySlug(prisma, topicId);
  if (!topic) return null;

  const [dbProgress, platformStatus] = await Promise.all([
    loadDbProgress(prisma, userId),
    loadCachedPlatformStatus(cfHandle, lcHandle, atcoderHandle),
  ]);
  const { cfStatus, lcStatus, atcoderStatus } = platformStatus;

  const problems = topic.topicProblems.map((tp) =>
    toProblemRow(tp.problem, dbProgress, cfStatus, lcStatus, atcoderStatus),
  );

  const solvedCount = problems.filter((p) => p.solved).length;
  const totalCount = problems.length;

  const resources: CpRoadmapResourceDto[] = topic.resources.map((r) => ({
    id: r.id,
    resource_title: r.title,
    resource_url: r.url,
    sourcePlatform: r.sourcePlatform,
    is_starred: r.isStarred,
    resource_comments: r.comments ?? undefined,
  }));

  return {
    topicId: topic.slug,
    topicDbId: topic.id,
    title: topic.title,
    difficulty: topic.difficulty ?? undefined,
    importance: topic.importance ?? undefined,
    phase: topic.phase ?? undefined,
    prerequisites: topic.prerequisites ?? undefined,
    categoryId: topic.subCategory.category.slug,
    subCategoryId: topic.subCategory.slug,
    resources,
    templateCodes: topic.templates.map((t) => t.url),
    templates: topic.templates.map((t) => ({ id: t.id, url: t.url })),
    problems,
    solvedCount,
    totalCount,
    percent: totalCount > 0 ? Math.round((solvedCount / totalCount) * 100) : 0,
    complete: totalCount > 0 && solvedCount === totalCount,
  };
}

export async function setCpRoadmapProblemSolved(
  prisma: PrismaClient,
  userId: string,
  problemId: string,
  solved: boolean,
  opts?: { userMarked?: boolean },
): Promise<void> {
  const entry = await loadProblemBySlug(prisma, problemId);
  if (!entry) {
    throw new Error('Unknown roadmap problem');
  }

  const userMarked = opts?.userMarked ?? true;

  await prisma.cpRoadmapProblemProgress.upsert({
    where: { userId_roadmapProblemId: { userId, roadmapProblemId: problemId } },
    create: {
      userId,
      roadmapProblemId: problemId,
      solved,
      solvedAt: solved ? new Date() : null,
      userMarked,
    },
    update: {
      solved,
      solvedAt: solved ? new Date() : null,
      userMarked,
    },
  });

  if (solved) {
    await notifyCpRoadmapGamification(prisma, userId);
  }
}

export async function clearCpRoadmapManualProgress(
  prisma: PrismaClient,
  userId: string,
  problemId: string,
): Promise<void> {
  await prisma.cpRoadmapProblemProgress.deleteMany({
    where: { userId, roadmapProblemId: problemId, userMarked: true },
  });
}

export async function getCpRoadmapProblemNote(
  prisma: PrismaClient,
  userId: string,
  problemId: string,
): Promise<{ problemId: string; note: string }> {
  const row = await prisma.cpRoadmapProblemNote.findUnique({
    where: { userId_roadmapProblemId: { userId, roadmapProblemId: problemId } },
  });
  return { problemId, note: row?.note ?? '' };
}

export async function upsertCpRoadmapProblemNote(
  prisma: PrismaClient,
  userId: string,
  problemId: string,
  note: string,
): Promise<{ problemId: string; note: string }> {
  const entry = await loadProblemBySlug(prisma, problemId);
  if (!entry) throw new Error('Unknown roadmap problem');

  const row = await prisma.cpRoadmapProblemNote.upsert({
    where: { userId_roadmapProblemId: { userId, roadmapProblemId: problemId } },
    create: { userId, roadmapProblemId: problemId, note },
    update: { note },
  });
  return { problemId, note: row.note };
}

export async function setCpRoadmapReviewAt(
  prisma: PrismaClient,
  userId: string,
  problemId: string,
  reviewAt: string | null,
): Promise<{ problemId: string; reviewAt: string | null }> {
  const entry = await loadProblemBySlug(prisma, problemId);
  if (!entry) throw new Error('Unknown roadmap problem');

  const parsedReviewAt = reviewAt ? new Date(reviewAt) : null;
  await prisma.cpRoadmapProblemProgress.upsert({
    where: { userId_roadmapProblemId: { userId, roadmapProblemId: problemId } },
    create: {
      userId,
      roadmapProblemId: problemId,
      solved: true,
      solvedAt: new Date(),
      userMarked: false,
      reviewAt: parsedReviewAt,
    },
    update: { reviewAt: parsedReviewAt },
  });
  return {
    problemId,
    reviewAt: parsedReviewAt ? parsedReviewAt.toISOString() : null,
  };
}

export async function createCpRoadmapSuggestion(
  prisma: PrismaClient,
  userId: string,
  input: {
    topicId: string;
    title: string;
    url: string;
    notes?: string;
    difficulty?: number;
  },
) {
  const topic = await loadTopicBySlug(prisma, input.topicId);
  if (!topic) throw new Error('Topic not found');

  return prisma.cpRoadmapProblemSuggestion.create({
    data: {
      userId,
      topicId: topic.id,
      title: input.title.trim(),
      url: input.url.trim(),
      notes: input.notes?.trim() || null,
      difficulty: input.difficulty ?? null,
    },
  });
}

export async function listMyCpRoadmapSuggestions(
  prisma: PrismaClient,
  userId: string,
) {
  return prisma.cpRoadmapProblemSuggestion.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: { topic: { select: { slug: true, title: true } } },
  });
}

export async function computeCpRoadmapGamificationCounts(
  prisma: PrismaClient,
  userId: string,
  cfHandle?: string,
  lcHandle?: string,
  atcoderHandle?: string,
): Promise<{
  cpRoadmapSolvedCount: number;
  cpRoadmapTopicsComplete: number;
  cpRoadmapPercent: number;
  cpRoadmapCategoriesComplete: number;
}> {
  const overview = await fetchCpRoadmapOverview(
    prisma,
    userId,
    cfHandle,
    lcHandle,
    atcoderHandle,
  );
  let topicsComplete = 0;
  for (const category of overview.categories) {
    for (const sub of category.subCategories) {
      for (const topic of sub.topics) {
        if (topic.complete) topicsComplete++;
      }
    }
  }
  const categoriesComplete = overview.categories.filter(
    (c) => c.totalCount > 0 && c.solvedCount === c.totalCount,
  ).length;

  return {
    cpRoadmapSolvedCount: overview.solvedCount,
    cpRoadmapTopicsComplete: topicsComplete,
    cpRoadmapPercent: overview.percent,
    cpRoadmapCategoriesComplete: categoriesComplete,
  };
}
