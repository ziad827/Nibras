import {
  AssignmentSubmissionStatus,
  PrismaClient,
  SubmissionStatus,
  type UserGamificationMetrics,
} from '@prisma/client';
import { computeCpRoadmapGamificationCounts } from '../competitions/practice/cp-roadmap/cp-roadmap-client';
import { resolveVerifiedHandle } from '../competitions/practice/resolve-handle';
import type { UserMetrics } from './badges-catalog';

const METRICS_STALE_MS = 5 * 60 * 1000;

export function metricsRowToUserMetrics(
  row: UserGamificationMetrics,
): UserMetrics {
  return {
    githubLinked: row.githubLinked,
    githubAppInstalled: row.githubAppInstalled,
    courseEnrollments: row.courseEnrollments,
    passedSubmissions: row.passedSubmissions,
    totalSubmissions: row.totalSubmissions,
    failedSubmissions: row.failedSubmissions,
    teamMemberships: row.teamMemberships,
    questions: row.questions,
    answers: row.answers,
    acceptedAnswers: row.acceptedAnswers,
    questionUpvotesReceived: row.questionUpvotesReceived,
    communityVotes: row.communityVotes,
    threads: row.threads,
    threadPosts: row.threadPosts,
    solvedProblems: row.solvedProblems,
    problemBookmarks: row.problemBookmarks,
    contestParticipations: row.contestParticipations,
    contestBookmarks: row.contestBookmarks,
    assignmentSubmissions: row.assignmentSubmissions,
    videosWatched: row.videosWatched,
    earnedBadges: row.earnedBadges,
    dailyStreakCurrent: row.dailyStreakCurrent,
    dailyStreakLongest: row.dailyStreakLongest,
    dailyProblemsCompleted: row.dailyProblemsCompleted,
    codeforcesMaxRating: row.codeforcesMaxRating,
    leetcodeMaxRating: row.leetcodeMaxRating,
    plansSubmittedForAdvisor: row.plansSubmittedForAdvisor,
    programSheetsGenerated: row.programSheetsGenerated,
    cpRoadmapSolvedCount: row.cpRoadmapSolvedCount,
    cpRoadmapTopicsComplete: row.cpRoadmapTopicsComplete,
    cpRoadmapPercent: row.cpRoadmapPercent,
    cpRoadmapCategoriesComplete: row.cpRoadmapCategoriesComplete,
  };
}

