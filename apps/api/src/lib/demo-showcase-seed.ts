/**
 * Demo showcase seed — idempotent rich UI state for screenshot-ready demo accounts.
 * Only touches demo@nibras.dev (and instructor@nibras.dev for review queue).
 */
import {
  AssignmentSubmissionStatus,
  CommunityVoteTargetType,
  PlannedCourseSourceType,
  Prisma,
  type PrismaClient,
  ReviewStatus,
  SocialPlatform,
  SubmissionStatus,
  type AcademicTerm,
} from '@prisma/client';
import { getUserToday } from '@nibras/daily-problem';
import { buildRecommendedPlan } from '../features/programs/planner-validation';
import { NIBRAS_75_CURRICULUM } from '../features/competitions/practice/nibras75/curriculum';
import { recomputeUserGamificationMetrics } from '../features/gamification/user-metrics';
import type {
  AcademicTerm as StoreAcademicTerm,
  CatalogCourseRecord,
  RequirementGroupRecord,
} from '../store';
import {
  DEFAULT_LOCAL_DEV_PASSWORD,
  resolveLocalDevPassword,
  seedCredentialPasswordForUser,
  seedLocalDevCredentials,
} from './local-dev-credentials';

export const DEMO_SHOWCASE_EMAIL = 'demo@nibras.dev';
export const INSTRUCTOR_SHOWCASE_EMAIL = 'instructor@nibras.dev';
export const DEMO_SHOWCASE_MARKER = 'nibras-demo-showcase';
export const DEMO_SHOWCASE_POST_MARKER = `<!-- ${DEMO_SHOWCASE_MARKER} -->`;

/** @deprecated Use DEFAULT_LOCAL_DEV_PASSWORD from local-dev-credentials. */
export const DEFAULT_DEMO_PASSWORD = DEFAULT_LOCAL_DEV_PASSWORD;

const DEMO_TIMEZONE = 'America/Los_Angeles';
const SHOWCASE_BADGE_CODES = [
  'github-connected',
  'github-app-ready',
  'first-enrollment',
  'first-steps',
  'first-attempt',
  'daily-streak-7',
  'daily-streak-30',
] as const;

const LEETCODE_DIFFICULTY: Record<string, number> = {
  Easy: 800,
  Medium: 1500,
  Hard: 2200,
};

export type DemoShowcaseResult = {
  skipped: boolean;
  reason?: string;
  profileUpdated: boolean;
  credentialPasswordSet: boolean;
  plannedCourses: number;
  submissions: number;
  assignmentSubmissions: number;
  dailyAssignments: number;
  nibras75Progress: number;
  cpRoadmapProgress: number;
  badgesAwarded: number;
  communityPosts: number;
  communityVotes: number;
  reputationEvents: number;
};

export type DemoShowcaseOptions = {
  log?: (msg: string) => void;
};

function addDaysToDateString(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function daysAgoFromToday(today: string, days: number): string {
  return addDaysToDateString(today, -days);
}

async function resolveDemoUser(
  prisma: PrismaClient,
): Promise<{ id: string } | null> {
  return prisma.user.findUnique({
    where: { email: DEMO_SHOWCASE_EMAIL },
    select: { id: true },
  });
}

async function resolveInstructorUser(
  prisma: PrismaClient,
): Promise<{ id: string } | null> {
  return prisma.user.findUnique({
    where: { email: INSTRUCTOR_SHOWCASE_EMAIL },
    select: { id: true },
  });
}

export function resolveDemoPassword(): string {
  return resolveLocalDevPassword();
}

async function seedDemoProfile(
  prisma: PrismaClient,
  userId: string,
): Promise<{ profileUpdated: boolean; credentialPasswordSet: boolean }> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      displayName: 'Alex Chen',
      yearLevel: 2,
      emailVerified: true,
    },
  });

  const credentialPasswordSet = await seedCredentialPasswordForUser(
    prisma,
    userId,
  );

  await prisma.userSocialLink.upsert({
    where: { userId_platform: { userId, platform: SocialPlatform.linkedin } },
    create: {
      userId,
      platform: SocialPlatform.linkedin,
      value: 'https://linkedin.com/in/alexchen-demo',
    },
    update: { value: 'https://linkedin.com/in/alexchen-demo' },
  });

  await prisma.userSocialLink.upsert({
    where: { userId_platform: { userId, platform: SocialPlatform.website } },
    create: {
      userId,
      platform: SocialPlatform.website,
      value: 'https://github.com/demo-user',
    },
    update: { value: 'https://github.com/demo-user' },
  });

  return { profileUpdated: true, credentialPasswordSet };
}

