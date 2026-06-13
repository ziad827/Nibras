import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { Errors } from '../../lib/errors';
import { requireInternalApiToken } from '../../lib/internal-auth';
import { authorSelect, presentAuthor } from '../community/present';

export function registerInternalTutorRoutes(
  app: FastifyInstance,
  prisma: PrismaClient,
): void {
  app.post(
    '/v1/internal/tutor/community-answers/:questionId',
    {
      schema: {
        tags: ['internal'],
        summary: 'Create a community answer as the tutor bot (internal only)',
      },
    },
    async (request, reply) => {
      if (!requireInternalApiToken(request, reply)) return;

      const botUserId = (
        process.env.TUTOR_BOT_USER_ID ||
        process.env.AI_USER_ID ||
        ''
      ).trim();
      if (!botUserId) {
        reply
          .code(503)
          .send(Errors.unavailable('TUTOR_BOT_USER_ID is not configured.'));
        return;
      }

      const { questionId } = request.params as { questionId: string };
      const body = request.body as { body?: string };
      if (!body.body?.trim()) {
        reply.code(400).send(Errors.validation('Answer body is required.'));
        return;
      }

      const botUser = await prisma.user.findUnique({
        where: { id: botUserId },
      });
      if (!botUser) {
        reply
          .code(503)
          .send(Errors.unavailable('TUTOR_BOT_USER_ID does not match a user.'));
        return;
      }

      const question = await prisma.communityQuestion.findUnique({
        where: { id: questionId },
      });
      if (!question) {
        reply.code(404).send(Errors.notFound('Question'));
        return;
      }

      const answer = await prisma.communityAnswer.create({
        data: {
          questionId,
          authorId: botUserId,
          body: body.body.trim(),
        },
        include: { author: { select: authorSelect } },
      });

      const answerCount = await prisma.communityAnswer.count({
        where: { questionId },
      });
      await prisma.communityQuestion.update({
        where: { id: questionId },
        data: { answersCount: answerCount, updatedAt: new Date() },
      });

      reply.code(201);
      return {
        answer: {
          ...answer,
          _id: answer.id,
          author: presentAuthor(answer.author),
        },
      };
    },
  );
}
