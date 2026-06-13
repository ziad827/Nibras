/**
 * Community seed — idempotent discussions and questions derived from course curriculum.
 */
import {
  CourseRole,
  type Prisma,
  type PrismaClient,
  SystemRole,
} from '@prisma/client';

/** Legacy placeholder tag — purged on each sync. */
export const COMMUNITY_LEGACY_SEED_TAG = 'nibras-seed';

/** Idempotency tag for curriculum-derived seed content. */
export const COMMUNITY_CURRICULUM_SEED_TAG = 'nibras-curriculum-seed';

/** @deprecated Use COMMUNITY_LEGACY_SEED_TAG */
export const COMMUNITY_SEED_TAG = COMMUNITY_LEGACY_SEED_TAG;

export type CommunitySeedOptions = {
  log?: (msg: string) => void;
};

export type CommunitySeedResult = {
  legacyPurged: {
    threads: number;
    questions: number;
    posts: number;
    answers: number;
  };
  coursesProcessed: number;
  coursesSkipped: number;
  coursesWithoutAuthor: number;
  threadsCreated: number;
  questionsCreated: number;
  answersCreated: number;
};

type CourseAssignmentRow = {
  id: string;
  title: string;
  description: string;
  content: string;
};

type CourseWithCurriculum = {
  id: string;
  slug: string;
  courseCode: string;
  title: string;
  description: string;
  syllabusJson: Prisma.JsonValue;
  assignments: CourseAssignmentRow[];
  sections: Array<{ title: string }>;
};

export async function purgeLegacyCommunitySeed(prisma: PrismaClient): Promise<{
  threads: number;
  questions: number;
  posts: number;
  answers: number;
}> {
  const legacyThreadIds = (
    await prisma.communityThread.findMany({
      where: { tags: { has: COMMUNITY_LEGACY_SEED_TAG } },
      select: { id: true },
    })
  ).map((t) => t.id);

  let posts = 0;
  if (legacyThreadIds.length > 0) {
    posts = (
      await prisma.communityPost.deleteMany({
        where: { threadId: { in: legacyThreadIds } },
      })
    ).count;
  }

  const threads = (
    await prisma.communityThread.deleteMany({
      where: { tags: { has: COMMUNITY_LEGACY_SEED_TAG } },
    })
  ).count;

  const legacyQuestionIds = (
    await prisma.communityQuestion.findMany({
      where: { tags: { has: COMMUNITY_LEGACY_SEED_TAG } },
      select: { id: true },
    })
  ).map((q) => q.id);

  let answers = 0;
  if (legacyQuestionIds.length > 0) {
    answers = (
      await prisma.communityAnswer.deleteMany({
        where: { questionId: { in: legacyQuestionIds } },
      })
    ).count;
  }

  const questions = (
    await prisma.communityQuestion.deleteMany({
      where: { tags: { has: COMMUNITY_LEGACY_SEED_TAG } },
    })
  ).count;

  return { threads, questions, posts, answers };
}

function parseSyllabusTopics(syllabusJson: Prisma.JsonValue): string[] {
  if (
    !syllabusJson ||
    typeof syllabusJson !== 'object' ||
    Array.isArray(syllabusJson)
  ) {
    return [];
  }
  const topics = (syllabusJson as { topics?: unknown }).topics;
  if (!Array.isArray(topics)) return [];
  return topics.filter(
    (t): t is string => typeof t === 'string' && t.trim().length > 0,
  );
}