export async function recomputeUserGamificationMetrics(
  prisma: PrismaClient,
  userId: string,
): Promise<UserMetrics> {
  const [
    user,
    passedSubmissions,
    totalSubmissions,
    failedSubmissions,
    teamMemberships,
    courseEnrollments,
    assignmentSubmissions,
    videosWatched,
    questions,
    questionUpvotesAgg,
    answers,
    acceptedAnswers,
    communityVotes,
    threads,
    threadPosts,
    solvedProblems,
    problemBookmarks,
    contestParticipations,
    contestBookmarks,
    earnedBadges,
    dailyConfig,
    linkedAccounts,
    plansSubmittedForAdvisor,
    programSheetsGenerated,
    cfHandleForRoadmap,
    lcHandleForRoadmap,
    atcoderHandleForRoadmap,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { githubLinked: true, githubAppInstalled: true },
    }),
    prisma.submissionAttempt.count({
      where: { userId, status: SubmissionStatus.passed },
    }),
    prisma.submissionAttempt.count({ where: { userId } }),
    prisma.submissionAttempt.count({
      where: { userId, status: SubmissionStatus.failed },
    }),
    prisma.teamMember.count({ where: { userId } }),
    prisma.courseMembership.count({ where: { userId } }),
    prisma.assignmentSubmission.count({
      where: { userId, status: { not: AssignmentSubmissionStatus.draft } },
    }),
    prisma.videoProgress.count({ where: { userId, watched: true } }),
    prisma.communityQuestion.count({ where: { authorId: userId } }),
    prisma.communityQuestion.aggregate({
      where: { authorId: userId },
      _sum: { votesCount: true },
    }),
    prisma.communityAnswer.count({ where: { authorId: userId } }),
    prisma.communityAnswer.count({
      where: { authorId: userId, accepted: true },
    }),
    prisma.communityVote.count({ where: { userId } }),
    prisma.communityThread.count({ where: { authorId: userId } }),
    prisma.communityPost.count({ where: { authorId: userId } }),
    prisma.userProblemProgress.count({ where: { userId, solved: true } }),
    prisma.problemBookmark.count({ where: { userId } }),
    prisma.userContestParticipation.count({ where: { userId } }),
    prisma.contestBookmark.count({ where: { userId } }),
    prisma.userBadge.count({ where: { userId } }),
    prisma.dailyProblemConfig.findUnique({
      where: { userId },
      select: {
        currentStreak: true,
        longestStreak: true,
        totalCompleted: true,
      },
    }),
    prisma.linkedAccount.findMany({
      where: { userId, verificationStatus: 'verified' },
      select: { platform: true, platformMaxRating: true },
    }),
    prisma.studentProgram.count({
      where: {
        userId,
        submittedForAdvisorAt: { not: null },
      },
    }),
    prisma.programSheetSnapshot.count({
      where: { studentProgram: { userId } },
    }),
    resolveVerifiedHandle(prisma, 'codeforces', userId),
    resolveVerifiedHandle(prisma, 'leetcode', userId),
    resolveVerifiedHandle(prisma, 'atcoder', userId),
  ]);

  let codeforcesMaxRating = 0;
  let leetcodeMaxRating = 0;
  for (const account of linkedAccounts) {
    const peak = account.platformMaxRating ?? 0;
    if (account.platform === 'codeforces') {
      codeforcesMaxRating = Math.max(codeforcesMaxRating, peak);
    } else if (account.platform === 'leetcode') {
      leetcodeMaxRating = Math.max(leetcodeMaxRating, peak);
    }
  }

  const cpCounts = await computeCpRoadmapGamificationCounts(
    prisma,
    userId,
    cfHandleForRoadmap,
    lcHandleForRoadmap,
    atcoderHandleForRoadmap,
  );

  const metrics: UserMetrics = {
    githubLinked: user?.githubLinked ?? false,
    githubAppInstalled: user?.githubAppInstalled ?? false,
    courseEnrollments,
    passedSubmissions,
    totalSubmissions,
    failedSubmissions,
    teamMemberships,
    questions,
    answers,
    acceptedAnswers,
    questionUpvotesReceived: questionUpvotesAgg._sum.votesCount ?? 0,
    communityVotes,
    threads,
    threadPosts,
    solvedProblems,
    problemBookmarks,
    contestParticipations,
    contestBookmarks,
    assignmentSubmissions,
    videosWatched,
    earnedBadges,
    dailyStreakCurrent: dailyConfig?.currentStreak ?? 0,
    dailyStreakLongest: dailyConfig?.longestStreak ?? 0,
    dailyProblemsCompleted: dailyConfig?.totalCompleted ?? 0,
    codeforcesMaxRating,
    leetcodeMaxRating,
    plansSubmittedForAdvisor,
    programSheetsGenerated,
    cpRoadmapSolvedCount: cpCounts.cpRoadmapSolvedCount,
    cpRoadmapTopicsComplete: cpCounts.cpRoadmapTopicsComplete,
    cpRoadmapPercent: cpCounts.cpRoadmapPercent,
    cpRoadmapCategoriesComplete: cpCounts.cpRoadmapCategoriesComplete,
  };

  const row = {
    githubLinked: Boolean(metrics.githubLinked),
    githubAppInstalled: Boolean(metrics.githubAppInstalled),
    courseEnrollments: Number(metrics.courseEnrollments),
    passedSubmissions: Number(metrics.passedSubmissions),
    totalSubmissions: Number(metrics.totalSubmissions),
    failedSubmissions: Number(metrics.failedSubmissions),
    teamMemberships: Number(metrics.teamMemberships),
    questions: Number(metrics.questions),
    answers: Number(metrics.answers),
    acceptedAnswers: Number(metrics.acceptedAnswers),
    questionUpvotesReceived: Number(metrics.questionUpvotesReceived),
    communityVotes: Number(metrics.communityVotes),
    threads: Number(metrics.threads),
    threadPosts: Number(metrics.threadPosts),
    solvedProblems: Number(metrics.solvedProblems),
    problemBookmarks: Number(metrics.problemBookmarks),
    contestParticipations: Number(metrics.contestParticipations),
    contestBookmarks: Number(metrics.contestBookmarks),
    assignmentSubmissions: Number(metrics.assignmentSubmissions),
    videosWatched: Number(metrics.videosWatched),
    earnedBadges: Number(metrics.earnedBadges),
    dailyStreakCurrent: Number(metrics.dailyStreakCurrent),
    dailyStreakLongest: Number(metrics.dailyStreakLongest),
    dailyProblemsCompleted: Number(metrics.dailyProblemsCompleted),
    codeforcesMaxRating: Number(metrics.codeforcesMaxRating),
    leetcodeMaxRating: Number(metrics.leetcodeMaxRating),
    plansSubmittedForAdvisor: Number(metrics.plansSubmittedForAdvisor),
    programSheetsGenerated: Number(metrics.programSheetsGenerated),
    cpRoadmapSolvedCount: Number(metrics.cpRoadmapSolvedCount),
    cpRoadmapTopicsComplete: Number(metrics.cpRoadmapTopicsComplete),
    cpRoadmapPercent: Number(metrics.cpRoadmapPercent),
    cpRoadmapCategoriesComplete: Number(metrics.cpRoadmapCategoriesComplete),
  };

  await prisma.userGamificationMetrics.upsert({
    where: { userId },
    create: { userId, ...row },
    update: row,
  });

  return metrics;
}

