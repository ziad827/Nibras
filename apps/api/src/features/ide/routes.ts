import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import {
  IdeLanguagesResponseSchema,
  IdeRunRequestSchema,
  IdeRunResponseSchema,
  IdeStatusResponseSchema,
  IdeVerifyProblemRequestSchema,
  IdeVerifyProblemResponseSchema,
} from '@nibras/contracts';
import { requireUser } from '../../lib/auth';
import { Errors } from '../../lib/errors';
import { AppStore } from '../../store';
import {
  checkJudge0Reachable,
  isJudge0Configured,
  listJudge0Languages,
  normalizeJudge0Result,
  runJudge0Submission,
} from './judge0-client';
import {
  filterCuratedLanguages,
  getCachedLanguages,
  setCachedLanguages,
} from './languages';
import { verifyIdeProblem } from './verify-problem';

export function registerIdeRoutes(
  app: FastifyInstance,
  store: AppStore,
  prisma: PrismaClient | null,
): void {
  app.get(
    '/v1/ide/status',
    {
      schema: {
        tags: ['ide'],
        summary: 'Check Judge0 IDE sandbox availability',
      },
    },
    async () => {
      const configured = isJudge0Configured();
      const reachable = configured ? await checkJudge0Reachable() : false;
      const cpuTimeLimitSeconds = Number.parseFloat(
        process.env.JUDGE0_CPU_TIME_LIMIT || '5',
      );
      const memoryLimitKb = Number.parseInt(
        process.env.JUDGE0_MEMORY_LIMIT || '128000',
        10,
      );
      return IdeStatusResponseSchema.parse({
        configured,
        reachable,
        cpuTimeLimitSeconds: Number.isFinite(cpuTimeLimitSeconds)
          ? cpuTimeLimitSeconds
          : 5,
        memoryLimitKb: Number.isFinite(memoryLimitKb) ? memoryLimitKb : 128000,
      });
    },
  );

  app.get(
    '/v1/ide/languages',
    {
      schema: {
        tags: ['ide'],
        summary: 'List curated Judge0 languages for the IDE',
      },
    },
    async (request, reply) => {
      const auth = await requireUser(request, reply, store);
      if (!auth) return;

      if (!isJudge0Configured()) {
        reply
          .code(503)
          .send(Errors.unavailable('Code sandbox is not configured.'));
        return;
      }

      const cached = getCachedLanguages();
      if (cached) {
        return IdeLanguagesResponseSchema.parse({ languages: cached });
      }

      try {
        const allLanguages = await listJudge0Languages();
        const languages = filterCuratedLanguages(allLanguages);
        setCachedLanguages(languages);
        return IdeLanguagesResponseSchema.parse({ languages });
      } catch {
        reply
          .code(503)
          .send(Errors.unavailable('Code sandbox is temporarily unavailable.'));
      }
    },
  );

  app.post(
    '/v1/ide/run',
    {
      config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
      schema: {
        tags: ['ide'],
        summary: 'Run source code in the Judge0 sandbox',
      },
    },
    async (request, reply) => {
      const auth = await requireUser(request, reply, store);
      if (!auth) return;

      if (!isJudge0Configured()) {
        reply
          .code(503)
          .send(Errors.unavailable('Code sandbox is not configured.'));
        return;
      }

      const payload = IdeRunRequestSchema.parse(request.body);

      try {
        const result = await runJudge0Submission({
          sourceCode: payload.sourceCode,
          languageId: payload.languageId,
          stdin: payload.stdin,
        });
        return IdeRunResponseSchema.parse(normalizeJudge0Result(result));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Code execution failed.';
        reply.code(503).send(Errors.unavailable(message));
      }
    },
  );

  app.post(
    '/v1/ide/verify-problem',
    {
      schema: {
        tags: ['ide'],
        summary: 'Verify problem solved on linked platform',
      },
    },
    async (request, reply) => {
      const auth = await requireUser(request, reply, store);
      if (!auth) return;

      if (!prisma) {
        reply.code(503).send(Errors.unavailable('Database is not configured.'));
        return;
      }

      const payload = IdeVerifyProblemRequestSchema.parse(request.body);
      const result = await verifyIdeProblem(prisma, auth.user.id, payload);
      if (!result.verified) {
        return reply
          .code(400)
          .send(IdeVerifyProblemResponseSchema.parse(result));
      }
      return IdeVerifyProblemResponseSchema.parse(result);
    },
  );
}
