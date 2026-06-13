import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import {
  ProjectCommitsResponseSchema,
  ProjectContributionsResponseSchema,
  ProjectGradeRequestSchema,
  ProjectGradeResponseSchema,
} from '@nibras/contracts';
import { requireUser } from '../../lib/auth';
import { Errors } from '../../lib/errors';
import { validateId } from '../../lib/validate';
import { AppStore } from '../../store';
import { requestBaseUrl } from '../../lib/request-base-url';
import { canManageProject, canViewCourseForRequest } from './policies/access';

async function loadProjectWithAccess(
  store: AppStore,
  apiBaseUrl: string,
  auth: Awaited<ReturnType<typeof requireUser>>,
  projectId: string,
  reply: import('fastify').FastifyReply,
  requireManage = false,
) {
  const project = await store.getTrackingProjectById(apiBaseUrl, projectId);
  if (!project) {
    reply.code(404).send(Errors.notFound('Project'));
    return null;
  }
  if (
    !project.courseId ||
    !(await canViewCourseForRequest(store, apiBaseUrl, auth!, project.courseId))
  ) {
    reply.code(403).send(Errors.forbidden());
    return null;
  }
  if (requireManage && !canManageProject(auth!, project)) {
    reply.code(403).send(Errors.forbidden());
    return null;
  }
  return project;
}

export function registerProjectAnalyticsRoutes(
  app: FastifyInstance,
  store: AppStore,
  prisma: PrismaClient,
): void {
  app.get(
    '/v1/tracking/projects/:projectId/commits',
    {
      schema: {
        tags: ['tracking'],
        summary: 'List GitHub commits for a project',
      },
    },
    async (request, reply) => {
      const auth = await requireUser(request, reply, store);
      if (!auth) return;
      const params = request.params as { projectId: string };
      if (!validateId(params.projectId, reply, 'projectId')) return;
      const apiBaseUrl = requestBaseUrl(request);
      const project = await loadProjectWithAccess(
        store,
        apiBaseUrl,
        auth,
        params.projectId,
        reply,
      );
      if (!project) return;

      const submissions = await prisma.submissionAttempt.findMany({
        where: { projectId: params.projectId },
        include: {
          user: { include: { githubAccount: { select: { login: true } } } },
          milestone: { select: { id: true, title: true } },
          githubDeliveries: { orderBy: { receivedAt: 'desc' } },
        },
      });

      const commits = submissions.flatMap((submission) =>
        submission.githubDeliveries.map((delivery) => ({
          commitSha: delivery.commitSha,
          repoUrl: delivery.repoUrl,
          ref: delivery.ref,
          eventType: delivery.eventType,
          receivedAt: delivery.receivedAt.toISOString(),
          submissionId: submission.id,
          userId: submission.userId,
          username: submission.user.username,
          githubLogin: submission.user.githubAccount?.login ?? null,
          milestoneId: submission.milestoneId,
          milestoneTitle: submission.milestone?.title ?? null,
        })),
      );

      return ProjectCommitsResponseSchema.parse({
        projectId: params.projectId,
        commits,
      });
    },
  );

  app.get(
    '/v1/tracking/projects/:projectId/contributions',
    {
      schema: {
        tags: ['tracking'],
        summary: 'Per-member contribution analytics for a project',
      },
    },
    async (request, reply) => {
      const auth = await requireUser(request, reply, store);
      if (!auth) return;
      const params = request.params as { projectId: string };
      if (!validateId(params.projectId, reply, 'projectId')) return;
      const apiBaseUrl = requestBaseUrl(request);
      const project = await loadProjectWithAccess(
        store,
        apiBaseUrl,
        auth,
        params.projectId,
        reply,
      );
      if (!project) return;

      const submissions = await prisma.submissionAttempt.findMany({
        where: { projectId: params.projectId },
        include: {
          user: { include: { githubAccount: { select: { login: true } } } },
          githubDeliveries: true,
        },
      });

      const byUser = new Map<
        string,
        {
          userId: string;
          username: string;
          githubLogin: string | null;
          submissionCount: number;
          commitCount: number;
          milestoneSubmissions: number;
        }
      >();

      for (const submission of submissions) {
        const existing = byUser.get(submission.userId) ?? {
          userId: submission.userId,
          username: submission.user.username,
          githubLogin: submission.user.githubAccount?.login ?? null,
          submissionCount: 0,
          commitCount: 0,
          milestoneSubmissions: 0,
        };
        existing.submissionCount += 1;
        if (submission.milestoneId) existing.milestoneSubmissions += 1;
        existing.commitCount += submission.githubDeliveries.length;
        byUser.set(submission.userId, existing);
      }

      const totalCommits = [...byUser.values()].reduce(
        (sum, m) => sum + m.commitCount,
        0,
      );
      const totalSubmissions = [...byUser.values()].reduce(
        (sum, m) => sum + m.submissionCount,
        0,
      );
      const members = [...byUser.values()].map((member) => ({
        ...member,
        sharePercent:
          totalCommits > 0
            ? Math.round((member.commitCount / totalCommits) * 1000) / 10
            : totalSubmissions > 0
              ? Math.round((member.submissionCount / totalSubmissions) * 1000) /
                10
              : 0,
      }));

      return ProjectContributionsResponseSchema.parse({
        projectId: params.projectId,
        members,
        totalCommits,
        totalSubmissions,
      });
    },
  );

  app.post(
    '/v1/tracking/projects/:projectId/grade',
    {
      schema: {
        tags: ['tracking'],
        summary: 'Compute weighted project grade from milestone reviews',
      },
    },
    async (request, reply) => {
      const auth = await requireUser(request, reply, store);
      if (!auth) return;
      const params = request.params as { projectId: string };
      if (!validateId(params.projectId, reply, 'projectId')) return;
      const apiBaseUrl = requestBaseUrl(request);
      const project = await loadProjectWithAccess(
        store,
        apiBaseUrl,
        auth,
        params.projectId,
        reply,
        true,
      );
      if (!project) return;

      const body = ProjectGradeRequestSchema.parse(request.body ?? {});

      const milestones = await prisma.milestone.findMany({
        where: { projectId: params.projectId },
        orderBy: { order: 'asc' },
      });

      const milestoneGrades = await Promise.all(
        milestones.map(async (milestone) => {
          const submissions = await prisma.submissionAttempt.findMany({
            where: { projectId: params.projectId, milestoneId: milestone.id },
            include: {
              reviews: {
                where: { status: { in: ['approved', 'graded'] } },
                orderBy: { reviewedAt: 'desc' },
                take: 1,
              },
            },
          });
          const scores = submissions
            .map((s) => s.reviews[0]?.score)
            .filter((score): score is number => score != null);
          const avgScore =
            scores.length > 0
              ? scores.reduce((a, b) => a + b, 0) / scores.length
              : null;
          const weight = milestones.length > 0 ? 1 / milestones.length : 0;
          return {
            milestoneId: milestone.id,
            milestoneTitle: milestone.title,
            weight,
            score: avgScore,
            maxScore: 100,
          };
        }),
      );

      const scored = milestoneGrades.filter((m) => m.score != null);
      const finalGrade =
        scored.length > 0
          ? Math.round(
              scored.reduce(
                (sum, m) => sum + (m.score as number) * m.weight,
                0,
              ) / scored.reduce((sum, m) => sum + m.weight, 0),
            )
          : null;

      return ProjectGradeResponseSchema.parse({
        projectId: params.projectId,
        finalGrade,
        milestoneGrades,
        memberGrades: body.memberGrades,
      });
    },
  );
}