function mapRequirementGroups(
  groups: Array<
    Prisma.RequirementGroupGetPayload<{
      include: {
        rules: { include: { courses: true } };
      };
    }>
  >,
): RequirementGroupRecord[] {
  return groups.map((group) => ({
    id: group.id,
    programVersionId: group.programVersionId,
    trackId: group.trackId,
    title: group.title,
    category: group.category,
    minUnits: group.minUnits,
    minCourses: group.minCourses,
    notes: group.notes,
    sortOrder: group.sortOrder,
    noDoubleCount: group.noDoubleCount,
    createdAt: group.createdAt.toISOString(),
    updatedAt: group.updatedAt.toISOString(),
    rules: group.rules.map((rule) => ({
      id: rule.id,
      requirementGroupId: rule.requirementGroupId,
      ruleType: rule.ruleType,
      pickCount: rule.pickCount,
      note: rule.note,
      sortOrder: rule.sortOrder,
      courses: rule.courses.map((course) => ({
        id: course.id,
        requirementRuleId: course.requirementRuleId,
        catalogCourseId: course.catalogCourseId,
      })),
    })),
  }));
}

function mapCatalogCourses(
  courses: Array<{
    id: string;
    programId: string;
    subjectCode: string;
    catalogNumber: string;
    title: string;
    defaultUnits: number;
    department: string;
    plannerCode: string | null;
    trackingCourseId: string | null;
    createdAt: Date;
    updatedAt: Date;
  }>,
): CatalogCourseRecord[] {
  return courses.map((course) => ({
    id: course.id,
    programId: course.programId,
    subjectCode: course.subjectCode,
    catalogNumber: course.catalogNumber,
    title: course.title,
    defaultUnits: course.defaultUnits,
    department: course.department,
    plannerCode: course.plannerCode,
    trackingCourseId: course.trackingCourseId,
    prerequisiteIds: [],
    createdAt: course.createdAt.toISOString(),
    updatedAt: course.updatedAt.toISOString(),
  }));
}

async function seedPlanner(
  prisma: PrismaClient,
  userId: string,
): Promise<number> {
  const program = await prisma.program.findFirst({
    where: { slug: 'cs-program' },
    select: { id: true, activeVersionId: true },
  });
  if (!program?.activeVersionId) return 0;

  const version = await prisma.programVersion.findUnique({
    where: { id: program.activeVersionId },
    select: { id: true, durationYears: true },
  });
  if (!version) return 0;

  let studentProgram = await prisma.studentProgram.findFirst({
    where: { userId, programVersionId: version.id },
  });
  if (!studentProgram) {
    studentProgram = await prisma.studentProgram.create({
      data: { userId, programVersionId: version.id },
    });
  }

  const aiTrack = await prisma.track.findFirst({
    where: { programVersionId: version.id, slug: 'artificial-intelligence' },
    select: { id: true },
  });

  const catalogCourses = await prisma.catalogCourse.findMany({
    where: { programId: program.id },
    orderBy: [{ subjectCode: 'asc' }, { catalogNumber: 'asc' }],
  });

  const requirementGroups = await prisma.requirementGroup.findMany({
    where: { programVersionId: version.id },
    include: { rules: { include: { courses: true } } },
    orderBy: { sortOrder: 'asc' },
  });

  const mappedGroups = mapRequirementGroups(requirementGroups);
  const mappedCatalog = mapCatalogCourses(catalogCourses);

  const foundationPlan = buildRecommendedPlan({
    catalogCourses: mappedCatalog,
    requirementGroups: mappedGroups,
    selectedTrack: null,
    durationYears: version.durationYears,
  });

  const plannedIds = new Set(
    foundationPlan.map((entry) => entry.catalogCourseId),
  );
  const extraTerms: StoreAcademicTerm[] = ['fall', 'spring', 'summer'];
  const extendedPlan = [...foundationPlan];

  for (const course of catalogCourses) {
    if (plannedIds.has(course.id)) continue;
    if (extendedPlan.length >= 20) break;
    const slotIndex = extendedPlan.length;
    const year = Math.min(version.durationYears, Math.floor(slotIndex / 3) + 2);
    extendedPlan.push({
      catalogCourseId: course.id,
      plannedYear: year,
      plannedTerm: extraTerms[
        slotIndex % extraTerms.length
      ] as StoreAcademicTerm,
      sourceType: 'standard',
      note: null,
    });
    plannedIds.add(course.id);
  }

  await prisma.studentPlannedCourse.deleteMany({
    where: { studentProgramId: studentProgram.id },
  });

  if (extendedPlan.length > 0) {
    await prisma.studentPlannedCourse.createMany({
      data: extendedPlan.map((entry) => ({
        studentProgramId: studentProgram!.id,
        catalogCourseId: entry.catalogCourseId,
        plannedYear: entry.plannedYear,
        plannedTerm: entry.plannedTerm as AcademicTerm,
        sourceType: PlannedCourseSourceType.standard,
        note: entry.note,
      })),
    });
  }

  await prisma.studentProgram.update({
    where: { id: studentProgram.id },
    data: {
      selectedTrackId: aiTrack?.id ?? null,
      expectedGraduationQuarter: 'Spring 2028',
      suid: '00987654',
    },
  });

  return extendedPlan.length;
}

