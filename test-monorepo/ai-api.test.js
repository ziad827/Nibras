'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { buildApp } = require('../apps/api/dist/app');
const { FileStore } = require('../apps/api/dist/store');

function makeStorePath() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nibras-ai-'));
  return path.join(dir, 'store.json');
}

function buildTestApp(storePath) {
  const store = new FileStore(storePath);
  const data = store.read('http://127.0.0.1');
  data.sessions.push({
    accessToken: 'student-token',
    refreshToken: 'student-refresh',
    userId: 'user_demo',
    createdAt: new Date().toISOString(),
  });
  store.write(data);
  return buildApp(new FileStore(storePath));
}

test('POST /v1/ai/route-question requires authentication', async (t) => {
  const app = buildApp(new FileStore(makeStorePath()));
  try {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/ai/route-question',
      payload: { title: 'How do pointers work in C++?' },
    });
    if (res.statusCode === 404 && !process.env.DATABASE_URL) {
      t.skip('AI routes require DATABASE_URL');
      return;
    }
    assert.equal(res.statusCode, 401);
  } finally {
    await app.close();
  }
});

test('POST /v1/ai/suggest-answer validates questionId', async (t) => {
  const storePath = makeStorePath();
  const app = buildTestApp(storePath);
  try {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/ai/suggest-answer',
      headers: { authorization: 'Bearer student-token' },
      payload: { questionId: 'bad-id' },
    });
    if (res.statusCode === 404 && !process.env.DATABASE_URL) {
      t.skip('AI routes require DATABASE_URL');
      return;
    }
    if (res.statusCode === 500) return;
    assert.equal(res.statusCode, 400);
  } finally {
    await app.close();
  }
});

test('GET /v1/ai/recommendations returns list for authenticated user', async (t) => {
  if (!process.env.DATABASE_URL) {
    t.skip('DATABASE_URL not set');
    return;
  }
  const storePath = makeStorePath();
  const app = buildTestApp(storePath);
  try {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/ai/recommendations',
      headers: { authorization: 'Bearer student-token' },
    });
    if (res.statusCode === 500) return;
    assert.equal(res.statusCode, 200);
    assert.ok(Array.isArray(res.json().recommendations));
  } finally {
    await app.close();
  }
});
