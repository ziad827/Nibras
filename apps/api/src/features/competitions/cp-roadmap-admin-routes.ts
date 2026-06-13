import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { requireUser } from '../../lib/auth';
import { Errors } from '../../lib/errors';
import { AppStore } from '../../store';
import {
  createCpRoadmapProblem,
  createCpRoadmapResource,
  createCpRoadmapTemplate,
  deleteCpRoadmapCategory,
  deleteCpRoadmapResource,
  deleteCpRoadmapSubCategory,
  deleteCpRoadmapTemplate,
  deleteCpRoadmapTopic,
  getTopicAdminDetail,
  listCpRoadmapSuggestions,
  loadAdminCurriculumTree,
  reviewCpRoadmapSuggestion,
  unlinkCpRoadmapProblem,
  updateCpRoadmapCategory,
  updateCpRoadmapProblem,
  updateCpRoadmapResource,
  updateCpRoadmapSubCategory,
  updateCpRoadmapTopic,
  upsertCpRoadmapCategory,
  upsertCpRoadmapSubCategory,
  upsertCpRoadmapTopic,
} from './practice/cp-roadmap/cp-roadmap-admin';

function requireAdmin(
  auth: Awaited<ReturnType<typeof requireUser>>,
  reply: Parameters<typeof requireUser>[1],
): auth is NonNullable<typeof auth> {
  if (!auth) return false;
  if (auth.user.systemRole !== 'admin') {
    reply.code(403).send(Errors.forbidden());
    return false;
  }
  return true;
}

