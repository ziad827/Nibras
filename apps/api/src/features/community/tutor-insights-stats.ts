import type { PrismaClient } from '@prisma/client';

export type TutorInsightsStats = {
  totalQuestions: number;
  totalConversations: number;
  streakDays: number;
  weeklyQuestions: number;
  topTags: Array<{ tag: string; count: number }>;
  dailyProblemStreak: number;
  dailyProblemLongestStreak: number;
  solvedProblems: number;
  passedSubmissions: number;
  failedSubmissions: number;
  videosWatched: number;
  topConcepts: Array<{ concept: string; count: number }>;
  unclearTerms: Array<{ term: string; count: number }>;
  courseGrades: Array<{ courseTitle: string; percent: number | null }>;
  plannerGaps: string[];
  enrolledCourseTitles: string[];
};

export async function buildTutorInsightsStats(
  prisma: PrismaClient,
  userId: string,
): Promise<TutorInsightsStats> {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalQuestions,
    totalConversations,
    weeklyQuestions,
    tagRows,
    xaiRows,
    gamification,
    dailyConfig,
    recentReviews,
    memberships,
    studentProgram,
  ] = await Promise.all([
    prisma.tutorMessage.count({
      where: { conversation: { userId }, role: 'user' },
    }),
    prisma.tutorConversation.count({ where: { userId } }),
    prisma.tutorMessage.count({
      where: {
        conversation: { userId },
        role: 'user',
        createdAt: { gte: weekAgo },
      },
    }),
    prisma.tutorMessage.findMany({
      where: { conversation: { userId }, role: 'assistant' },
      select: { tags: true, createdAt: true },
    }),
    prisma.tutorMessage.findMany({
      where: { conversation: { userId }, role: 'assistant' },
      select: { xaiConcepts: true, xaiUnclear: true },
    }),
    prisma.userGamificationMetrics.findUnique({ where: { userId } }),
    prisma.dailyProblemConfig.findUnique({ where: { userId } }),
    prisma.review.findMany({
      where: { submissionAttempt: { userId } },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        score: true,
        submissionAttempt: {
          select: {
            project: {
              select: { name: true, course: { select: { title: true } } },
            },
          },
        },
      },
    }),
    prisma.courseMembership.findMany({
      where: { userId },
      include: { course: { select: { id: true, title: true } } },
      take: 10,
    }),
    prisma.studentProgram.findFirst({
      where: { userId, status: 'enrolled' },
      include: {
        plannedCourses: {
          include: { catalogCourse: { select: { title: true } } },
          take: 5,
        },
      },
    }),
  ]);

  const tagCounts: Record<string, number> = {};
  const conceptCounts: Record<string, number> = {};
  const unclearCounts: Record<string, number> = {};
  const activeDays = new Set<string>();

  for (const row of tagRows) {
    for (const t of row.tags) {
      tagCounts[t] = (tagCounts[t] || 0) + 1;
    }
    activeDays.add(row.createdAt.toISOString().slice(0, 10));
  }

  for (const row of xaiRows) {
    for (const c of row.xaiConcepts) {
      conceptCounts[c] = (conceptCounts[c] || 0) + 1;
    }
    for (const u of row.xaiUnclear) {
      unclearCounts[u] = (unclearCounts[u] || 0) + 1;
    }
  }

  let streakDays = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    if (activeDays.has(d.toISOString().slice(0, 10))) {
      streakDays++;
    } else {
      break;
    }
  }

  const topTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([tag, count]) => ({ tag, count }));

  const topConcepts = Object.entries(conceptCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([concept, count]) => ({ concept, count }));

  const unclearTerms = Object.entries(unclearCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([term, count]) => ({ term, count }));

  const courseGradeMap = new Map<string, number[]>();
  for (const review of recentReviews) {
    const title =
      review.submissionAttempt.project.course?.title ||
      review.submissionAttempt.project.name ||
      'Course';
    const scores = courseGradeMap.get(title) ?? [];
    if (review.score != null) scores.push(review.score);
    courseGradeMap.set(title, scores);
  }

  const courseGrades = [...courseGradeMap.entries()]
    .slice(0, 8)
    .map(([courseTitle, scores]) => ({
      courseTitle,
      percent:
        scores.length > 0
          ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
          : null,
    }));

  const plannerGaps =
    studentProgram?.plannedCourses
      .map((pc) => pc.catalogCourse.title)
      .slice(0, 5) ?? [];

  return {
    totalQuestions,
    totalConversations,
    streakDays,
    weeklyQuestions,
    topTags,
    dailyProblemStreak: dailyConfig?.currentStreak ?? 0,
    dailyProblemLongestStreak: dailyConfig?.longestStreak ?? 0,
    solvedProblems: gamification?.solvedProblems ?? 0,
    passedSubmissions: gamification?.passedSubmissions ?? 0,
    failedSubmissions: gamification?.failedSubmissions ?? 0,
    videosWatched: gamification?.videosWatched ?? 0,
    topConcepts,
    unclearTerms,
    courseGrades,
    plannerGaps,
    enrolledCourseTitles: memberships.map((m) => m.course.title),
  };
}
