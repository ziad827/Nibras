/**
 * CP Roadmap curriculum seed — idempotent bootstrap from static JSON/TS exports.
 * Used by prisma/seed-cp-roadmap.ts and API startup.
 */
import type { PrismaClient } from '@prisma/client';
import {
  CP_ROADMAP_CATEGORIES,
  CP_ROADMAP_PROBLEMS,
  CP_ROADMAP_TOPIC_INFO,
} from '../features/competitions/practice/cp-roadmap/curriculum';
import { detectSourcePlatform } from '../features/competitions/practice/cp-roadmap/problem-id';

export type CpRoadmapSeedResult = {
  skipped: boolean;
  categoryCount: number;
  topicCount: number;
  problemCount: number;
  linkCount: number;
};

export async function seedCpRoadmapCurriculum(
  prisma: PrismaClient,
  opts?: { force?: boolean },
): Promise<CpRoadmapSeedResult> {
  if (!opts?.force) {
    const existing = await prisma.cpRoadmapTopic.count();
    if (existing > 0) {
      return {
        skipped: true,
        categoryCount: 0,
        topicCount: 0,
        problemCount: 0,
        linkCount: 0,
      };
    }
  }

  let categoryCount = 0;
  let topicCount = 0;
  let problemCount = 0;
  let linkCount = 0;

  for (let ci = 0; ci < CP_ROADMAP_CATEGORIES.length; ci++) {
    const cat = CP_ROADMAP_CATEGORIES[ci]!;
    const category = await prisma.cpRoadmapCategory.upsert({
      where: { slug: cat.category_id },
      create: {
        slug: cat.category_id,
        title: cat.category_title,
        description: cat.category_desc ?? null,
        sortOrder: ci,
      },
      update: {
        title: cat.category_title,
        description: cat.category_desc ?? null,
        sortOrder: ci,
      },
    });
    categoryCount++;

    for (let si = 0; si < cat.sub_categories.length; si++) {
      const sub = cat.sub_categories[si]!;
      const subCategory = await prisma.cpRoadmapSubCategory.upsert({
        where: {
          categoryId_slug: {
            categoryId: category.id,
            slug: sub.sub_category_id,
          },
        },
        create: {
          categoryId: category.id,
          slug: sub.sub_category_id,
          title: sub.sub_category_title,
          description: sub.sub_category_desc ?? null,
          sortOrder: si,
        },
        update: {
          title: sub.sub_category_title,
          description: sub.sub_category_desc ?? null,
          sortOrder: si,
        },
      });

      for (let ti = 0; ti < sub.topics.length; ti++) {
        const t = sub.topics[ti]!;
        const topic = await prisma.cpRoadmapTopic.upsert({
          where: {
            subCategoryId_slug: {
              subCategoryId: subCategory.id,
              slug: t.topic_id,
            },
          },
          create: {
            subCategoryId: subCategory.id,
            slug: t.topic_id,
            title: t.topic_title,
            difficulty: t.difficulty ?? null,
            importance: t.importance ?? null,
            phase: t.phase ?? null,
            prerequisites: t.prerequisites ?? null,
            sortOrder: ti,
          },
          update: {
            title: t.topic_title,
            difficulty: t.difficulty ?? null,
            importance: t.importance ?? null,
            phase: t.phase ?? null,
            prerequisites: t.prerequisites ?? null,
            sortOrder: ti,
          },
        });
        topicCount++;

        const info = CP_ROADMAP_TOPIC_INFO[t.topic_id];
        if (info?.resources) {
          await prisma.cpRoadmapResource.deleteMany({
            where: { topicId: topic.id },
          });
          for (let ri = 0; ri < info.resources.length; ri++) {
            const r = info.resources[ri]!;
            await prisma.cpRoadmapResource.create({
              data: {
                topicId: topic.id,
                title: r.resource_title,
                url: r.resource_url,
                sourcePlatform: detectSourcePlatform(r.resource_url),
                isStarred: r.is_starred ?? false,
                comments: r.resource_comments ?? null,
                sortOrder: ri,
              },
            });
          }
        }

        if (info?.template_codes) {
          await prisma.cpRoadmapTemplate.deleteMany({
            where: { topicId: topic.id },
          });
          for (let tplI = 0; tplI < info.template_codes.length; tplI++) {
            await prisma.cpRoadmapTemplate.create({
              data: {
                topicId: topic.id,
                url: info.template_codes[tplI]!,
                sortOrder: tplI,
              },
            });
          }
        }

        const order = info?.problem_order ?? [];
        await prisma.cpRoadmapTopicProblem.deleteMany({
          where: { topicId: topic.id },
        });
        for (let pi = 0; pi < order.length; pi++) {
          const slug = order[pi]!;
          const entry = CP_ROADMAP_PROBLEMS[slug];
          if (!entry) continue;

          const problem = await prisma.cpRoadmapProblem.upsert({
            where: { slug: entry.problem_id },
            create: {
              slug: entry.problem_id,
              title: entry.problem_title,
              url: entry.problem_url,
              sourcePlatform: detectSourcePlatform(entry.problem_url),
              difficulty: Number(entry.difficulty) || 0,
              isStarred: entry.is_starred ?? false,
              solveCount: entry.solve_count ?? null,
            },
            update: {
              title: entry.problem_title,
              url: entry.problem_url,
              sourcePlatform: detectSourcePlatform(entry.problem_url),
              difficulty: Number(entry.difficulty) || 0,
              isStarred: entry.is_starred ?? false,
              solveCount: entry.solve_count ?? null,
            },
          });
          problemCount++;

          await prisma.cpRoadmapTopicProblem.create({
            data: {
              topicId: topic.id,
              problemId: problem.id,
              sortOrder: pi,
            },
          });
          linkCount++;
        }
      }
    }
  }

  await prisma
    .$executeRawUnsafe(
      'ALTER TABLE "CpRoadmapProblemProgress" VALIDATE CONSTRAINT "CpRoadmapProblemProgress_roadmapProblemId_fkey"',
    )
    .catch(() => {
      // Orphaned progress rows may exist before first seed.
    });

  return { skipped: false, categoryCount, topicCount, problemCount, linkCount };
}
