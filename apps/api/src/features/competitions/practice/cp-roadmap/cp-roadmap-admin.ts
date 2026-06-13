import { CpRoadmapSuggestionStatus, PrismaClient } from '@prisma/client';
import { detectSourcePlatform } from './problem-id';
import { loadTopicById, loadTopicBySlug } from './cp-roadmap-repository';

export function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 80);
}

export async function listCpRoadmapSuggestions(
  prisma: PrismaClient,
  status?: CpRoadmapSuggestionStatus,
) {
  return prisma.cpRoadmapProblemSuggestion.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { id: true, username: true, displayName: true } },
      topic: { select: { id: true, slug: true, title: true } },
    },
  });
}

export async function reviewCpRoadmapSuggestion(
  prisma: PrismaClient,
  suggestionId: string,
  reviewerId: string,
  action: 'approve' | 'reject',
) {
  const suggestion = await prisma.cpRoadmapProblemSuggestion.findUnique({
    where: { id: suggestionId },
  });
  if (!suggestion || suggestion.status !== 'pending') {
    throw new Error('Suggestion not found or already reviewed');
  }

  if (action === 'reject') {
    return prisma.cpRoadmapProblemSuggestion.update({
      where: { id: suggestionId },
      data: {
        status: 'rejected',
        reviewerId,
        reviewedAt: new Date(),
      },
    });
  }

  const baseSlug = slugify(suggestion.title) || 'problem';
  let slug = baseSlug;
  let n = 1;
  while (await prisma.cpRoadmapProblem.findUnique({ where: { slug } })) {
    slug = `${baseSlug}_${n++}`;
  }

  const maxOrder = await prisma.cpRoadmapTopicProblem.aggregate({
    where: { topicId: suggestion.topicId },
    _max: { sortOrder: true },
  });

  const problem = await prisma.cpRoadmapProblem.create({
    data: {
      slug,
      title: suggestion.title,
      url: suggestion.url,
      sourcePlatform: detectSourcePlatform(suggestion.url),
      difficulty: suggestion.difficulty ?? 0,
    },
  });

  await prisma.cpRoadmapTopicProblem.create({
    data: {
      topicId: suggestion.topicId,
      problemId: problem.id,
      sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
    },
  });

  return prisma.cpRoadmapProblemSuggestion.update({
    where: { id: suggestionId },
    data: {
      status: 'approved',
      reviewerId,
      reviewedAt: new Date(),
      createdProblemId: problem.id,
    },
  });
}

export async function upsertCpRoadmapCategory(
  prisma: PrismaClient,
  input: {
    slug?: string;
    title: string;
    description?: string | null;
    sortOrder?: number;
  },
) {
  const slug = input.slug ?? slugify(input.title);
  return prisma.cpRoadmapCategory.upsert({
    where: { slug },
    create: {
      slug,
      title: input.title,
      description: input.description ?? null,
      sortOrder: input.sortOrder ?? 0,
    },
    update: {
      title: input.title,
      description: input.description ?? null,
      sortOrder: input.sortOrder,
    },
  });
}

export async function updateCpRoadmapCategory(
  prisma: PrismaClient,
  slug: string,
  patch: { title?: string; description?: string | null; sortOrder?: number },
) {
  return prisma.cpRoadmapCategory.update({ where: { slug }, data: patch });
}

export async function deleteCpRoadmapCategory(
  prisma: PrismaClient,
  slug: string,
) {
  return prisma.cpRoadmapCategory.delete({ where: { slug } });
}

export async function upsertCpRoadmapSubCategory(
  prisma: PrismaClient,
  categorySlug: string,
  input: {
    slug?: string;
    title: string;
    description?: string | null;
    sortOrder?: number;
  },
) {
  const category = await prisma.cpRoadmapCategory.findUnique({
    where: { slug: categorySlug },
  });
  if (!category) throw new Error('Category not found');
  const slug = input.slug ?? slugify(input.title);
  return prisma.cpRoadmapSubCategory.upsert({
    where: { categoryId_slug: { categoryId: category.id, slug } },
    create: {
      categoryId: category.id,
      slug,
      title: input.title,
      description: input.description ?? null,
      sortOrder: input.sortOrder ?? 0,
    },
    update: {
      title: input.title,
      description: input.description ?? null,
      sortOrder: input.sortOrder,
    },
  });
}

export async function updateCpRoadmapSubCategory(
  prisma: PrismaClient,
  categorySlug: string,
  subSlug: string,
  patch: { title?: string; description?: string | null; sortOrder?: number },
) {
  const category = await prisma.cpRoadmapCategory.findUnique({
    where: { slug: categorySlug },
  });
  if (!category) throw new Error('Category not found');
  return prisma.cpRoadmapSubCategory.update({
    where: { categoryId_slug: { categoryId: category.id, slug: subSlug } },
    data: patch,
  });
}

