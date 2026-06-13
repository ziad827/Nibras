import type { PrismaClient } from '@prisma/client';
import type { RoutingResponse, RoutingStep } from '@nibras/contracts';

type CourseCandidate = {
  id: string;
  title: string;
  courseCode: string | null;
  topics: string[];
};

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function scoreTopicMatch(
  stepTopics: string[],
  candidate: CourseCandidate,
): number {
  const haystack = normalizeText(
    [candidate.title, candidate.courseCode ?? '', ...candidate.topics].join(
      ' ',
    ),
  );
  let score = 0;
  for (const topic of stepTopics) {
    const needle = normalizeText(topic);
    if (!needle) continue;
    if (haystack.includes(needle)) score += 2;
    else {
      for (const word of needle.split(' ')) {
        if (word.length >= 4 && haystack.includes(word)) score += 0.5;
      }
    }
  }
  return score;
}

async function loadCourseCandidates(
  prisma: PrismaClient,
  userId: string,
): Promise<CourseCandidate[]> {
  const memberships = await prisma.courseMembership.findMany({
    where: { userId },
    include: {
      course: {
        select: {
          id: true,
          title: true,
          courseCode: true,
          syllabusJson: true,
        },
      },
    },
    take: 20,
  });

  return memberships.map((m) => {
    const syllabus = m.course.syllabusJson as { topics?: string[] } | null;
    return {
      id: m.course.id,
      title: m.course.title,
      courseCode: m.course.courseCode,
      topics: Array.isArray(syllabus?.topics)
        ? syllabus!.topics.map(String)
        : [],
    };
  });
}

export async function enrichRoutingResponse(
  prisma: PrismaClient,
  userId: string,
  route: RoutingResponse,
): Promise<RoutingResponse> {
  const candidates = await loadCourseCandidates(prisma, userId);

  const studentProgram = await prisma.studentProgram.findFirst({
    where: { userId, status: 'enrolled' },
    include: {
      plannedCourses: {
        include: {
          catalogCourse: {
            select: { id: true, title: true, trackingCourseId: true },
          },
        },
      },
    },
  });

  const plannedTrackingIds = new Set(
    studentProgram?.plannedCourses
      .map((pc) => pc.catalogCourse.trackingCourseId)
      .filter(Boolean) as string[],
  );

  const enrichedSteps: RoutingStep[] = route.steps.map((step) => {
    const topics = step.topics ?? [];
    let best: CourseCandidate | null = null;
    let bestScore = 0;

    for (const candidate of candidates) {
      const score = scoreTopicMatch(topics, candidate);
      if (score > bestScore) {
        bestScore = score;
        best = candidate;
      }
    }

    if (best && bestScore >= 1) {
      const ready = plannedTrackingIds.has(best.id) || step.ready;
      return {
        ...step,
        ready,
        resourceUrl: `/catalog/${best.id}`,
        matchedCourseTitle: best.title,
      };
    }

    if (
      /practice|problem|exercise|leetcode|codeforces/i.test(
        step.title + (step.description ?? ''),
      )
    ) {
      return {
        ...step,
        resourceUrl: step.resourceUrl ?? '/competitions/daily',
      };
    }

    if (
      /plan|degree|planner|prerequisite/i.test(
        step.title + (step.description ?? ''),
      )
    ) {
      return {
        ...step,
        resourceUrl: step.resourceUrl ?? '/planner',
      };
    }

    if (topics.length > 0) {
      return {
        ...step,
        resourceUrl:
          step.resourceUrl ??
          `/tutor?prompt=${encodeURIComponent(`Explain ${topics[0]}`)}`,
      };
    }

    return step;
  });

  return { ...route, steps: enrichedSteps };
}
