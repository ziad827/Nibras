'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { buildApp } = require('../apps/api/dist/app');
const { FileStore } = require('../apps/api/dist/store');

function makeStorePath() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nibras-portfolio-'));
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

test('GET /v1/users/:userId/portfolio returns course summaries', async () => {
  const storePath = makeStorePath();
  const store = new FileStore(storePath);
  const app = seedSession(store, storePath, 'user_demo', 'portfolio-token');

  try {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/users/user_demo/portfolio',
      headers: { authorization: 'Bearer portfolio-token' },
    });
    assert.equal(response.statusCode, 200);
    const payload = response.json();
    assert.equal(payload.userId, 'user_demo');
    assert.ok(Array.isArray(payload.courses));
  } finally {
    await app.close();
  }
});