export async function deleteCpRoadmapSubCategory(
  prisma: PrismaClient,
  categorySlug: string,
  subSlug: string,
) {
  const category = await prisma.cpRoadmapCategory.findUnique({
    where: { slug: categorySlug },
  });
  if (!category) throw new Error('Category not found');
  return prisma.cpRoadmapSubCategory.delete({
    where: { categoryId_slug: { categoryId: category.id, slug: subSlug } },
  });
}

export async function upsertCpRoadmapTopic(
  prisma: PrismaClient,
  categorySlug: string,
  subSlug: string,
  input: {
    slug?: string;
    title: string;
    difficulty?: number | null;
    importance?: number | null;
    phase?: number | null;
    prerequisites?: string | null;
    sortOrder?: number;
  },
) {
  const category = await prisma.cpRoadmapCategory.findUnique({
    where: { slug: categorySlug },
  });
  if (!category) throw new Error('Category not found');
  const sub = await prisma.cpRoadmapSubCategory.findUnique({
    where: { categoryId_slug: { categoryId: category.id, slug: subSlug } },
  });
  if (!sub) throw new Error('Subcategory not found');
  const slug = input.slug ?? slugify(input.title);
  return prisma.cpRoadmapTopic.upsert({
    where: { subCategoryId_slug: { subCategoryId: sub.id, slug } },
    create: {
      subCategoryId: sub.id,
      slug,
      title: input.title,
      difficulty: input.difficulty ?? null,
      importance: input.importance ?? null,
      phase: input.phase ?? null,
      prerequisites: input.prerequisites ?? null,
      sortOrder: input.sortOrder ?? 0,
    },
    update: {
      title: input.title,
      difficulty: input.difficulty ?? null,
      importance: input.importance ?? null,
      phase: input.phase ?? null,
      prerequisites: input.prerequisites ?? null,
      sortOrder: input.sortOrder,
    },
  });
}

export async function updateCpRoadmapTopic(
  prisma: PrismaClient,
  topicSlug: string,
  patch: {
    title?: string;
    difficulty?: number | null;
    importance?: number | null;
    phase?: number | null;
    prerequisites?: string | null;
    sortOrder?: number;
  },
) {
  const topic = await loadTopicBySlug(prisma, topicSlug);
  if (!topic) throw new Error('Topic not found');
  return prisma.cpRoadmapTopic.update({ where: { id: topic.id }, data: patch });
}

export async function deleteCpRoadmapTopic(
  prisma: PrismaClient,
  topicSlug: string,
) {
  const topic = await loadTopicBySlug(prisma, topicSlug);
  if (!topic) throw new Error('Topic not found');
  return prisma.cpRoadmapTopic.delete({ where: { id: topic.id } });
}

export async function createCpRoadmapResource(
  prisma: PrismaClient,
  topicSlug: string,
  input: {
    title: string;
    url: string;
    isStarred?: boolean;
    comments?: string | null;
  },
) {
  const topic = await loadTopicBySlug(prisma, topicSlug);
  if (!topic) throw new Error('Topic not found');
  const max = await prisma.cpRoadmapResource.aggregate({
    where: { topicId: topic.id },
    _max: { sortOrder: true },
  });
  return prisma.cpRoadmapResource.create({
    data: {
      topicId: topic.id,
      title: input.title,
      url: input.url,
      sourcePlatform: detectSourcePlatform(input.url),
      isStarred: input.isStarred ?? false,
      comments: input.comments ?? null,
      sortOrder: (max._max.sortOrder ?? -1) + 1,
    },
  });
}

export async function updateCpRoadmapResource(
  prisma: PrismaClient,
  resourceId: string,
  patch: {
    title?: string;
    url?: string;
    isStarred?: boolean;
    comments?: string | null;
    sortOrder?: number;
  },
) {
  const data = { ...patch };
  if (patch.url) {
    (data as { sourcePlatform?: string }).sourcePlatform = detectSourcePlatform(
      patch.url,
    );
  }
  return prisma.cpRoadmapResource.update({ where: { id: resourceId }, data });
}

export async function deleteCpRoadmapResource(
  prisma: PrismaClient,
  resourceId: string,
) {
  return prisma.cpRoadmapResource.delete({ where: { id: resourceId } });
}

