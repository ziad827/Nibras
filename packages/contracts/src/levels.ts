import { z } from 'zod';

export const StudyLevelNameSchema = z.enum([
  'Beginner',
  'Intermediate',
  'Advanced',
  'Expert',
]);

export const LevelProgressItemSchema = z.object({
  name: StudyLevelNameSchema,
  unlocked: z.boolean(),
  done: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
  completed: z.boolean(),
});

export const LevelProgressResponseSchema = z.object({
  studyLevel: StudyLevelNameSchema,
  yearLevel: z.number().int().min(1).max(4),
  overallCompletionPercent: z.number().min(0).max(100),
  levels: z.array(LevelProgressItemSchema),
});

export type StudyLevelName = z.infer<typeof StudyLevelNameSchema>;
export type LevelProgressItem = z.infer<typeof LevelProgressItemSchema>;
export type LevelProgressResponse = z.infer<typeof LevelProgressResponseSchema>;