async function seedDashboardSubmissions(
  prisma: PrismaClient,
  userId: string,
  instructorId: string | null,
): Promise<number> {
  const project = await prisma.project.findUnique({
    where: { slug: 'cs161/exam1' },
    include: {
      releases: { orderBy: { createdAt: 'desc' }, take: 1 },
      milestones: { orderBy: { order: 'asc' } },
    },
  });
  if (!project?.releases[0]) return 0;

  const release = project.releases[0];
  const milestones = project.milestones;
  const milestone1 = milestones[0]?.id ?? null;
  const milestone2 = milestones[1]?.id ?? null;

  const specs: Array<{
    sha: string;
    status: SubmissionStatus;
    milestoneId: string | null;
    summary: string;
    daysAgo: number;
    review?: { status: ReviewStatus; score: number };
  }> = [
    {
      sha: 'demo-showcase-passed-recent',
      status: SubmissionStatus.passed,
      milestoneId: milestone1,
      summary: 'All tests passing — design milestone complete.',
      daysAgo: 3,
      review: { status: ReviewStatus.graded, score: 92 },
    },
    {
      sha: 'demo-showcase-needs-review',
      status: SubmissionStatus.needs_review,
      milestoneId: milestone2 ?? milestone1,
      summary: 'Final implementation submitted for instructor review.',
      daysAgo: 1,
    },
    {
      sha: 'demo-showcase-passed-older',
      status: SubmissionStatus.passed,
      milestoneId: milestone1,
      summary: 'Initial prototype passed automated checks.',
      daysAgo: 14,
      review: { status: ReviewStatus.approved, score: 88 },
    },
  ];

  let count = 0;
  for (const spec of specs) {
    const createdAt = new Date(Date.now() - spec.daysAgo * 86_400_000);
    const submission = await prisma.submissionAttempt.upsert({
      where: {
        userId_projectId_commitSha: {
          userId,
          projectId: project.id,
          commitSha: spec.sha,
        },
      },
      create: {
        userId,
        projectId: project.id,
        projectReleaseId: release.id,
        milestoneId: spec.milestoneId,
        commitSha: spec.sha,
        repoUrl: 'https://github.com/demo-user/cs161-exam1',
        branch: 'main',
        status: spec.status,
        summary: spec.summary,
        submittedAt: createdAt,
        createdAt,
        updatedAt: createdAt,
      },
      update: {
        status: spec.status,
        summary: spec.summary,
        milestoneId: spec.milestoneId,
        submittedAt: createdAt,
      },
    });
    count += 1;

    if (spec.review && instructorId) {
      const reviewedAt = new Date(createdAt.getTime() + 86_400_000);
      const existingReview = await prisma.review.findFirst({
        where: { submissionAttemptId: submission.id },
        select: { id: true },
      });
      if (existingReview) {
        await prisma.review.update({
          where: { id: existingReview.id },
          data: {
            status: spec.review.status,
            score: spec.review.score,
            feedback: 'Strong work — clear structure and thorough testing.',
            reviewedAt,
          },
        });
      } else {
        await prisma.review.create({
          data: {
            submissionAttemptId: submission.id,
            reviewerUserId: instructorId,
            status: spec.review.status,
            score: spec.review.score,
            feedback: 'Strong work — clear structure and thorough testing.',
            reviewedAt,
          },
        });
      }
    }
  }

  return count;
}

