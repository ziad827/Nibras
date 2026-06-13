import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import {
  AiRecommendationsResponseSchema,
  RouteQuestionRequestSchema,
  RouteQuestionResponseSchema,
  SimilarQuestionsResponseSchema,
  SuggestAnswerRequestSchema,
  SuggestAnswerResponseSchema,
} from '@nibras/contracts';
import { requireUser } from '../../lib/auth';
import { Errors } from '../../lib/errors';
import { validateId } from '../../lib/validate';
import { AppStore } from '../../store';

const DEFAULT_SIMILARITY_THRESHOLD = 0.5;

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length >= 3);
}

function cosineSimilarity(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const freqA = new Map<string, number>();
  const freqB = new Map<string, number>();
  for (const token of a) freqA.set(token, (freqA.get(token) ?? 0) + 1);
  for (const token of b) freqB.set(token, (freqB.get(token) ?? 0) + 1);
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (const [, count] of freqA) normA += count * count;
  for (const [, count] of freqB) normB += count * count;
  for (const [token, countA] of freqA) {
    const countB = freqB.get(token) ?? 0;
    dot += countA * countB;
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function tutorOrigin(): string | null {
  const raw = process.env.NIBRAS_TUTOR_ORIGIN || process.env.TUTOR_ORIGIN || '';
  return raw.trim().replace(/\/$/, '') || null;
}

export function registerAiRoutes(
  app: FastifyInstance,
  store: AppStore,
  prisma: PrismaClient,
): void {
  app.post(
    '/v1/ai/route-question',
    {
      schema: {
        tags: ['ai'],
        summary: 'Rank qualified responders for a question',
      },
    },
    async (request, reply) => {
      const auth = await requireUser(request, reply, store);
      if (!auth) return;
      const body = RouteQuestionRequestSchema.parse(request.body ?? {});
      const tokens = tokenize(`${body.title} ${body.body ?? ''}`);

      const memberships = await prisma.courseMembership.findMany({
        where: {
          role: { in: ['instructor', 'ta'] },
          ...(body.courseId ? { courseId: body.courseId } : {}),
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              communityAnswers: {
                take: 20,
                orderBy: { createdAt: 'desc' },
                select: { body: true, votesCount: true },
              },
            },
          },
        },
        take: 50,
      });

      const answerLoad = await prisma.communityAnswer.groupBy({
        by: ['authorId'],
        _count: { _all: true },
        where: {
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      });
      const loadByUser = new Map(
        answerLoad.map((row) => [row.authorId, row._count._all]),
      );

      const responders = memberships
        .map((membership) => {
          const expertiseText = membership.user.communityAnswers
            .map((answer) => answer.body)
            .join(' ');
          const topicScore = cosineSimilarity(tokens, tokenize(expertiseText));
          const reputationBoost =
            membership.user.communityAnswers.reduce(
              (sum, answer) => sum + answer.votesCount,
              0,
            ) * 0.05;
          const load = loadByUser.get(membership.user.id) ?? 0;
          const loadPenalty = Math.min(load * 0.1, 2);
          const urgentBoost = body.urgent ? 0.5 : 0;
          const score =
            topicScore * 10 + reputationBoost + urgentBoost - loadPenalty;
          const reasons: string[] = [];
          if (topicScore >= 0.2) reasons.push('topic_match');
          if (reputationBoost > 0) reasons.push('community_reputation');
          if (load > 5) reasons.push('high_load');
          if (body.urgent) reasons.push('urgent_priority');
          return {
            userId: membership.user.id,
            username: membership.user.username,
            score: Math.round(score * 100) / 100,
            reasons,
          };
        })
        .filter((entry) => entry.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

      await prisma.aIInteraction.create({
        data: {
          userId: auth.user.id,
          type: 'routing',
          inputJson: body,
          outputJson: { responders },
          confidence: responders.length > 0 ? 'medium' : 'low',
        },
      });

      return RouteQuestionResponseSchema.parse({ responders });
    },
  );

  app.post(
    '/v1/ai/check-duplicates',
    {
      schema: { tags: ['ai'], summary: 'Check for similar questions by title' },
    },
    async (request, reply) => {
      const auth = await requireUser(request, reply, store);
      if (!auth) return;
      const body = request.body as { title?: string; threshold?: number };
      if (!body.title?.trim()) {
        return reply.code(400).send(Errors.validation('title is required'));
      }
      const threshold =
        body.threshold != null
          ? Math.min(1, Math.max(0, Number(body.threshold)))
          : DEFAULT_SIMILARITY_THRESHOLD;
      const sourceTokens = tokenize(body.title);
      const candidates = await prisma.communityQuestion.findMany({
        where: { moderationStatus: 'visible' },
        orderBy: { createdAt: 'desc' },
        take: 200,
        select: { id: true, title: true, body: true, answersCount: true },
      });
      const duplicates = candidates
        .map((candidate) => ({
          questionId: candidate.id,
          title: candidate.title,
          score: cosineSimilarity(
            sourceTokens,
            tokenize(`${candidate.title} ${candidate.body}`),
          ),
          answersCount: candidate.answersCount,
        }))
        .filter((entry) => entry.score >= threshold)
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);
      return { duplicates, threshold };
    },
  );

  app.get(
    '/v1/ai/questions/:questionId/similar',
    { schema: { tags: ['ai'], summary: 'Find similar community questions' } },
    async (request, reply) => {
      const auth = await requireUser(request, reply, store);
      if (!auth) return;
      const params = request.params as { questionId: string };
      if (!validateId(params.questionId, reply, 'questionId')) return;
      const query = request.query as { threshold?: string };
      const threshold = query.threshold
        ? Math.min(1, Math.max(0, Number(query.threshold)))
        : DEFAULT_SIMILARITY_THRESHOLD;

      const question = await prisma.communityQuestion.findUnique({
        where: { id: params.questionId },
        select: { id: true, title: true, body: true },
      });
      if (!question) return reply.code(404).send(Errors.notFound('Question'));

      const sourceTokens = tokenize(`${question.title} ${question.body}`);
      const candidates = await prisma.communityQuestion.findMany({
        where: { id: { not: params.questionId }, moderationStatus: 'visible' },
        orderBy: { createdAt: 'desc' },
        take: 200,
        select: { id: true, title: true, body: true, answersCount: true },
      });

      const similar = candidates
        .map((candidate) => ({
          questionId: candidate.id,
          title: candidate.title,
          score: cosineSimilarity(
            sourceTokens,
            tokenize(`${candidate.title} ${candidate.body}`),
          ),
          answersCount: candidate.answersCount,
        }))
        .filter((entry) => entry.score >= threshold)
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);

      return SimilarQuestionsResponseSchema.parse({
        questionId: params.questionId,
        similar,
        threshold,
      });
    },
  );

  app.post(
    '/v1/ai/suggest-answer',
    {
      schema: {
        tags: ['ai'],
        summary: 'Generate AI-suggested answer for a question',
      },
    },
    async (request, reply) => {
      const auth = await requireUser(request, reply, store);
      if (!auth) return;
      const body = SuggestAnswerRequestSchema.parse(request.body ?? {});
      if (!validateId(body.questionId, reply, 'questionId')) return;

      const question = await prisma.communityQuestion.findUnique({
        where: { id: body.questionId },
        select: { id: true, title: true, body: true },
      });
      if (!question) return reply.code(404).send(Errors.notFound('Question'));

      const tutorUrl = tutorOrigin();
      let suggestedAnswer = '';
      let confidence: 'low' | 'medium' | 'high' = 'low';

      if (tutorUrl) {
        try {
          const resp = await fetch(`${tutorUrl}/api/ask`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              question: `${question.title}\n\n${question.body}`,
              user_id: auth.user.id,
            }),
            signal: AbortSignal.timeout(30000),
          });
          if (resp.ok) {
            const data = (await resp.json()) as {
              answer?: string;
              confidence?: string;
            };
            suggestedAnswer = data.answer?.trim() || '';
            if (data.confidence === 'high' || data.confidence === 'medium') {
              confidence = data.confidence;
            } else if (suggestedAnswer.length > 120) {
              confidence = 'medium';
            }
          }
        } catch {
          /* fall through to heuristic answer */
        }
      }

      if (!suggestedAnswer) {
        const topAnswers = await prisma.communityAnswer.findMany({
          where: { questionId: body.questionId },
          orderBy: [{ accepted: 'desc' }, { votesCount: 'desc' }],
          take: 3,
          select: { body: true },
        });
        if (topAnswers.length > 0) {
          suggestedAnswer = topAnswers
            .map((answer) => answer.body)
            .join('\n\n---\n\n');
          confidence = 'medium';
        } else {
          suggestedAnswer =
            'Consider breaking the problem into smaller steps, citing course materials, and sharing what you have tried so far.';
          confidence = 'low';
        }
      }

      const interaction = await prisma.aIInteraction.create({
        data: {
          userId: auth.user.id,
          type: 'suggestion',
          inputJson: { questionId: body.questionId },
          outputJson: { suggestedAnswer },
          confidence,
        },
      });

      return SuggestAnswerResponseSchema.parse({
        suggestedAnswer,
        confidence,
        interactionId: interaction.id,
      });
    },
  );

  app.get(
    '/v1/ai/recommendations',
    {
      schema: {
        tags: ['ai'],
        summary: 'Personalized learning recommendations',
      },
    },
    async (request, reply) => {
      const auth = await requireUser(request, reply, store);
      if (!auth) return;

      const recentFails = await prisma.submissionAttempt.findMany({
        where: { userId: auth.user.id, status: 'failed' },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          project: { select: { name: true, slug: true, courseId: true } },
        },
      });

      const weakAssignments = await prisma.assignmentSubmission.findMany({
        where: {
          userId: auth.user.id,
          OR: [{ score: { lt: 70 } }, { status: 'submitted', score: null }],
        },
        orderBy: { updatedAt: 'desc' },
        take: 5,
        include: { assignment: { select: { title: true, courseId: true } } },
      });

      const recommendations = [
        ...recentFails.map((submission) => ({
          type: 'practice_problem' as const,
          title: submission.project.name,
          reason: 'Recent failed submission — review fundamentals and retry.',
          url: `/v1/tracking/projects/${submission.projectId}`,
          difficulty: 'intermediate',
        })),
        ...weakAssignments.map((submission) => ({
          type: 'course_resource' as const,
          title: submission.assignment.title,
          reason:
            'Assignment score below target — revisit lecture notes and examples.',
          url: submission.assignment.courseId
            ? `/v1/tracking/courses/${submission.assignment.courseId}/assignments`
            : undefined,
          difficulty: 'beginner',
        })),
      ].slice(0, 8);

      await prisma.aIInteraction.create({
        data: {
          userId: auth.user.id,
          type: 'recommendation',
          inputJson: {},
          outputJson: { recommendations },
          confidence: recommendations.length > 0 ? 'medium' : 'low',
        },
      });

      return AiRecommendationsResponseSchema.parse({ recommendations });
    },
  );
}
