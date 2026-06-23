'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { buildApp } = require('../apps/api/dist/app');
const { FileStore } = require('../apps/api/dist/store');

function makeStorePath() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nibras-levels-'));
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

test('GET /v1/levels/progress returns study level payload', async () => {
  const storePath = makeStorePath();
  const store = new FileStore(storePath);
  const app = seedSession(store, storePath, 'user_demo', 'levels-token');

  try {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/levels/progress',
      headers: { authorization: 'Bearer levels-token' },
    });
    assert.equal(response.statusCode, 200);
    const payload = response.json();
    assert.equal(payload.studyLevel, 'Beginner');
    assert.equal(payload.yearLevel, 1);
    assert.ok(Array.isArray(payload.levels));
    assert.equal(payload.levels.length, 4);
    assert.equal(payload.levels[0].name, 'Beginner');
    assert.equal(payload.levels[0].unlocked, true);
  } finally {
    await app.close();
  }
});
