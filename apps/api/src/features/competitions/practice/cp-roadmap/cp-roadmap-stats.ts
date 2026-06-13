import { PrismaClient } from '@prisma/client';
import { fetchCpRoadmapOverview } from './cp-roadmap-client';

export type CpRoadmapStatsPayload = {
  topicCount: number;
  problemCount: number;
  solvedCount: number;
  percent: number;
  categories: Array<{
    categoryId: string;
    title: string;
    solvedCount: number;
    totalCount: number;
    percent: number;
  }>;
  codeforcesHandle?: string;
  leetcodeHandle?: string;
  atcoderHandle?: string;
};

export async function fetchCpRoadmapStats(
  prisma: PrismaClient,
  userId: string | undefined,
  cfHandle: string | undefined,
  lcHandle: string | undefined,
  atcoderHandle?: string | undefined,
): Promise<CpRoadmapStatsPayload> {
  const overview = await fetchCpRoadmapOverview(
    prisma,
    userId,
    cfHandle,
    lcHandle,
    atcoderHandle,
  );

  return {
    topicCount: overview.topicCount,
    problemCount: overview.problemCount,
    solvedCount: overview.solvedCount,
    percent: overview.percent,
    categories: overview.categories.map((category) => ({
      categoryId: category.categoryId,
      title: category.title,
      solvedCount: category.solvedCount,
      totalCount: category.totalCount,
      percent: category.percent,
    })),
    codeforcesHandle: overview.codeforcesHandle,
    leetcodeHandle: overview.leetcodeHandle,
    atcoderHandle: overview.atcoderHandle,
  };
}