export async function createCpRoadmapTemplate(
  prisma: PrismaClient,
  topicSlug: string,
  url: string,
) {
  const topic = await loadTopicBySlug(prisma, topicSlug);
  if (!topic) throw new Error('Topic not found');
  const max = await prisma.cpRoadmapTemplate.aggregate({
    where: { topicId: topic.id },
    _max: { sortOrder: true },
  });
  return prisma.cpRoadmapTemplate.create({
    data: {
      topicId: topic.id,
      url,
      sortOrder: (max._max.sortOrder ?? -1) + 1,
    },
  });
}

export async function deleteCpRoadmapTemplate(
  prisma: PrismaClient,
  templateId: string,
) {
  return prisma.cpRoadmapTemplate.delete({ where: { id: templateId } });
}

export async function createCpRoadmapProblem(
  prisma: PrismaClient,
  topicSlug: string,
  input: {
    slug?: string;
    title: string;
    url: string;
    difficulty?: number;
    isStarred?: boolean;
    solveCount?: number | null;
  },
) {
  const topic = await loadTopicBySlug(prisma, topicSlug);
  if (!topic) throw new Error('Topic not found');
  const slug = input.slug ?? slugify(input.title);
  const problem = await prisma.cpRoadmapProblem.upsert({
    where: { slug },
    create: {
      slug,
      title: input.title,
      url: input.url,
      sourcePlatform: detectSourcePlatform(input.url),
      difficulty: input.difficulty ?? 0,
      isStarred: input.isStarred ?? false,
      solveCount: input.solveCount ?? null,
    },
    update: {
      title: input.title,
      url: input.url,
      sourcePlatform: detectSourcePlatform(input.url),
      difficulty: input.difficulty ?? 0,
      isStarred: input.isStarred ?? false,
      solveCount: input.solveCount ?? null,
    },
  });
  const max = await prisma.cpRoadmapTopicProblem.aggregate({
    where: { topicId: topic.id },
    _max: { sortOrder: true },
  });
  await prisma.cpRoadmapTopicProblem.upsert({
    where: { topicId_problemId: { topicId: topic.id, problemId: problem.id } },
    create: {
      topicId: topic.id,
      problemId: problem.id,
      sortOrder: (max._max.sortOrder ?? -1) + 1,
    },
    update: {},
  });
  return problem;
}

export async function updateCpRoadmapProblem(
  prisma: PrismaClient,
  problemSlug: string,
  patch: {
    title?: string;
    url?: string;
    difficulty?: number;
    isStarred?: boolean;
    solveCount?: number | null;
    sortOrder?: number;
    topicSlug?: string;
  },
) {
  const problem = await prisma.cpRoadmapProblem.findUnique({
    where: { slug: problemSlug },
  });
  if (!problem) throw new Error('Problem not found');

  const updated = await prisma.cpRoadmapProblem.update({
    where: { slug: problemSlug },
    data: {
      title: patch.title,
      url: patch.url,
      sourcePlatform: patch.url ? detectSourcePlatform(patch.url) : undefined,
      difficulty: patch.difficulty,
      isStarred: patch.isStarred,
      solveCount: patch.solveCount,
    },
  });

  if (patch.sortOrder !== undefined && patch.topicSlug) {
    const topic = await loadTopicBySlug(prisma, patch.topicSlug);
    if (topic) {
      await prisma.cpRoadmapTopicProblem.updateMany({
        where: { topicId: topic.id, problemId: problem.id },
        data: { sortOrder: patch.sortOrder },
      });
    }
  }

  return updated;
}

export async function unlinkCpRoadmapProblem(
  prisma: PrismaClient,
  topicSlug: string,
  problemSlug: string,
) {
  const topic = await loadTopicBySlug(prisma, topicSlug);
  const problem = await prisma.cpRoadmapProblem.findUnique({
    where: { slug: problemSlug },
  });
  if (!topic || !problem) throw new Error('Topic or problem not found');
  return prisma.cpRoadmapTopicProblem.delete({
    where: { topicId_problemId: { topicId: topic.id, problemId: problem.id } },
  });
}

export async function loadAdminCurriculumTree(prisma: PrismaClient) {
  return prisma.cpRoadmapCategory.findMany({
    orderBy: { sortOrder: 'asc' },
    include: {
      subCategories: {
        orderBy: { sortOrder: 'asc' },
        include: {
          topics: {
            orderBy: { sortOrder: 'asc' },
            select: { id: true, slug: true, title: true, sortOrder: true },
          },
        },
      },
    },
  });
}

export async function getTopicAdminDetail(
  prisma: PrismaClient,
  topicSlug: string,
) {
  return loadTopicBySlug(prisma, topicSlug);
}

export { loadTopicById };
