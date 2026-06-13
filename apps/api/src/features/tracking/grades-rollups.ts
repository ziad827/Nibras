import { PrismaClient } from '@prisma/client';

type ProjectGradeRow = {
  projectId: string;
  projectKey: string;
  title: string;
  status: string;
  score: number | null;
  maxScore: number | null;
};

type GradeProject = { id: string; slug: string; name: string };
type LatestSubmission = { status: string; score: number | null };
type GradeContext = {
  projects: GradeProject[];
  latestByUserProject: Map<string, Map<string, LatestSubmission>>;
};

async function loadLatestProjectSubmissions(
  prisma: PrismaClient,
  courseId: string,
  userIds: string[],
): Promise<GradeContext> {
  if (userIds.length === 0) {
    return { projects: [], latestByUserProject: new Map() };
  }
  const projects = await prisma.project.findMany({
    where: { courseId, deletedAt: null },
    select: { id: true, slug: true, name: true },
  });
  const projectIds = projects.map((project) => project.id);
  if (projectIds.length === 0) {
    return {
      projects,
      latestByUserProject: new Map<
        string,
        Map<string, { status: string; score: number | null }>
      >(),
    };
  }

  const submissions = await prisma.submissionAttempt.findMany({
    where: {
      userId: { in: userIds },
      projectId: { in: projectIds },
    },
    include: {
      reviews: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
    orderBy: { createdAt: 'desc' },
  });

  const latestByUserProject = new Map<
    string,
    Map<string, { status: string; score: number | null }>
  >();
  for (const userId of userIds) {
    latestByUserProject.set(userId, new Map());
  }
  for (const submission of submissions) {
    const userMap = latestByUserProject.get(submission.userId);
    if (!userMap || userMap.has(submission.projectId)) continue;
    const review = submission.reviews[0];
    userMap.set(submission.projectId, {
      status: submission.status,
      score: review?.score ?? null,
    });
  }

  return { projects, latestByUserProject };
}

function buildProjectGradesForUser(
  projects: Array<{ id: string; slug: string; name: string }>,
  latestByProject:
    | Map<string, { status: string; score: number | null }>
    | undefined,
): ProjectGradeRow[] {
  return projects.map((project) => {
    const latest = latestByProject?.get(project.id);
    return {
      projectId: project.id,
      projectKey: project.slug,
      title: project.name,
      status: latest?.status ?? 'not_started',
      score: latest?.score ?? null,
      maxScore: null,
    };
  });
}

async function buildAssignmentGrades(
  prisma: PrismaClient,
  courseId: string,
  userId: string,
) {
  const assignments = await prisma.courseAssignment.findMany({
    where: { courseId, published: true },
    orderBy: { sortOrder: 'asc' },
  });
  const subs = await prisma.assignmentSubmission.findMany({
    where: {
      userId,
      assignmentId: { in: assignments.map((assignment) => assignment.id) },
    },
  });
  const subByAssignment = new Map(
    subs.map((submission) => [submission.assignmentId, submission]),
  );

  return assignments.map((assignment) => {
    const sub = subByAssignment.get(assignment.id);
    let status = 'not_started';
    if (sub?.status === 'graded') status = 'graded';
    else if (sub?.status === 'submitted') status = 'submitted';
    else if (sub?.content) status = 'in_progress';
    return {
      assignmentId: assignment.id,
      title: assignment.title,
      status,
      score: sub?.score ?? null,
      pointsPossible: assignment.pointsPossible,
    };
  });
}

export async function buildStudentGradesRollup(
  prisma: PrismaClient,
  courseId: string,
  userId: string,
) {
  const { projects, latestByUserProject } = await loadLatestProjectSubmissions(
    prisma,
    courseId,
    [userId],
  );
  const projectGrades = buildProjectGradesForUser(
    projects,
    latestByUserProject.get(userId),
  );
  const assignmentGrades = await buildAssignmentGrades(
    prisma,
    courseId,
    userId,
  );
  return { projects: projectGrades, assignments: assignmentGrades };
}

export async function buildInstructorGradesRollups(
  prisma: PrismaClient,
  courseId: string,
  userIds: string[],
  projects: Array<{ id: string; slug: string; name: string }>,
  latestByUserProject: Map<
    string,
    Map<string, { status: string; score: number | null }>
  >,
) {
  const assignments = await prisma.courseAssignment.findMany({
    where: { courseId, published: true },
    orderBy: { sortOrder: 'asc' },
  });
  const assignmentIds = assignments.map((assignment) => assignment.id);
  const allAssignmentSubs =
    userIds.length > 0 && assignmentIds.length > 0
      ? await prisma.assignmentSubmission.findMany({
          where: {
            userId: { in: userIds },
            assignmentId: { in: assignmentIds },
          },
        })
      : [];
  const assignmentSubsByUser = new Map<
    string,
    Map<string, (typeof allAssignmentSubs)[number]>
  >();
  for (const userId of userIds) {
    assignmentSubsByUser.set(userId, new Map());
  }
  for (const submission of allAssignmentSubs) {
    assignmentSubsByUser
      .get(submission.userId)
      ?.set(submission.assignmentId, submission);
  }

  return userIds.map((userId) => {
    const projectGrades = buildProjectGradesForUser(
      projects,
      latestByUserProject.get(userId),
    );
    const subByAssignment = assignmentSubsByUser.get(userId) ?? new Map();
    const assignmentGrades = assignments.map((assignment) => {
      const sub = subByAssignment.get(assignment.id);
      let status = 'not_started';
      if (sub?.status === 'graded') status = 'graded';
      else if (sub?.status === 'submitted') status = 'submitted';
      else if (sub?.content) status = 'in_progress';
      return {
        assignmentId: assignment.id,
        title: assignment.title,
        status,
        score: sub?.score ?? null,
        pointsPossible: assignment.pointsPossible,
      };
    });
    return { userId, projects: projectGrades, assignments: assignmentGrades };
  });
}

export async function loadCourseGradeContext(
  prisma: PrismaClient,
  courseId: string,
  userIds: string[],
) {
  return loadLatestProjectSubmissions(prisma, courseId, userIds);
}
