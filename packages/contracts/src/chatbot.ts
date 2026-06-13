import { z } from 'zod';

export const TUTOR_DEFAULT_MATCH_THRESHOLD = 0.55;

export const TutorCitationSchema = z.object({
  title: z.string(),
  url: z.string().optional(),
});

export type TutorCitation = z.infer<typeof TutorCitationSchema>;

export const TutorConfigSchema = z.object({
  matchThreshold: z.number().min(0).max(1),
});

export type TutorConfig = z.infer<typeof TutorConfigSchema>;

export const ChatAskResponseSchema = z.object({
  answer: z.string(),
  hints: z.array(z.string()),
  tags: z.array(z.string()),
  followUps: z.array(z.string()),
  communityQuestionId: z.string().nullable(),
  communityQuestion: z.string().nullable(),
  matchScore: z.number().nullable(),
  citations: z.array(TutorCitationSchema).optional(),
  xai: z
    .object({
      reasoning: z.string(),
      concepts_used: z.array(z.string()),
      might_be_unclear: z.array(z.string()),
    })
    .nullable(),
  refused: z.boolean().optional(),
});

export type ChatAskResponse = z.infer<typeof ChatAskResponseSchema>;

export const RoutingStepSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  estimatedMinutes: z.number().optional(),
  ready: z.boolean(),
  topics: z.array(z.string()).optional(),
  resourceUrl: z.string().nullable().optional(),
  matchedCourseTitle: z.string().optional(),
  catalogCourseId: z.string().optional(),
});

export type RoutingStep = z.infer<typeof RoutingStepSchema>;

export const RoutingResponseSchema = z.object({
  goal: z.string(),
  steps: z.array(RoutingStepSchema),
  summary: z.string().optional(),
});

export type RoutingResponse = z.infer<typeof RoutingResponseSchema>;

export const TutorMessageFeedbackSchema = z.object({
  rating: z.enum(['up', 'down']),
  comment: z.string().max(500).optional(),
});

export type TutorMessageFeedback = z.infer<typeof TutorMessageFeedbackSchema>;
