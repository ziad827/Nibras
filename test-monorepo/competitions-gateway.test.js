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