export function extractAssignmentExcerpt(content: string): string {
  const trimmed = content.trim();
  if (!trimmed) return '';

  const overviewMatch = trimmed.match(
    /##\s+Overview\s*\n([\s\S]*?)(?=\n##|\n#|$)/i,
  );
  if (overviewMatch?.[1]?.trim()) {
    return overviewMatch[1].trim().slice(0, 1200);
  }

  const withoutTitle = trimmed.replace(/^#\s+.+\n+/, '');
  const firstSection = withoutTitle.match(/^([\s\S]*?)(?=\n##|\n#|$)/);
  if (firstSection?.[1]?.trim()) {
    return firstSection[1].trim().slice(0, 1200);
  }

  return trimmed.slice(0, 400);
}

async function resolveCourseInstructor(
  prisma: PrismaClient,
  courseId: string,
): Promise<string | null> {
  const membership = await prisma.courseMembership.findFirst({
    where: { courseId, role: CourseRole.instructor },
    orderBy: { createdAt: 'asc' },
    select: { userId: true },
  });
  if (membership) return membership.userId;

  const admin = await prisma.user.findFirst({
    where: { systemRole: SystemRole.admin },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });
  return admin?.id ?? null;
}

async function upsertCommunityTags(
  tx: Pick<PrismaClient, 'communityTag'>,
  tags: string[],
): Promise<void> {
  for (const tag of tags) {
    await tx.communityTag.upsert({
      where: { name: tag },
      create: { name: tag, usageCount: 1 },
      update: { usageCount: { increment: 1 } },
    });
  }
}

function buildOverviewThreadBody(
  course: CourseWithCurriculum,
  topics: string[],
): string {
  const lines = [`## ${course.title}`, ''];

  if (course.description.trim()) {
    lines.push(course.description.trim(), '');
  }

  if (topics.length > 0) {
    lines.push('### Syllabus topics', '');
    for (const topic of topics) {
      lines.push(`- ${topic}`);
    }
    lines.push('');
  }

  if (course.sections.length > 0) {
    lines.push('### Course sections', '');
    for (const section of course.sections) {
      lines.push(`- ${section.title}`);
    }
    lines.push('');
  }

  lines.push(
    `Browse materials in the [course catalog](/catalog/${course.id}).`,
  );
  return lines.join('\n');
}

function buildAssignmentThreadBody(
  course: CourseWithCurriculum,
  assignment: CourseAssignmentRow | null,
  fallbackLabel: string,
): { title: string; body: string } {
  if (assignment) {
    const bodyParts = [assignment.description.trim()].filter(Boolean);
    bodyParts.push(
      '',
      `Discuss this assignment in the thread below. Full brief: [${assignment.title}](/catalog/${course.id}).`,
    );
    return {
      title: assignment.title,
      body: bodyParts.join('\n'),
    };
  }

  return {
    title: `Discussion: ${fallbackLabel}`,
    body: [
      course.description.trim() ||
        `Discussion for **${course.courseCode}** — ${fallbackLabel}.`,
      '',
      `Related materials: [course catalog](/catalog/${course.id}).`,
    ].join('\n'),
  };
}

function buildQuestionContent(
  course: CourseWithCurriculum,
  assignment: CourseAssignmentRow | null,
  fallbackLabel: string,
): { title: string; body: string; answerBody: string } {
  if (assignment) {
    const answerBody =
      extractAssignmentExcerpt(assignment.content) ||
      assignment.description.trim() ||
      `See the full assignment brief for ${assignment.title} in the course catalog.`;

    return {
      title: `${assignment.title} — discussion`,
      body:
        assignment.description.trim() ||
        `Questions about ${assignment.title} in ${course.courseCode}.`,
      answerBody,
    };
  }

  return {
    title: `${course.courseCode}: ${fallbackLabel} — questions`,
    body:
      course.description.trim() ||
      `Questions about **${fallbackLabel}** in ${course.courseCode} (${course.title}).`,
    answerBody:
      course.description.trim() ||
      `Refer to the ${course.courseCode} syllabus and course catalog.`,
  };
}

function resolveFallbackLabel(
  course: CourseWithCurriculum,
  topics: string[],
): string {
  if (topics[0]) return topics[0];
  if (course.sections[0]?.title) return course.sections[0].title;
  return course.title;
}

async function seedCourseCommunity(
  prisma: PrismaClient,
  course: CourseWithCurriculum,
  log: (msg: string) => void,
): Promise<{
  skipped: boolean;
  withoutAuthor: boolean;
  threadsCreated: number;
  questionsCreated: number;
  answersCreated: number;
}> {
  const existing = await prisma.communityThread.findFirst({
    where: {
      courseId: course.id,
      tags: { has: COMMUNITY_CURRICULUM_SEED_TAG },
    },
    select: { id: true },
  });
  if (existing) {
    return {
      skipped: true,
      withoutAuthor: false,
      threadsCreated: 0,
      questionsCreated: 0,
      answersCreated: 0,
    };
  }

  const authorId = await resolveCourseInstructor(prisma, course.id);
  if (!authorId) {
    log(`   ⚠️  ${course.courseCode}: no instructor — skipped`);
    return {
      skipped: true,
      withoutAuthor: true,
      threadsCreated: 0,
      questionsCreated: 0,
      answersCreated: 0,
    };
  }

  const topics = parseSyllabusTopics(course.syllabusJson);
  const primaryAssignment = course.assignments[0] ?? null;
  const fallbackLabel = resolveFallbackLabel(course, topics);
  const assignmentThread = buildAssignmentThreadBody(
    course,
    primaryAssignment,
    fallbackLabel,
  );
  const questionContent = buildQuestionContent(
    course,
    primaryAssignment,
    fallbackLabel,
  );
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.communityThread.create({
      data: {
        courseId: course.id,
        authorId,
        title: `${course.courseCode} — syllabus & topics`,
        body: buildOverviewThreadBody(course, topics),
        tags: [course.slug, 'syllabus', COMMUNITY_CURRICULUM_SEED_TAG],
        pinned: true,
        lastActivityAt: now,
      },
    });

    await tx.communityThread.create({
      data: {
        courseId: course.id,
        authorId,
        title: assignmentThread.title,
        body: assignmentThread.body,
        tags: [course.slug, 'assignment', COMMUNITY_CURRICULUM_SEED_TAG],
        lastActivityAt: now,
      },
    });

    const questionTags = [
      course.slug,
      'course-help',
      COMMUNITY_CURRICULUM_SEED_TAG,
    ];
    const question = await tx.communityQuestion.create({
      data: {
        authorId,
        title: questionContent.title,
        body: questionContent.body,
        tags: questionTags,
      },
    });

    const answer = await tx.communityAnswer.create({
      data: {
        questionId: question.id,
        authorId,
        body: questionContent.answerBody,
        accepted: true,
      },
    });

    await tx.communityQuestion.update({
      where: { id: question.id },
      data: {
        acceptedAnswerId: answer.id,
        answersCount: 1,
      },
    });

    await upsertCommunityTags(tx, questionTags);
  });

  log(
    `   ${course.courseCode}: syllabus + assignment threads, Q&A from curriculum`,
  );

  return {
    skipped: false,
    withoutAuthor: false,
    threadsCreated: 2,
    questionsCreated: 1,
    answersCreated: 1,
  };
}

export async function seedCommunityContent(
  prisma: PrismaClient,
  options?: CommunitySeedOptions,
): Promise<CommunitySeedResult> {
  const log = options?.log ?? (() => {});

  const legacyPurged = await purgeLegacyCommunitySeed(prisma);
  if (legacyPurged.threads > 0 || legacyPurged.questions > 0) {
    log(
      `🧹 Purged legacy seed: ${legacyPurged.threads} thread(s), ${legacyPurged.questions} question(s)`,
    );
  }

  const courses = await prisma.course.findMany({
    where: { deletedAt: null, isActive: true },
    select: {
      id: true,
      slug: true,
      courseCode: true,
      title: true,
      description: true,
      syllabusJson: true,
      assignments: {
        where: { published: true },
        orderBy: { sortOrder: 'asc' },
        take: 2,
        select: { id: true, title: true, description: true, content: true },
      },
      sections: {
        orderBy: { sortOrder: 'asc' },
        take: 8,
        select: { title: true },
      },
    },
    orderBy: { title: 'asc' },
  });

  log(
    `🌱 Seeding curriculum community content for ${courses.length} active course(s)…`,
  );

  const result: CommunitySeedResult = {
    legacyPurged,
    coursesProcessed: 0,
    coursesSkipped: 0,
    coursesWithoutAuthor: 0,
    threadsCreated: 0,
    questionsCreated: 0,
    answersCreated: 0,
  };

  for (const course of courses) {
    const seeded = await seedCourseCommunity(prisma, course, log);
    if (seeded.skipped) {
      result.coursesSkipped += 1;
      if (seeded.withoutAuthor) {
        result.coursesWithoutAuthor += 1;
      }
    } else {
      result.coursesProcessed += 1;
      result.threadsCreated += seeded.threadsCreated;
      result.questionsCreated += seeded.questionsCreated;
      result.answersCreated += seeded.answersCreated;
    }
  }

  log(
    `✅ Community seed: ${result.coursesProcessed} course(s) updated, ${result.coursesSkipped} skipped`,
  );

  return result;
}
