import { z } from 'zod';

export const InstructorApplicationStatusSchema = z.enum([
  'pending',
  'approved',
  'rejected',
]);

export const InstructorApplicationSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  department: z.string().min(1),
  status: InstructorApplicationStatusSchema,
  reviewedBy: z.string().nullable().default(null),
  reviewedAt: z.string().datetime().nullable().default(null),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  userName: z.string().optional(),
  userEmail: z.string().email().optional(),
});

export const InstructorApplicationMeResponseSchema = z.object({
  status: InstructorApplicationStatusSchema.nullable(),
  department: z.string().nullable(),
  submittedAt: z.string().datetime().nullable(),
});

export const CreateInstructorApplicationRequestSchema = z.object({
  department: z.string().min(1),
});

export type InstructorApplication = z.infer<typeof InstructorApplicationSchema>;
export type InstructorApplicationMeResponse = z.infer<
  typeof InstructorApplicationMeResponseSchema
>;
