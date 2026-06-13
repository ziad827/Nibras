'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { buildApp } = require('../apps/api/dist/app');
const { PrismaStore } = require('../apps/api/dist/prisma-store');
const { getSharedPrisma } = require('../apps/api/dist/lib/prisma');

test('competitions contests list route responds with array', async (t) => {
  if (!process.env.DATABASE_URL) {
    t.skip('DATABASE_URL not set');
    return;
  }

  const prisma = getSharedPrisma();
  const app = buildApp(new PrismaStore(prisma));
  try {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/contests?page=1&limit=5',
    });
    assert.equal(response.statusCode, 200);
    const body = response.json();
    assert.ok(Array.isArray(body), 'expected raw array response');
    if (body.length > 0) {
      assert.ok(body[0].name, 'expected contest name field');
      assert.ok(body[0].host, 'expected contest host field');
      assert.ok(body[0].startsAt, 'expected contest startsAt field');
    }
  } finally {
    await app.close();
  }
});

test('competitions active filter route responds', async (t) => {
  if (!process.env.DATABASE_URL) {
    t.skip('DATABASE_URL not set');
    return;
  }

  const prisma = getSharedPrisma();
  const app = buildApp(new PrismaStore(prisma));
  try {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/contests?active=true&limit=5',
    });
    assert.equal(response.statusCode, 200);
    assert.ok(Array.isArray(response.json()));
  } finally {
    await app.close();
  }
});

test('competitions codechef host filter route responds', async (t) => {
  if (!process.env.DATABASE_URL) {
    t.skip('DATABASE_URL not set');
    return;
  }

  const prisma = getSharedPrisma();
  const app = buildApp(new PrismaStore(prisma));
  try {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/contests?host=codechef&limit=5',
    });
    assert.equal(response.statusCode, 200);
    assert.ok(Array.isArray(response.json()));
  } finally {
    await app.close();
  }
});

test('competitions ctftime host filter route responds', async (t) => {
  if (!process.env.DATABASE_URL) {
    t.skip('DATABASE_URL not set');
    return;
  }

  const prisma = getSharedPrisma();
  const app = buildApp(new PrismaStore(prisma));
  try {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/contests?host=ctftime&limit=5',
    });
    assert.equal(response.statusCode, 200);
    assert.ok(Array.isArray(response.json()));
  } finally {
    await app.close();
  }
});

test('competitions ranking route requires auth', async (t) => {
  if (!process.env.DATABASE_URL) {
    t.skip('DATABASE_URL not set');
    return;
  }

  const prisma = getSharedPrisma();
  const app = buildApp(new PrismaStore(prisma));
  try {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/ranking?page=1&limit=5',
    });
    assert.equal(response.statusCode, 401);
  } finally {
    await app.close();
  }
});

async function demoLogin(app) {
  const login = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { email: 'demo@nibras.dev', password: 'local123' },
  });
  if (login.statusCode !== 200) return null;
  return login.json().accessToken;
}

test('competitions ranking route returns array with auth', async (t) => {
  if (!process.env.DATABASE_URL) {
    t.skip('DATABASE_URL not set');
    return;
  }

  const prisma = getSharedPrisma();
  const app = buildApp(new PrismaStore(prisma));
  try {
    const token = await demoLogin(app);
    if (!token) {
      t.skip('demo login unavailable');
      return;
    }
    const response = await app.inject({
      method: 'GET',
      url: '/v1/ranking?page=1&limit=5',
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(response.statusCode, 200);
    assert.ok(Array.isArray(response.json()));
  } finally {
    await app.close();
  }
});

test('competitions ranking me route returns array with auth', async (t) => {
  if (!process.env.DATABASE_URL) {
    t.skip('DATABASE_URL not set');
    return;
  }

  const prisma = getSharedPrisma();
  const app = buildApp(new PrismaStore(prisma));
  try {
    const token = await demoLogin(app);
    if (!token) {
      t.skip('demo login unavailable');
      return;
    }
    const response = await app.inject({
      method: 'GET',
      url: '/v1/ranking/me',
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(response.statusCode, 200);
    assert.ok(Array.isArray(response.json()));
  } finally {
    await app.close();
  }
});

test('competitions linked accounts route returns array with auth', async (t) => {
  if (!process.env.DATABASE_URL) {
    t.skip('DATABASE_URL not set');
    return;
  }

  const prisma = getSharedPrisma();
  const app = buildApp(new PrismaStore(prisma));
  try {
    const token = await demoLogin(app);
    if (!token) {
      t.skip('demo login unavailable');
      return;
    }
    const response = await app.inject({
      method: 'GET',
      url: '/v1/contests/accounts',
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(response.statusCode, 200);
    assert.ok(Array.isArray(response.json()));
  } finally {
    await app.close();
  }
});

test('competitions bookmark route requires auth', async (t) => {
  if (!process.env.DATABASE_URL) {
    t.skip('DATABASE_URL not set');
    return;
  }

  const prisma = getSharedPrisma();
  const app = buildApp(new PrismaStore(prisma));
  try {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/user-contests/demo-contest/bookmark',
      payload: { on: true },
    });
    assert.equal(response.statusCode, 401);
  } finally {
    await app.close();
  }
});

test('competitions bookmark list route requires auth', async (t) => {
  if (!process.env.DATABASE_URL) {
    t.skip('DATABASE_URL not set');
    return;
  }

  const prisma = getSharedPrisma();
  const app = buildApp(new PrismaStore(prisma));
  try {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/user-contests/bookmarks',
    });
    assert.equal(response.statusCode, 401);
  } finally {
    await app.close();
  }
});

test('competitions reminders list route requires auth', async (t) => {
  if (!process.env.DATABASE_URL) {
    t.skip('DATABASE_URL not set');
    return;
  }

  const prisma = getSharedPrisma();
  const app = buildApp(new PrismaStore(prisma));
  try {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/user-contests/reminders',
    });
    assert.equal(response.statusCode, 401);
  } finally {
    await app.close();
  }
});

