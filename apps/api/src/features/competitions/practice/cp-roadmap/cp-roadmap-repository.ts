import type { PrismaClient } from '@prisma/client';

export type RoadmapTree = Awaited<ReturnType<typeof loadRoadmapTree>>;

export async function loadRoadmapTree(prisma: PrismaClient) {
  return prisma.cpRoadmapCategory.findMany({
    orderBy: { sortOrder: 'asc' },
    include: {
      subCategories: {
        orderBy: { sortOrder: 'asc' },
        include: {
          topics: {
            orderBy: { sortOrder: 'asc' },
            include: {
              topicProblems: {
                orderBy: { sortOrder: 'asc' },
                include: { problem: true },
              },
            },
          },
        },
      },
    },
  });
}

export async function loadTopicBySlug(prisma: PrismaClient, topicSlug: string) {
  return prisma.cpRoadmapTopic.findFirst({
    where: { slug: topicSlug },
    include: {
      subCategory: { include: { category: true } },
      resources: { orderBy: { sortOrder: 'asc' } },
      templates: { orderBy: { sortOrder: 'asc' } },
      topicProblems: {
        orderBy: { sortOrder: 'asc' },
        include: { problem: true },
      },
    },
  });
}

export async function loadTopicById(prisma: PrismaClient, topicId: string) {
  return prisma.cpRoadmapTopic.findUnique({
    where: { id: topicId },
    include: {
      subCategory: { include: { category: true } },
      resources: { orderBy: { sortOrder: 'asc' } },
      templates: { orderBy: { sortOrder: 'asc' } },
      topicProblems: {
        orderBy: { sortOrder: 'asc' },
        include: { problem: true },
      },
    },
  });
}

export async function loadProblemBySlug(prisma: PrismaClient, slug: string) {
  return prisma.cpRoadmapProblem.findUnique({ where: { slug } });
}

export async function countTopics(prisma: PrismaClient): Promise<number> {
  return prisma.cpRoadmapTopic.count();
}

export async function countTopicProblems(
  prisma: PrismaClient,
): Promise<number> {
  return prisma.cpRoadmapTopicProblem.count();
}