async function seedAssignmentSubmissions(
  prisma: PrismaClient,
  userId: string,
): Promise<number> {
  const assignment = await prisma.courseAssignment.findFirst({
    where: { published: true },
    orderBy: { createdAt: 'asc' },
    select: { id: true, title: true },
  });
  if (!assignment) return 0;

  await prisma.assignmentSubmission.upsert({
    where: { assignmentId_userId: { assignmentId: assignment.id, userId } },
    create: {
      assignmentId: assignment.id,
      userId,
      content:
        'Completed all sections. Key insight: amortized analysis applies to dynamic arrays.',
      status: AssignmentSubmissionStatus.graded,
      score: 95,
      feedback: 'Excellent understanding of core concepts.',
      submittedAt: new Date(Date.now() - 5 * 86_400_000),
    },
    update: {
      status: AssignmentSubmissionStatus.graded,
      score: 95,
      feedback: 'Excellent understanding of core concepts.',
      submittedAt: new Date(Date.now() - 5 * 86_400_000),
    },
  });

  const secondAssignment = await prisma.courseAssignment.findFirst({
    where: { published: true, id: { not: assignment.id } },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });
  if (secondAssignment) {
    await prisma.assignmentSubmission.upsert({
      where: {
        assignmentId_userId: { assignmentId: secondAssignment.id, userId },
      },
      create: {
        assignmentId: secondAssignment.id,
        userId,
        content: 'Submitted quiz responses.',
        status: AssignmentSubmissionStatus.submitted,
        submittedAt: new Date(Date.now() - 1 * 86_400_000),
      },
      update: {
        status: AssignmentSubmissionStatus.submitted,
        submittedAt: new Date(Date.now() - 1 * 86_400_000),
      },
    });
    return 2;
  }

  return 1;
}

async function ensureLeetcodeProblems(
  prisma: PrismaClient,
): Promise<Map<string, string>> {
  const idBySlug = new Map<string, string>();
  for (const entry of NIBRAS_75_CURRICULUM) {
    const problem = await prisma.problem.upsert({
      where: {
        platform_platformProblemId: {
          platform: 'leetcode',
          platformProblemId: entry.slug,
        },
      },
      create: {
        platform: 'leetcode',
        platformProblemId: entry.slug,
        title: entry.title,
        url: `https://leetcode.com/problems/${entry.slug}/`,
        difficulty: LEETCODE_DIFFICULTY[entry.difficulty] ?? 1500,
        tags: entry.tags,
      },
      update: {
        title: entry.title,
        url: `https://leetcode.com/problems/${entry.slug}/`,
        difficulty: LEETCODE_DIFFICULTY[entry.difficulty] ?? 1500,
        tags: entry.tags,
      },
      select: { id: true, platformProblemId: true },
    });
    idBySlug.set(problem.platformProblemId, problem.id);
  }
  return idBySlug;
}

