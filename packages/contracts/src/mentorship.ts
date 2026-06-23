import { z } from 'zod';

export const MentorProfileStatusSchema = z.enum([
  'pending',
  'approved',
  'rejected',
]);

export const MentorshipRequestStatusSchema = z.enum([
  'pending',
  'accepted',
  'declined',
  'cancelled',
]);

export const MentorSuggestionSchema = z.object({
  _id: z.string().min(1),
  id: z.string().min(1).optional(),
  userId: z.string().min(1).optional(),
  mentorId: z.string().min(1).optional(),
  mentorName: z.string().min(1),
  name: z.string().optional(),
  role: z.string().optional(),
  bio: z.string().nullable().optional(),
  expertise: z.array(z.string()).default([]),
  confidence: z.union([z.number(), z.string()]).optional(),
  matchConfidence: z.union([z.number(), z.string()]).optional(),
  score: z.union([z.number(), z.string()]).optional(),
  availability: z.string().nullable().optional(),
  responseTime: z.string().nullable().optional(),
});

export const MentorshipRequestSchema = z.object({
  id: z.string().min(1),
  mentorId: z.string().min(1),
  mentorName: z.string().optional(),
  message: z.string(),
  status: MentorshipRequestStatusSchema,
  createdAt: z.string().datetime(),
});

export const MentorProfileSchema = z.object({
  userId: z.string().min(1),
  bio: z.string().nullable(),
  expertise: z.array(z.string()),
  availability: z.string().nullable(),
  status: MentorProfileStatusSchema,
  userName: z.string().optional(),
  userEmail: z.string().email().optional(),
});

export const UpdateMentorProfileRequestSchema = z.object({
  bio: z.string().nullable().optional(),
  expertise: z.array(z.string()).optional(),
  availability: z.string().nullable().optional(),
});

export const CreateMentorshipRequestSchema = z.object({
  mentorId: z.string().min(1),
  message: z.string().min(1),
});

export type MentorSuggestion = z.infer<typeof MentorSuggestionSchema>;
export type MentorshipRequest = z.infer<typeof MentorshipRequestSchema>;
