import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { requireUser } from '../../lib/auth';
import { requestBaseUrl } from '../../lib/request-base-url';
import { AppStore } from '../../store';
import { resolveProfileVisibility } from '../users/policies/visibility';
import { ReputationService } from './service';

export function registerReputationRoutes(
  app: FastifyInstance,
  store: AppStore,
  prisma: PrismaClient,
): void {
  const reputation = new ReputationService(prisma);

  app.get(
    '/v1/reputation/me',
    { schema: { tags: ['reputation'], summary: 'Get my reputation' } },
    async (request, reply) => {
      const auth = await requireUser(request, reply, store);
      if (!auth) return;
      const query = request.query as { sync?: string };
      const sync = query.sync === 'true' || query.sync === '1';
      return reputation.getMyReputation(auth.user.id, { sync });
    },
  );

  app.get(
    '/v1/reputation/:userId',
    {
      schema: {
        tags: ['reputation'],
        summary: 'Get user reputation (visibility-scoped)',
      },
    },
    async (request, reply) => {
      const auth = await requireUser(request, reply, store);
      if (!auth) return;
      const params = request.params as { userId: string };
      const apiBaseUrl = requestBaseUrl(request);
      const visibility = await resolveProfileVisibility(
        auth,
        params.userId,
        store,
        apiBaseUrl,
        prisma,
      );
      if (!visibility.allowed) {
        return reply
          .status(403)
          .send({ code: 'FORBIDDEN', message: 'Not allowed' });
      }
      return reputation.getUserReputation(params.userId, visibility.viewerRole);
    },
  );
}