export function registerCpRoadmapAdminRoutes(
  app: FastifyInstance,
  store: AppStore,
  prisma: PrismaClient,
): void {
  app.get(
    '/v1/admin/cp-roadmap/suggestions',
    {
      schema: {
        tags: ['admin'],
        summary: 'List CP roadmap problem suggestions',
      },
    },
    async (request, reply) => {
      const auth = await requireUser(request, reply, store);
      if (!requireAdmin(auth, reply)) return;
      const q = request.query as {
        status?: 'pending' | 'approved' | 'rejected';
      };
      const items = await listCpRoadmapSuggestions(prisma, q.status);
      return { items };
    },
  );

  app.patch(
    '/v1/admin/cp-roadmap/suggestions/:id',
    {
      schema: {
        tags: ['admin'],
        summary: 'Approve or reject a CP roadmap suggestion',
      },
    },
    async (request, reply) => {
      const auth = await requireUser(request, reply, store);
      if (!requireAdmin(auth, reply)) return;
      const { id } = request.params as { id: string };
      const body = request.body as { action?: 'approve' | 'reject' };
      if (body.action !== 'approve' && body.action !== 'reject') {
        return reply
          .code(400)
          .send({ error: 'action must be approve or reject' });
      }
      try {
        const item = await reviewCpRoadmapSuggestion(
          prisma,
          id,
          auth.user.id,
          body.action,
        );
        return { item };
      } catch (err) {
        return reply.code(400).send({
          error: err instanceof Error ? err.message : 'Review failed',
        });
      }
    },
  );

  app.get(
    '/v1/admin/cp-roadmap/curriculum',
    {
      schema: {
        tags: ['admin'],
        summary: 'CP roadmap curriculum tree for admin',
      },
    },
    async (request, reply) => {
      const auth = await requireUser(request, reply, store);
      if (!requireAdmin(auth, reply)) return;
      return { categories: await loadAdminCurriculumTree(prisma) };
    },
  );

  app.get(
    '/v1/admin/cp-roadmap/topics/:topicSlug',
    {
      schema: {
        tags: ['admin'],
        summary: 'CP roadmap topic detail for admin editing',
      },
    },
    async (request, reply) => {
      const auth = await requireUser(request, reply, store);
      if (!requireAdmin(auth, reply)) return;
      const { topicSlug } = request.params as { topicSlug: string };
      const topic = await getTopicAdminDetail(prisma, topicSlug);
      if (!topic) return reply.code(404).send({ error: 'Topic not found' });
      return { topic };
    },
  );

  app.post(
    '/v1/admin/cp-roadmap/categories',
    { schema: { tags: ['admin'], summary: 'Create CP roadmap category' } },
    async (request, reply) => {
      const auth = await requireUser(request, reply, store);
      if (!requireAdmin(auth, reply)) return;
      const body = request.body as {
        slug?: string;
        title?: string;
        description?: string | null;
        sortOrder?: number;
      };
      if (!body.title?.trim())
        return reply.code(400).send({ error: 'title required' });
      const category = await upsertCpRoadmapCategory(prisma, {
        slug: body.slug,
        title: body.title.trim(),
        description: body.description,
        sortOrder: body.sortOrder,
      });
      return { category };
    },
  );

  app.patch(
    '/v1/admin/cp-roadmap/categories/:slug',
    { schema: { tags: ['admin'], summary: 'Update CP roadmap category' } },
    async (request, reply) => {
      const auth = await requireUser(request, reply, store);
      if (!requireAdmin(auth, reply)) return;
      const { slug } = request.params as { slug: string };
      const body = request.body as {
        title?: string;
        description?: string | null;
        sortOrder?: number;
      };
      try {
        const category = await updateCpRoadmapCategory(prisma, slug, body);
        return { category };
      } catch {
        return reply.code(404).send({ error: 'Category not found' });
      }
    },
  );

  app.delete(
    '/v1/admin/cp-roadmap/categories/:slug',
    { schema: { tags: ['admin'], summary: 'Delete CP roadmap category' } },
    async (request, reply) => {
      const auth = await requireUser(request, reply, store);
      if (!requireAdmin(auth, reply)) return;
      const { slug } = request.params as { slug: string };
      try {
        await deleteCpRoadmapCategory(prisma, slug);
        return { ok: true };
      } catch {
        return reply.code(404).send({ error: 'Category not found' });
      }
    },
  );

  app.post(
    '/v1/admin/cp-roadmap/categories/:categorySlug/subcategories',
    { schema: { tags: ['admin'], summary: 'Create CP roadmap subcategory' } },
    async (request, reply) => {
      const auth = await requireUser(request, reply, store);
      if (!requireAdmin(auth, reply)) return;
      const { categorySlug } = request.params as { categorySlug: string };
      const body = request.body as {
        slug?: string;
        title?: string;
        description?: string | null;
        sortOrder?: number;
      };
      if (!body.title?.trim())
        return reply.code(400).send({ error: 'title required' });
      try {
        const subCategory = await upsertCpRoadmapSubCategory(
          prisma,
          categorySlug,
          {
            slug: body.slug,
            title: body.title.trim(),
            description: body.description,
            sortOrder: body.sortOrder,
          },
        );
        return { subCategory };
      } catch (err) {
        return reply
          .code(400)
          .send({ error: err instanceof Error ? err.message : 'Failed' });
      }
    },
  );

  app.patch(
    '/v1/admin/cp-roadmap/categories/:categorySlug/subcategories/:subSlug',
    { schema: { tags: ['admin'], summary: 'Update CP roadmap subcategory' } },
    async (request, reply) => {
      const auth = await requireUser(request, reply, store);
      if (!requireAdmin(auth, reply)) return;
      const { categorySlug, subSlug } = request.params as {
        categorySlug: string;
        subSlug: string;
      };
      const body = request.body as {
        title?: string;
        description?: string | null;
        sortOrder?: number;
      };
      try {
        const subCategory = await updateCpRoadmapSubCategory(
          prisma,
          categorySlug,
          subSlug,
          body,
        );
        return { subCategory };
      } catch (err) {
        return reply
          .code(400)
          .send({ error: err instanceof Error ? err.message : 'Failed' });
      }
    },
  );

  app.delete(
    '/v1/admin/cp-roadmap/categories/:categorySlug/subcategories/:subSlug',
    { schema: { tags: ['admin'], summary: 'Delete CP roadmap subcategory' } },
    async (request, reply) => {
      const auth = await requireUser(request, reply, store);
      if (!requireAdmin(auth, reply)) return;
      const { categorySlug, subSlug } = request.params as {
        categorySlug: string;
        subSlug: string;
      };
      try {
        await deleteCpRoadmapSubCategory(prisma, categorySlug, subSlug);
        return { ok: true };
      } catch (err) {
        return reply
          .code(400)
          .send({ error: err instanceof Error ? err.message : 'Failed' });
      }
    },
  );

  app.post(
    '/v1/admin/cp-roadmap/categories/:categorySlug/subcategories/:subSlug/topics',
    { schema: { tags: ['admin'], summary: 'Create CP roadmap topic' } },
    async (request, reply) => {
      const auth = await requireUser(request, reply, store);
      if (!requireAdmin(auth, reply)) return;
      const { categorySlug, subSlug } = request.params as {
        categorySlug: string;
        subSlug: string;
      };
      const body = request.body as {
        slug?: string;
        title?: string;
        difficulty?: number | null;
        importance?: number | null;
        phase?: number | null;
        prerequisites?: string | null;
        sortOrder?: number;
      };
      if (!body.title?.trim())
        return reply.code(400).send({ error: 'title required' });
      try {
        const topic = await upsertCpRoadmapTopic(
          prisma,
          categorySlug,
          subSlug,
          {
            slug: body.slug,
            title: body.title.trim(),
            difficulty: body.difficulty,
            importance: body.importance,
            phase: body.phase,
            prerequisites: body.prerequisites,
            sortOrder: body.sortOrder,
          },
        );
        return { topic };
      } catch (err) {
        return reply
          .code(400)
          .send({ error: err instanceof Error ? err.message : 'Failed' });
      }
    },
  );

  app.patch(
    '/v1/admin/cp-roadmap/topics/:topicSlug',
    { schema: { tags: ['admin'], summary: 'Update CP roadmap topic' } },
    async (request, reply) => {
      const auth = await requireUser(request, reply, store);
      if (!requireAdmin(auth, reply)) return;
      const { topicSlug } = request.params as { topicSlug: string };
      const body = request.body as {
        title?: string;
        difficulty?: number | null;
        importance?: number | null;
        phase?: number | null;
        prerequisites?: string | null;
        sortOrder?: number;
      };
      try {
        const topic = await updateCpRoadmapTopic(prisma, topicSlug, body);
        return { topic };
      } catch (err) {
        return reply
          .code(400)
          .send({ error: err instanceof Error ? err.message : 'Failed' });
      }
    },
  );

  app.delete(
    '/v1/admin/cp-roadmap/topics/:topicSlug',
    { schema: { tags: ['admin'], summary: 'Delete CP roadmap topic' } },
    async (request, reply) => {
      const auth = await requireUser(request, reply, store);
      if (!requireAdmin(auth, reply)) return;
      const { topicSlug } = request.params as { topicSlug: string };
      try {
        await deleteCpRoadmapTopic(prisma, topicSlug);
        return { ok: true };
      } catch (err) {
        return reply
          .code(400)
          .send({ error: err instanceof Error ? err.message : 'Failed' });
      }
    },
  );

  app.post(
    '/v1/admin/cp-roadmap/topics/:topicSlug/resources',
    { schema: { tags: ['admin'], summary: 'Add CP roadmap resource' } },
    async (request, reply) => {
      const auth = await requireUser(request, reply, store);
      if (!requireAdmin(auth, reply)) return;
      const { topicSlug } = request.params as { topicSlug: string };
      const body = request.body as {
        title?: string;
        url?: string;
        isStarred?: boolean;
        comments?: string | null;
      };
      if (!body.title?.trim() || !body.url?.trim()) {
        return reply.code(400).send({ error: 'title and url required' });
      }
      try {
        const resource = await createCpRoadmapResource(prisma, topicSlug, {
          title: body.title.trim(),
          url: body.url.trim(),
          isStarred: body.isStarred,
          comments: body.comments,
        });
        return { resource };
      } catch (err) {
        return reply
          .code(400)
          .send({ error: err instanceof Error ? err.message : 'Failed' });
      }
    },
  );

  app.patch(
    '/v1/admin/cp-roadmap/resources/:resourceId',
    { schema: { tags: ['admin'], summary: 'Update CP roadmap resource' } },
    async (request, reply) => {
      const auth = await requireUser(request, reply, store);
      if (!requireAdmin(auth, reply)) return;
      const { resourceId } = request.params as { resourceId: string };
      const body = request.body as {
        title?: string;
        url?: string;
        isStarred?: boolean;
        comments?: string | null;
        sortOrder?: number;
      };
      try {
        const resource = await updateCpRoadmapResource(
          prisma,
          resourceId,
          body,
        );
        return { resource };
      } catch {
        return reply.code(404).send({ error: 'Resource not found' });
      }
    },
  );

  app.delete(
    '/v1/admin/cp-roadmap/resources/:resourceId',
    { schema: { tags: ['admin'], summary: 'Delete CP roadmap resource' } },
    async (request, reply) => {
      const auth = await requireUser(request, reply, store);
      if (!requireAdmin(auth, reply)) return;
      const { resourceId } = request.params as { resourceId: string };
      try {
        await deleteCpRoadmapResource(prisma, resourceId);
        return { ok: true };
      } catch {
        return reply.code(404).send({ error: 'Resource not found' });
      }
    },
  );

  app.post(
    '/v1/admin/cp-roadmap/topics/:topicSlug/templates',
    { schema: { tags: ['admin'], summary: 'Add CP roadmap template link' } },
    async (request, reply) => {
      const auth = await requireUser(request, reply, store);
      if (!requireAdmin(auth, reply)) return;
      const { topicSlug } = request.params as { topicSlug: string };
      const body = request.body as { url?: string };
      if (!body.url?.trim())
        return reply.code(400).send({ error: 'url required' });
      try {
        const template = await createCpRoadmapTemplate(
          prisma,
          topicSlug,
          body.url.trim(),
        );
        return { template };
      } catch (err) {
        return reply
          .code(400)
          .send({ error: err instanceof Error ? err.message : 'Failed' });
      }
    },
  );

  app.delete(
    '/v1/admin/cp-roadmap/templates/:templateId',
    { schema: { tags: ['admin'], summary: 'Delete CP roadmap template' } },
    async (request, reply) => {
      const auth = await requireUser(request, reply, store);
      if (!requireAdmin(auth, reply)) return;
      const { templateId } = request.params as { templateId: string };
      try {
        await deleteCpRoadmapTemplate(prisma, templateId);
        return { ok: true };
      } catch {
        return reply.code(404).send({ error: 'Template not found' });
      }
    },
  );

  app.post(
    '/v1/admin/cp-roadmap/topics/:topicSlug/problems',
    { schema: { tags: ['admin'], summary: 'Add CP roadmap problem to topic' } },
    async (request, reply) => {
      const auth = await requireUser(request, reply, store);
      if (!requireAdmin(auth, reply)) return;
      const { topicSlug } = request.params as { topicSlug: string };
      const body = request.body as {
        slug?: string;
        title?: string;
        url?: string;
        difficulty?: number;
        isStarred?: boolean;
        solveCount?: number | null;
      };
      if (!body.title?.trim() || !body.url?.trim()) {
        return reply.code(400).send({ error: 'title and url required' });
      }
      try {
        const problem = await createCpRoadmapProblem(prisma, topicSlug, {
          slug: body.slug,
          title: body.title.trim(),
          url: body.url.trim(),
          difficulty: body.difficulty,
          isStarred: body.isStarred,
          solveCount: body.solveCount,
        });
        return { problem };
      } catch (err) {
        return reply
          .code(400)
          .send({ error: err instanceof Error ? err.message : 'Failed' });
      }
    },
  );

  app.patch(
    '/v1/admin/cp-roadmap/problems/:problemSlug',
    { schema: { tags: ['admin'], summary: 'Update CP roadmap problem' } },
    async (request, reply) => {
      const auth = await requireUser(request, reply, store);
      if (!requireAdmin(auth, reply)) return;
      const { problemSlug } = request.params as { problemSlug: string };
      const body = request.body as {
        title?: string;
        url?: string;
        difficulty?: number;
        isStarred?: boolean;
        solveCount?: number | null;
        sortOrder?: number;
        topicSlug?: string;
      };
      try {
        const problem = await updateCpRoadmapProblem(prisma, problemSlug, body);
        return { problem };
      } catch (err) {
        return reply
          .code(400)
          .send({ error: err instanceof Error ? err.message : 'Failed' });
      }
    },
  );

  app.delete(
    '/v1/admin/cp-roadmap/topics/:topicSlug/problems/:problemSlug',
    {
      schema: {
        tags: ['admin'],
        summary: 'Unlink CP roadmap problem from topic',
      },
    },
    async (request, reply) => {
      const auth = await requireUser(request, reply, store);
      if (!requireAdmin(auth, reply)) return;
      const { topicSlug, problemSlug } = request.params as {
        topicSlug: string;
        problemSlug: string;
      };
      try {
        await unlinkCpRoadmapProblem(prisma, topicSlug, problemSlug);
        return { ok: true };
      } catch (err) {
        return reply
          .code(400)
          .send({ error: err instanceof Error ? err.message : 'Failed' });
      }
    },
  );
}