async function seedDailyProblem(
  prisma: PrismaClient,
  userId: string,
  problemIds: string[],
): Promise<number> {
  const today = getUserToday(DEMO_TIMEZONE);
  const streakLength = 42;
  const totalCompleted = 58;

  const config = await prisma.dailyProblemConfig.upsert({
    where: { userId },
    create: {
      userId,
      timezone: DEMO_TIMEZONE,
      currentStreak: streakLength,
      longestStreak: streakLength,
      totalCompleted,
      lastCompletedDate: today,
      streakFreezes: 1,
      difficultyPref: [800, 1500],
      tagPrefs: ['array', 'dynamic-programming'],
    },
    update: {
      timezone: DEMO_TIMEZONE,
      currentStreak: streakLength,
      longestStreak: streakLength,
      totalCompleted,
      lastCompletedDate: today,
      streakFreezes: 1,
    },
  });

  await prisma.dailyProblemAssignment.deleteMany({ where: { userId } });

  const assignments: Prisma.DailyProblemAssignmentCreateManyInput[] = [];
  const problemPool =
    problemIds.length > 0 ? problemIds : [problemIds[0]].filter(Boolean);
  if (problemPool.length === 0) return 0;

  for (let offset = 89; offset >= 0; offset -= 1) {
    const assignedDate = daysAgoFromToday(today, offset);
    const daysFromToday = offset;
    const problemId = problemPool[(89 - offset) % problemPool.length]!;
    const inStreakWindow = daysFromToday < streakLength;
    const solved = inStreakWindow && daysFromToday > 0;
    const skipped =
      !inStreakWindow &&
      daysFromToday > streakLength &&
      daysFromToday % 7 === 0;

    assignments.push({
      userId,
      problemId,
      configId: config.id,
      assignedDate,
      solved,
      skipped,
      solvedAt: solved ? new Date(`${assignedDate}T18:00:00Z`) : null,
    });
  }

  await prisma.dailyProblemAssignment.createMany({ data: assignments });
  return assignments.length;
}

async function seedNibras75Progress(
  prisma: PrismaClient,
  userId: string,
  problemIdBySlug: Map<string, string>,
): Promise<number> {
  const targetDate = new Date(Date.now() + 42 * 86_400_000);
  await prisma.nibras75Config.upsert({
    where: { userId },
    create: {
      userId,
      weeklyPace: 6,
      targetDate,
      useForDailyProblem: false,
    },
    update: {
      weeklyPace: 6,
      targetDate,
    },
  });

  const solveCount = 38;
  let count = 0;
  for (
    let i = 0;
    i < Math.min(solveCount, NIBRAS_75_CURRICULUM.length);
    i += 1
  ) {
    const entry = NIBRAS_75_CURRICULUM[i]!;
    const problemId = problemIdBySlug.get(entry.slug);
    if (!problemId) continue;
    const daysAgo = 60 - Math.floor((i / solveCount) * 59);
    const solvedAt = new Date(Date.now() - daysAgo * 86_400_000);
    await prisma.userProblemProgress.upsert({
      where: { userId_problemId: { userId, problemId } },
      create: { userId, problemId, solved: true, solvedAt },
      update: { solved: true, solvedAt },
    });
    count += 1;
  }
  return count;
}

async function seedCpRoadmapProgress(
  prisma: PrismaClient,
  userId: string,
): Promise<number> {
  const topics = await prisma.cpRoadmapTopic.findMany({
    take: 3,
    orderBy: { sortOrder: 'asc' },
    include: {
      topicProblems: {
        take: 4,
        orderBy: { sortOrder: 'asc' },
        include: { problem: { select: { slug: true } } },
      },
    },
  });

  let count = 0;
  for (const topic of topics) {
    for (const link of topic.topicProblems) {
      const slug = link.problem.slug;
      const daysAgo = 20 - count;
      const solvedAt = new Date(Date.now() - daysAgo * 86_400_000);
      await prisma.cpRoadmapProblemProgress.upsert({
        where: { userId_roadmapProblemId: { userId, roadmapProblemId: slug } },
        create: {
          userId,
          roadmapProblemId: slug,
          solved: true,
          solvedAt,
          userMarked: count % 3 === 0,
        },
        update: { solved: true, solvedAt, userMarked: count % 3 === 0 },
      });
      count += 1;
    }
  }
  return count;
}

