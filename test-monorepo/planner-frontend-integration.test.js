'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { buildApp } = require('../apps/api/dist/app');
const { FileStore } = require('../apps/api/dist/store');

function makeStorePath() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nibras-planner-int-'));
  return path.join(dir, 'store.json');
}

function seedSession(store, storePath, userId, token) {
  const data = store.read('http://127.0.0.1');
  if (!data.users.find((user) => user.id === userId)) {
    data.users.push({
      id: userId,
      username: 'demo',
      email: 'demo@nibras.dev',
      githubLogin: userId,
      githubLinked: true,
      githubAppInstalled: false,
      systemRole: 'user',
      yearLevel: 1,
    });
  }
  data.sessions.push({
    accessToken: token,
    refreshToken: `${token}-refresh`,
    userId,
    createdAt: new Date().toISOString(),
  });
  store.write(data);
  return buildApp(new FileStore(storePath));
}

test('program enroll, patch plan, and read back student plan', async () => {
  const storePath = makeStorePath();
  const store = new FileStore(storePath);
  const app = seedSession(store, storePath, 'user_demo', 'planner-token');

  try {
    const listRes = await app.inject({
      method: 'GET',
      url: '/v1/programs',
      headers: { authorization: 'Bearer planner-token' },
    });
    assert.equal(listRes.statusCode, 200);
    const programs = listRes.json();
    assert.ok(programs.length > 0);
    const programId = programs[0].id;

    const enrollRes = await app.inject({
      method: 'POST',
      url: `/v1/programs/${programId}/enroll`,
      headers: { authorization: 'Bearer planner-token' },
      payload: {},
    });
    assert.equal(enrollRes.statusCode, 201);
    const plan = enrollRes.json();
    assert.ok(plan.catalogCourses.length > 0);

    const getRes = await app.inject({
      method: 'GET',
      url: '/v1/programs/student/me',
      headers: { authorization: 'Bearer planner-token' },
    });
    assert.equal(getRes.statusCode, 200);
    const saved = getRes.json();
    assert.equal(saved.userId, 'user_demo');
    assert.ok(Array.isArray(saved.plannedCourses));

    const validateRes = await app.inject({
      method: 'GET',
      url: '/v1/programs/student/me/validate',
      headers: { authorization: 'Bearer planner-token' },
    });
    assert.equal(validateRes.statusCode, 200);
    assert.ok(validateRes.json());
  } finally {
    await app.close();
  }
});
