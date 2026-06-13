'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { buildApp } = require('../apps/api/dist/app');
const { FileStore } = require('../apps/api/dist/store');
const { CourseSectionsResponseSchema } = require('@nibras/contracts');

function makeStorePath() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nibras-sections-'));
  return path.join(dir, 'store.json');
}

function buildTestApp(storePath, options = {}) {
  const store = new FileStore(storePath);
  const data = store.read('http://127.0.0.1');
  data.sessions.push({
    accessToken: options.token || 'instructor-token',
    refreshToken: 'refresh',
    userId: options.userId || 'user_instructor',
    createdAt: new Date().toISOString(),
  });
  const user = data.users.find(
    (u) => u.id === (options.userId || 'user_instructor'),
  );
  if (user && options.systemRole) user.systemRole = options.systemRole;
  store.write(data);
  return buildApp(new FileStore(storePath));
}

test('GET /v1/tracking/courses/:courseId/sections requires authentication', async (t) => {
  const app = buildApp(new FileStore(makeStorePath()));
  try {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/tracking/courses/course_cs161/sections',
    });
    if (res.statusCode === 404 && !process.env.DATABASE_URL) {
      t.skip('Course video routes require DATABASE_URL');
      return;
    }
    assert.equal(res.statusCode, 401);
    assert.equal(res.json().code, 'AUTH_REQUIRED');
  } finally {
    await app.close();
  }
});

test('GET /v1/tracking/courses/:courseId/sections validates courseId', async (t) => {
  const storePath = makeStorePath();
  const app = buildTestApp(storePath);
  try {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/tracking/courses/not-a-valid-id/sections',
      headers: { authorization: 'Bearer instructor-token' },
    });
    if (res.statusCode === 404 && !process.env.DATABASE_URL) {
      t.skip('Course video routes require DATABASE_URL');
      return;
    }
    assert.equal(res.statusCode, 400);
  } finally {
    await app.close();
  }
});

test('POST /v1/tracking/videos/:videoId/progress validates videoId', async (t) => {
  const storePath = makeStorePath();
  const app = buildTestApp(storePath, {
    userId: 'user_demo',
    token: 'student-token',
  });
  try {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/tracking/videos/bad-id/progress',
      headers: { authorization: 'Bearer student-token' },
      payload: { watched: true, watchedProgress: 1 },
    });
    if (res.statusCode === 404 && !process.env.DATABASE_URL) {
      t.skip('Course video routes require DATABASE_URL');
      return;
    }
    assert.equal(res.statusCode, 400);
  } finally {
    await app.close();
  }
});

test('course sections flow with Prisma when DATABASE_URL is set', async (t) => {
  if (!process.env.DATABASE_URL) {
    t.skip('DATABASE_URL not set');
    return;
  }

  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  t.after(async () => prisma.$disconnect());

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    t.skip('Database unavailable');
    return;
  }

  const storePath = makeStorePath();
  const app = buildTestApp(storePath, {
    userId: 'user_instructor',
    token: 'instructor-token',
    systemRole: 'admin',
  });

  const slug = `sections-test-${Date.now()}`;
  let courseId;
  let sectionId;
  let videoId;
  let prereqVideoId;

  try {
    const course = await prisma.course.create({
      data: {
        slug,
        title: 'Sections Flow Test',
        termLabel: 'Test',
        courseCode: 'TEST101',
        sequentialVideos: true,
        memberships: {
          create: [
            { userId: 'user_instructor', role: 'instructor' },
            { userId: 'user_demo', role: 'student' },
          ],
        },
      },
    });
    courseId = course.id;

    const createSectionRes = await app.inject({
      method: 'POST',
      url: `/v1/tracking/courses/${courseId}/sections`,
      headers: { authorization: 'Bearer instructor-token' },
      payload: { title: 'Unit 1', sortOrder: 0 },
    });
    assert.equal(createSectionRes.statusCode, 200);
    sectionId = createSectionRes.json().id;

    const prereqRes = await app.inject({
      method: 'POST',
      url: `/v1/tracking/courses/${courseId}/sections/${sectionId}/videos`,
      headers: { authorization: 'Bearer instructor-token' },
      payload: {
        title: 'Prereq Lecture',
        provider: 'youtube',
        externalId: 'dQw4w9WgXcQ',
        sortOrder: 0,
      },
    });
    assert.equal(prereqRes.statusCode, 200);
    prereqVideoId = prereqRes.json().id;

    const lockedRes = await app.inject({
      method: 'POST',
      url: `/v1/tracking/courses/${courseId}/sections/${sectionId}/videos`,
      headers: { authorization: 'Bearer instructor-token' },
      payload: {
        title: 'Locked Lecture',
        provider: 'youtube',
        externalId: 'dQw4w9WgXcQ',
        sortOrder: 1,
        requiresVideoId: prereqVideoId,
      },
    });
    assert.equal(lockedRes.statusCode, 200);
    videoId = lockedRes.json().id;

    const studentApp = buildTestApp(storePath, {
      userId: 'user_demo',
      token: 'student-token',
    });
    try {
      const listBefore = await studentApp.inject({
        method: 'GET',
        url: `/v1/tracking/courses/${courseId}/sections`,
        headers: { authorization: 'Bearer student-token' },
      });
      if (listBefore.statusCode === 500) {
        t.skip('Prisma store unavailable in test app');
        return;
      }
      assert.equal(listBefore.statusCode, 200);
      const parsed = CourseSectionsResponseSchema.parse(listBefore.json());
      const videos = parsed.sections.flatMap((s) => s.videos);
      const locked = videos.find((v) => v.id === videoId);
      const prereq = videos.find((v) => v.id === prereqVideoId);
      assert.ok(locked, 'locked video present');
      assert.equal(locked.locked, true);
      assert.equal(prereq?.locked, false);

      const progressRes = await studentApp.inject({
        method: 'POST',
        url: `/v1/tracking/videos/${prereqVideoId}/progress`,
        headers: { authorization: 'Bearer student-token' },
        payload: { watched: true, watchedProgress: 1 },
      });
      assert.equal(progressRes.statusCode, 200);
      assert.equal(progressRes.json().watched, true);

      const listAfter = await studentApp.inject({
        method: 'GET',
        url: `/v1/tracking/courses/${courseId}/sections`,
        headers: { authorization: 'Bearer student-token' },
      });
      assert.equal(listAfter.statusCode, 200);
      const afterVideos = CourseSectionsResponseSchema.parse(
        listAfter.json(),
      ).sections.flatMap((s) => s.videos);
      const unlocked = afterVideos.find((v) => v.id === videoId);
      assert.equal(unlocked?.locked, false);
    } finally {
      await studentApp.close();
    }
  } finally {
    await app.close();
    if (courseId) {
      await prisma.course.delete({ where: { id: courseId } }).catch(() => {});
    }
  }
});
