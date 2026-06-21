import { z } from 'zod';

export const CourseAnnouncementAuthorSchema = z.object({
  userId: z.string().min(1),
  displayName: z.string().nullable(),
  avatarUrl: z.string().url().optional(),
});

export const CourseAnnouncementSchema = z.object({
  id: z.string().min(1),
  courseId: z.string().min(1),
  title: z.string().min(1),
  body: z.string().min(1),
  publishedAt: z.string().datetime(),
  createdById: z.string().min(1),
  author: CourseAnnouncementAuthorSchema,
});

export const CreateCourseAnnouncementRequestSchema = z.object({
  title: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(10000),
});

export const UpdateCourseAnnouncementRequestSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  body: z.string().trim().min(1).max(10000).optional(),
});

export type CourseAnnouncement = z.infer<typeof CourseAnnouncementSchema>;
export type CreateCourseAnnouncementRequest = z.infer<
  typeof CreateCourseAnnouncementRequestSchema
>;
export type UpdateCourseAnnouncementRequest = z.infer<
  typeof UpdateCourseAnnouncementRequestSchema
>;
