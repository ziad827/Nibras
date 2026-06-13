import { z } from 'zod';

export const AiInteractionTypeSchema = z.enum([
  'routing',
  'duplicate',
  'suggestion',
  'recommendation',
]);

export const RouteQuestionRequestSchema = z.object({
  title: z.string().min(1).max(500),
  body: z.string().max(10000).optional(),
  courseId: z.string().optional(),
  urgent: z.boolean().optional(),
});

export const RouteQuestionResponderSchema = z.object({
  userId: z.string(),
  username: z.string(),
  score: z.number(),
  reasons: z.array(z.string()),
});

export const RouteQuestionResponseSchema = z.object({
  responders: z.array(RouteQuestionResponderSchema),
});

export const SimilarQuestionSchema = z.object({
  questionId: z.string(),
  title: z.string(),
  score: z.number().min(0).max(1),
  answersCount: z.number().int().nonnegative(),
});

export const SimilarQuestionsResponseSchema = z.object({
  questionId: z.string(),
  similar: z.array(SimilarQuestionSchema),
  threshold: z.number(),
});

export const SuggestAnswerRequestSchema = z.object({
  questionId: z.string().min(1),
});

export const SuggestAnswerResponseSchema = z.object({
  suggestedAnswer: z.string(),
  confidence: z.enum(['low', 'medium', 'high']),
  interactionId: z.string().optional(),
});

export const AiRecommendationSchema = z.object({
  type: z.enum(['practice_problem', 'course_resource', 'community_thread']),
  title: z.string(),
  reason: z.string(),
  url: z.string().optional(),
  difficulty: z.string().optional(),
});

export const AiRecommendationsResponseSchema = z.object({
  recommendations: z.array(AiRecommendationSchema),
});

export type RouteQuestionResponse = z.infer<typeof RouteQuestionResponseSchema>;
export type SimilarQuestionsResponse = z.infer<
  typeof SimilarQuestionsResponseSchema
>;
export type SuggestAnswerResponse = z.infer<typeof SuggestAnswerResponseSchema>;
export type AiRecommendationsResponse = z.infer<
  typeof AiRecommendationsResponseSchema
>;
