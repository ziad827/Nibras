import { z } from 'zod';

export const CpRoadmapTopicSummarySchema = z.object({
  topicId: z.string(),
  title: z.string(),
  difficulty: z.number().optional(),
  importance: z.number().optional(),
  phase: z.number().optional(),
  prerequisites: z.string().optional(),
  solvedCount: z.number().int().nonnegative(),
  totalCount: z.number().int().nonnegative(),
  percent: z.number().int().min(0).max(100),
  complete: z.boolean(),
});

export const CpRoadmapSubCategorySummarySchema = z.object({
  subCategoryId: z.string(),
  title: z.string(),
  description: z.string().optional(),
  topics: z.array(CpRoadmapTopicSummarySchema),
});

export const CpRoadmapCategorySummarySchema = z.object({
  categoryId: z.string(),
  title: z.string(),
  description: z.string().optional(),
  solvedCount: z.number().int().nonnegative(),
  totalCount: z.number().int().nonnegative(),
  percent: z.number().int().min(0).max(100),
  subCategories: z.array(CpRoadmapSubCategorySummarySchema),
});

export const CpRoadmapRoadmapResponseSchema = z.object({
  categories: z.array(CpRoadmapCategorySummarySchema),
  topicCount: z.number().int().nonnegative(),
  problemCount: z.number().int().nonnegative(),
  solvedCount: z.number().int().nonnegative(),
  percent: z.number().int().min(0).max(100),
  codeforcesHandle: z.string().optional(),
  leetcodeHandle: z.string().optional(),
  atcoderHandle: z.string().optional(),
});

export const CpRoadmapResourceSchema = z.object({
  id: z.string().optional(),
  resource_title: z.string(),
  resource_url: z.string(),
  sourcePlatform: z.string().optional(),
  is_starred: z.boolean().optional(),
  resource_comments: z.string().optional(),
});

export const CpRoadmapProblemRowSchema = z.object({
  problemId: z.string(),
  title: z.string(),
  url: z.string(),
  sourcePlatform: z.string().optional(),
  difficulty: z.number(),
  isStarred: z.boolean(),
  solveCount: z.number().optional(),
  solved: z.boolean(),
  userMarked: z.boolean(),
  reviewAt: z.string().nullable().optional(),
});

export const CpRoadmapTopicResponseSchema = z.object({
  topicId: z.string(),
  topicDbId: z.string().optional(),
  title: z.string(),
  difficulty: z.number().optional(),
  importance: z.number().optional(),
  phase: z.number().optional(),
  prerequisites: z.string().optional(),
  categoryId: z.string(),
  subCategoryId: z.string(),
  resources: z.array(CpRoadmapResourceSchema),
  templateCodes: z.array(z.string()),
  problems: z.array(CpRoadmapProblemRowSchema),
  solvedCount: z.number().int().nonnegative(),
  totalCount: z.number().int().nonnegative(),
  percent: z.number().int().min(0).max(100),
  complete: z.boolean(),
});

export const CpRoadmapStatsResponseSchema = z.object({
  topicCount: z.number().int().nonnegative(),
  problemCount: z.number().int().nonnegative(),
  solvedCount: z.number().int().nonnegative(),
  percent: z.number().int().min(0).max(100),
  categories: z.array(
    z.object({
      categoryId: z.string(),
      title: z.string(),
      solvedCount: z.number().int().nonnegative(),
      totalCount: z.number().int().nonnegative(),
      percent: z.number().int().min(0).max(100),
    }),
  ),
  codeforcesHandle: z.string().optional(),
  leetcodeHandle: z.string().optional(),
  atcoderHandle: z.string().optional(),
});

export const CpRoadmapSuggestionCreateSchema = z.object({
  topicId: z.string().min(1),
  title: z.string().min(1),
  url: z.string().url(),
  notes: z.string().optional(),
  difficulty: z.number().int().min(0).max(3).optional(),
});

export const CpRoadmapSuggestionSchema = z.object({
  id: z.string(),
  topicId: z.string(),
  title: z.string(),
  url: z.string(),
  notes: z.string().nullable().optional(),
  difficulty: z.number().nullable().optional(),
  status: z.enum(['pending', 'approved', 'rejected']),
  createdAt: z.string(),
  topic: z
    .object({
      slug: z.string(),
      title: z.string(),
    })
    .optional(),
});

export type CpRoadmapRoadmapResponse = z.infer<
  typeof CpRoadmapRoadmapResponseSchema
>;
export type CpRoadmapTopicResponse = z.infer<
  typeof CpRoadmapTopicResponseSchema
>;
export type CpRoadmapStatsResponse = z.infer<
  typeof CpRoadmapStatsResponseSchema
>;
export type CpRoadmapSuggestionCreate = z.infer<
  typeof CpRoadmapSuggestionCreateSchema
>;
