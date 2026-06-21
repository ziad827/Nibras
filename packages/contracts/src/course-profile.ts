import { z } from 'zod';

export const CourseSyllabusSchema = z
  .object({
    schedule: z.string().optional(),
    topics: z.array(z.string()).optional(),
    policies: z.string().optional(),
    objectives: z.array(z.string()).optional(),
    gradingWeights: z
      .array(
        z.object({
          cat: z.string(),
          pct: z.string(),
        }),
      )
      .optional(),
    prerequisites: z.array(z.string()).optional(),
  })
  .passthrough();

export const CourseInstructorSummarySchema = z.object({
  userId: z.string().min(1),
  displayName: z.string().nullable(),
  username: z.string().min(1),
  githubLogin: z.string().nullable(),
  avatarUrl: z.string().url().optional(),
  bio: z.string().nullable(),
  role: z.enum(['instructor', 'ta']),
});

export const CoursePrerequisiteCourseSchema = z.object({
  catalogCourseId: z.string().min(1),
  subjectCode: z.string().min(1),
  catalogNumber: z.string().min(1),
  title: z.string().min(1),
  trackingCourseId: z.string().nullable().optional(),
});

export const CoursePrerequisitesSchema = z.object({
  courses: z.array(CoursePrerequisiteCourseSchema).default([]),
  notes: z.array(z.string()).default([]),
});

export const ReputationWeightsSchema = z.object({
  submission: z.number().int().optional(),
  answerAccepted: z.number().int().optional(),
  problem: z.number().int().optional(),
  dailySolve: z.number().int().optional(),
  dailyMiss: z.number().int().optional(),
  contest: z.number().int().optional(),
});

export const TrackingCourseDetailSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  title: z.string().min(1),
  termLabel: z.string().min(1),
  courseCode: z.string().min(1),
  isActive: z.boolean(),
  isPublic: z.boolean().optional(),
  description: z.string().optional(),
  thumbnailUrl: z.string().nullable().optional(),
  syllabusJson: CourseSyllabusSchema.nullable().optional(),
  sequentialVideos: z.boolean().optional(),
  videoProgressPercent: z.number().min(0).max(100).optional(),
  assignmentCount: z.number().int().nonnegative().optional(),
  publishedAssignmentCount: z.number().int().nonnegative().optional(),
  videoCount: z.number().int().nonnegative().optional(),
  projectCount: z.number().int().nonnegative().optional(),
  reputationWeights: ReputationWeightsSchema.optional(),
  instructors: z.array(CourseInstructorSummarySchema).optional(),
  prerequisites: CoursePrerequisitesSchema.optional(),
});

export const UpdateCourseProfileRequestSchema = z.object({
  title: z.string().min(1).optional(),
  termLabel: z.string().min(1).optional(),
  courseCode: z.string().min(1).optional(),
  description: z.string().max(50000).optional(),
  thumbnailUrl: z.string().url().nullable().optional(),
  syllabusJson: CourseSyllabusSchema.nullable().optional(),
  sequentialVideos: z.boolean().optional(),
  isPublic: z.boolean().optional(),
  reputationWeights: ReputationWeightsSchema.nullable().optional(),
});

export const CourseGradesRollupSchema = z.object({
  courseId: z.string().min(1),
  projects: z.array(
    z.object({
      projectId: z.string().min(1),
      projectKey: z.string(),
      title: z.string(),
      status: z.string(),
      score: z.number().nullable().optional(),
      maxScore: z.number().nullable().optional(),
    }),
  ),
  assignments: z.array(
    z.object({
      assignmentId: z.string().min(1),
      title: z.string(),
      status: z.string(),
      score: z.number().nullable().optional(),
      pointsPossible: z.number(),
    }),
  ),
});

export const InstructorStudentGradeRowSchema = z.object({
  userId: z.string().min(1),
  username: z.string(),
  githubLogin: z.string().nullable(),
  displayName: z.string().nullable(),
  projects: CourseGradesRollupSchema.shape.projects,
  assignments: CourseGradesRollupSchema.shape.assignments,
});

export const InstructorCourseGradesResponseSchema = z.object({
  courseId: z.string().min(1),
  students: z.array(InstructorStudentGradeRowSchema),
});

export const VideoAnalyticsItemSchema = z.object({
  videoId: z.string().min(1),
  title: z.string(),
  sectionTitle: z.string(),
  enrolledCount: z.number().int().nonnegative(),
  watchedCount: z.number().int().nonnegative(),
  avgWatchedProgress: z.number().min(0).max(1),
});

export const VideoAnalyticsResponseSchema = z.object({
  videos: z.array(VideoAnalyticsItemSchema),
});

export type TrackingCourseDetail = z.infer<typeof TrackingCourseDetailSchema>;
export type UpdateCourseProfileRequest = z.infer<
  typeof UpdateCourseProfileRequestSchema
>;
export type CourseGradesRollup = z.infer<typeof CourseGradesRollupSchema>;
export type InstructorStudentGradeRow = z.infer<
  typeof InstructorStudentGradeRowSchema
>;
export type InstructorCourseGradesResponse = z.infer<
  typeof InstructorCourseGradesResponseSchema
>;
export type VideoAnalyticsResponse = z.infer<
  typeof VideoAnalyticsResponseSchema
>;