test('competitions problems list route requires auth', async (t) => {
  if (!process.env.DATABASE_URL) {
    t.skip('DATABASE_URL not set');
    return;
  }

  const prisma = getSharedPrisma();
  const app = buildApp(new PrismaStore(prisma));
  try {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/problems?page=1&limit=5',
    });
    assert.equal(response.statusCode, 401);
  } finally {
    await app.close();
  }
});

test('competitions problems list route returns items for authenticated user', async (t) => {
  if (!process.env.DATABASE_URL) {
    t.skip('DATABASE_URL not set');
    return;
  }

  const prisma = getSharedPrisma();
  const app = buildApp(new PrismaStore(prisma));
  try {
    const login = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'demo@nibras.dev', password: 'local123' },
    });
    if (login.statusCode !== 200) {
      t.skip('demo login unavailable');
      return;
    }
    const token = login.json().accessToken;
    const response = await app.inject({
      method: 'GET',
      url: '/v1/problems?page=1&limit=5',
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(response.statusCode, 200);
    const body = response.json();
    assert.ok(Array.isArray(body.items));
    assert.ok(typeof body.total === 'number');
  } finally {
    await app.close();
  }
});

test('competitions problems leetcode host filter responds', async (t) => {
  if (!process.env.DATABASE_URL) {
    t.skip('DATABASE_URL not set');
    return;
  }

  const prisma = getSharedPrisma();
  const app = buildApp(new PrismaStore(prisma));
  try {
    const login = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'demo@nibras.dev', password: 'local123' },
    });
    if (login.statusCode !== 200) {
      t.skip('demo login unavailable');
      return;
    }
    const token = login.json().accessToken;
    const response = await app.inject({
      method: 'GET',
      url: '/v1/problems?host=leetcode&page=1&limit=5',
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(response.statusCode, 200);
    assert.ok(Array.isArray(response.json().items));
  } finally {
    await app.close();
  }
});

test('competitions problems solved route requires auth', async (t) => {
  if (!process.env.DATABASE_URL) {
    t.skip('DATABASE_URL not set');
    return;
  }

  const prisma = getSharedPrisma();
  const app = buildApp(new PrismaStore(prisma));
  try {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/problems/example-id/solved',
      payload: { solved: true },
    });
    assert.equal(response.statusCode, 401);
  } finally {
    await app.close();
  }
});

test('competitions problems solved route updates progress', async (t) => {
  if (!process.env.DATABASE_URL) {
    t.skip('DATABASE_URL not set');
    return;
  }

  const prisma = getSharedPrisma();
  const app = buildApp(new PrismaStore(prisma));
  try {
    const login = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'demo@nibras.dev', password: 'local123' },
    });
    if (login.statusCode !== 200) {
      t.skip('demo login unavailable');
      return;
    }
    const token = login.json().accessToken;
    const list = await app.inject({
      method: 'GET',
      url: '/v1/problems?host=leetcode&page=1&limit=1',
      headers: { authorization: `Bearer ${token}` },
    });
    if (list.statusCode !== 200 || !list.json().items?.length) {
      t.skip('no seeded leetcode problems');
      return;
    }
    const problemId = list.json().items[0].id;

    const mark = await app.inject({
      method: 'POST',
      url: `/v1/problems/${problemId}/solved`,
      headers: { authorization: `Bearer ${token}` },
      payload: { solved: true },
    });
    assert.equal(mark.statusCode, 200);
    assert.equal(mark.json().solved, true);

    const verify = await app.inject({
      method: 'GET',
      url: `/v1/problems?host=leetcode&page=1&limit=50`,
      headers: { authorization: `Bearer ${token}` },
    });
    const item = verify
      .json()
      .items.find((entry) => entry.id === problemId);
    assert.equal(item?.solved, true);
  } finally {
    await app.close();
  }
});