async function seedGamification(
  prisma: PrismaClient,
  userId: string,
): Promise<{ badgesAwarded: number; reputationEvents: number }> {
  const badges = await prisma.badgeDefinition.findMany({
    where: { code: { in: [...SHOWCASE_BADGE_CODES] } },
    select: { id: true, code: true, points: true },
  });

  let badgesAwarded = 0;
  const now = Date.now();
  for (const [index, badge] of badges.entries()) {
    await prisma.userBadge.upsert({
      where: { userId_badgeId: { userId, badgeId: badge.id } },
      create: {
        userId,
        badgeId: badge.id,
        earnedAt: new Date(now - (badges.length - index) * 86_400_000 * 3),
      },
      update: {},
    });
    badgesAwarded += 1;
  }

  const reputationSpecs = [
    {
      source: `${DEMO_SHOWCASE_MARKER}:streak`,
      reason: 'Maintained a 42-day daily problem streak',
      delta: 50,
      category: 'problem' as const,
    },
    {
      source: `${DEMO_SHOWCASE_MARKER}:submission`,
      reason: 'Passed CS161 Exam 1 milestone',
      delta: 75,
      category: 'course' as const,
    },
    {
      source: `${DEMO_SHOWCASE_MARKER}:community`,
      reason: 'Helpful reply in course discussion',
      delta: 25,
      category: 'community' as const,
    },
    {
      source: `${DEMO_SHOWCASE_MARKER}:badge`,
      reason: 'Earned GitHub Connected badge',
      delta: 25,
      category: 'badge' as const,
    },
    {
      source: `${DEMO_SHOWCASE_MARKER}:nibras75`,
      reason: 'Solved 38 Nibras 75 problems',
      delta: 100,
      category: 'problem' as const,
    },
    {
      source: `${DEMO_SHOWCASE_MARKER}:cp-roadmap`,
      reason: 'Progress on CP Roadmap curriculum',
      delta: 50,
      category: 'problem' as const,
    },
  ];

  let reputationEvents = 0;
  for (const [index, spec] of reputationSpecs.entries()) {
    await prisma.reputationEvent.upsert({
      where: { userId_source: { userId, source: spec.source } },
      create: {
        userId,
        source: spec.source,
        reason: spec.reason,
        delta: spec.delta,
        category: spec.category,
        createdAt: new Date(
          now - (reputationSpecs.length - index) * 86_400_000 * 2,
        ),
      },
      update: {
        reason: spec.reason,
        delta: spec.delta,
        category: spec.category,
      },
    });
    reputationEvents += 1;
  }

  await recomputeUserGamificationMetrics(prisma, userId).catch(() => {
    // Metrics table may be absent on older DBs — badge/reputation rows still seed fine.
  });
  return { badgesAwarded, reputationEvents };
}

async function seedCommunityEngagement(
  prisma: PrismaClient,
  userId: string,
): Promise<{ communityPosts: number; communityVotes: number }> {
  await prisma.communityPost.deleteMany({
    where: { authorId: userId, body: { contains: DEMO_SHOWCASE_MARKER } },
  });

  const threads = await prisma.communityThread.findMany({
    where: { closed: false },
    orderBy: { lastActivityAt: 'desc' },
    take: 3,
    select: { id: true, title: true, postsCount: true },
  });

  let communityPosts = 0;
  for (const [index, thread] of threads.entries()) {
    const body = [
      DEMO_SHOWCASE_POST_MARKER,
      '',
      index === 0
        ? 'Great question! I found the lecture notes on amortized analysis really helpful for this.'
        : index === 1
          ? 'We formed a study group for this — happy to share our notes in the course hub.'
          : 'Confirming the approach from office hours: start with the base case, then build up inductively.',
    ].join('\n');

    await prisma.communityPost.create({
      data: {
        threadId: thread.id,
        authorId: userId,
        body,
      },
    });

    const now = new Date();
    await prisma.communityThread.update({
      where: { id: thread.id },
      data: {
        postsCount: { increment: 1 },
        lastActivityAt: now,
        updatedAt: now,
      },
    });
    communityPosts += 1;
  }

  const questions = await prisma.communityQuestion.findMany({
    orderBy: { createdAt: 'desc' },
    take: 2,
    select: { id: true, votesCount: true },
  });

  let communityVotes = 0;
  for (const question of questions) {
    const existing = await prisma.communityVote.findUnique({
      where: {
        userId_targetType_targetId: {
          userId,
          targetType: CommunityVoteTargetType.question,
          targetId: question.id,
        },
      },
    });
    if (!existing) {
      await prisma.communityVote.create({
        data: {
          userId,
          targetType: CommunityVoteTargetType.question,
          targetId: question.id,
          value: 1,
        },
      });
      await prisma.communityQuestion.update({
        where: { id: question.id },
        data: { votesCount: { increment: 1 } },
      });
      communityVotes += 1;
    }
  }

  const answer = await prisma.communityAnswer.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { id: true, votesCount: true },
  });
  if (answer) {
    const existing = await prisma.communityVote.findUnique({
      where: {
        userId_targetType_targetId: {
          userId,
          targetType: CommunityVoteTargetType.answer,
          targetId: answer.id,
        },
      },
    });
    if (!existing) {
      await prisma.communityVote.create({
        data: {
          userId,
          targetType: CommunityVoteTargetType.answer,
          targetId: answer.id,
          value: 1,
        },
      });
      await prisma.communityAnswer.update({
        where: { id: answer.id },
        data: { votesCount: { increment: 1 } },
      });
      communityVotes += 1;
    }
  }

  return { communityPosts, communityVotes };
}