export async function loadUserGamificationMetrics(
  prisma: PrismaClient,
  userId: string,
  opts?: { force?: boolean },
): Promise<UserMetrics> {
  if (!opts?.force) {
    const cached = await prisma.userGamificationMetrics.findUnique({
      where: { userId },
    });
    if (cached && Date.now() - cached.updatedAt.getTime() < METRICS_STALE_MS) {
      return metricsRowToUserMetrics(cached);
    }
  }
  return recomputeUserGamificationMetrics(prisma, userId);
}

export { METRICS_STALE_MS };

type IncrementableMetricField =
  | 'passedSubmissions'
  | 'totalSubmissions'
  | 'failedSubmissions'
  | 'earnedBadges'
  | 'dailyProblemsCompleted';

export async function incrementUserGamificationMetric(
  prisma: PrismaClient,
  userId: string,
  field: IncrementableMetricField,
  delta = 1,
): Promise<void> {
  if (delta === 0) return;
  await prisma.userGamificationMetrics.upsert({
    where: { userId },
    create: { userId, [field]: Math.max(0, delta) },
    update: { [field]: { increment: delta } },
  });
}

export async function syncDailyGamificationMetrics(
  prisma: PrismaClient,
  userId: string,
  streak: { current: number; longest: number; totalCompleted: number },
): Promise<void> {
  await prisma.userGamificationMetrics.upsert({
    where: { userId },
    create: {
      userId,
      dailyStreakCurrent: streak.current,
      dailyStreakLongest: streak.longest,
      dailyProblemsCompleted: streak.totalCompleted,
    },
    update: {
      dailyStreakCurrent: streak.current,
      dailyStreakLongest: streak.longest,
      dailyProblemsCompleted: streak.totalCompleted,
    },
  });
}

export async function recordSubmissionOutcomeMetrics(
  prisma: PrismaClient,
  userId: string,
  outcome: 'passed' | 'failed' | 'created',
): Promise<void> {
  if (outcome === 'created') {
    await incrementUserGamificationMetric(prisma, userId, 'totalSubmissions');
    return;
  }
  const field =
    outcome === 'passed' ? 'passedSubmissions' : 'failedSubmissions';
  await incrementUserGamificationMetric(prisma, userId, field);
}