export async function seedDemoShowcaseData(
  prisma: PrismaClient,
  options?: DemoShowcaseOptions,
): Promise<DemoShowcaseResult> {
  const log = options?.log ?? (() => {});

  const demoUser = await resolveDemoUser(prisma);
  if (!demoUser) {
    log(`⏭ Demo showcase skipped — ${DEMO_SHOWCASE_EMAIL} not found`);
    return {
      skipped: true,
      reason: 'demo user not found',
      profileUpdated: false,
      credentialPasswordSet: false,
      plannedCourses: 0,
      submissions: 0,
      assignmentSubmissions: 0,
      dailyAssignments: 0,
      nibras75Progress: 0,
      cpRoadmapProgress: 0,
      badgesAwarded: 0,
      communityPosts: 0,
      communityVotes: 0,
      reputationEvents: 0,
    };
  }

  const instructor = await resolveInstructorUser(prisma);

  log(`🎬 Seeding demo showcase for ${DEMO_SHOWCASE_EMAIL}…`);

  await seedLocalDevCredentials(prisma, { log });

  const { profileUpdated, credentialPasswordSet } = await seedDemoProfile(
    prisma,
    demoUser.id,
  );
  if (credentialPasswordSet) {
    log(
      `  → demo credential password set (${resolveDemoPassword() === DEFAULT_LOCAL_DEV_PASSWORD ? 'default local123' : 'from NIBRAS_DEMO_PASSWORD'})`,
    );
  }

  const plannedCourses = await seedPlanner(prisma, demoUser.id);
  log(`  → ${plannedCourses} planned course(s)`);

  const submissions = await seedDashboardSubmissions(
    prisma,
    demoUser.id,
    instructor?.id ?? null,
  );
  log(`  → ${submissions} submission(s)`);

  const assignmentSubmissions = await seedAssignmentSubmissions(
    prisma,
    demoUser.id,
  );
  log(`  → ${assignmentSubmissions} assignment submission(s)`);

  const problemIdBySlug = await ensureLeetcodeProblems(prisma);
  const problemIds = [...problemIdBySlug.values()];

  const dailyAssignments = await seedDailyProblem(
    prisma,
    demoUser.id,
    problemIds,
  );
  log(`  → ${dailyAssignments} daily assignment(s)`);

  const nibras75Progress = await seedNibras75Progress(
    prisma,
    demoUser.id,
    problemIdBySlug,
  );
  log(`  → ${nibras75Progress} Nibras 75 progress row(s)`);

  const cpRoadmapProgress = await seedCpRoadmapProgress(prisma, demoUser.id);
  log(`  → ${cpRoadmapProgress} CP Roadmap progress row(s)`);

  const { badgesAwarded, reputationEvents } = await seedGamification(
    prisma,
    demoUser.id,
  );
  log(`  → ${badgesAwarded} badge(s), ${reputationEvents} reputation event(s)`);

  const { communityPosts, communityVotes } = await seedCommunityEngagement(
    prisma,
    demoUser.id,
  );
  log(`  → ${communityPosts} community post(s), ${communityVotes} vote(s)`);

  log('✅ Demo showcase seed complete');

  return {
    skipped: false,
    profileUpdated,
    credentialPasswordSet,
    plannedCourses,
    submissions,
    assignmentSubmissions,
    dailyAssignments,
    nibras75Progress,
    cpRoadmapProgress,
    badgesAwarded,
    communityPosts,
    communityVotes,
    reputationEvents,
  };
}
