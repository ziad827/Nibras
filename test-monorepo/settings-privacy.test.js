'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { buildApp } = require('../apps/api/dist/app');
const { PrismaStore } = require('../apps/api/dist/prisma-store');
const { getSharedPrisma } = require('../apps/api/dist/lib/prisma');
const {
  GamificationService,
} = require('../apps/api/dist/features/gamification/service');

async function createAuthedUser(app, prisma, label) {
  const email = `${label}-${Date.now()}@gmail.com`;
  const password = 'testpass123';

  await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { name: label, email, password },
  });
  const otpRecord = await prisma.authVerification.findFirst({
    where: { identifier: `otp:signup:${email}` },
  });
  const verifyResponse = await app.inject({
    method: 'POST',
    url: '/api/auth/verify-otp',
    payload: { email, otp: otpRecord.value },
  });
  const token = verifyResponse.json().accessToken;
  const meResponse = await app.inject({
    method: 'GET',
    url: '/api/auth/me',
    headers: { authorization: `Bearer ${token}` },
  });
  return {
    email,
    token,
    userId: meResponse.json().user.id,
  };
}

async function cleanupUser(prisma, email) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return;
  await prisma.reputationEvent.deleteMany({ where: { userId: user.id } });
  await prisma.authVerification.deleteMany({
    where: {
      OR: [
        { identifier: `otp:signup:${email}` },
        { identifier: `otp:reset:${email}` },
      ],
    },
  });
  await prisma.cliSession.deleteMany({ where: { userId: user.id } });
  await prisma.authAccount.deleteMany({ where: { userId: user.id } });
  await prisma.user.delete({ where: { id: user.id } });
}

test('privacy settings can be read and updated', async (t) => {
  if (!process.env.DATABASE_URL) {
    t.skip('DATABASE_URL not set');
    return;
  }

  const prisma = getSharedPrisma();
  const app = buildApp(new PrismaStore(prisma));
  let auth = null;

  try {
    auth = await createAuthedUser(app, prisma, 'privacy-settings');
    const getResponse = await app.inject({
      method: 'GET',
      url: '/v1/me/privacy',
      headers: { authorization: `Bearer ${auth.token}` },
    });
    assert.equal(getResponse.statusCode, 200);
    assert.equal(getResponse.json().showOnLeaderboard, true);

    const patchResponse = await app.inject({
      method: 'PATCH',
      url: '/v1/me/privacy',
      headers: { authorization: `Bearer ${auth.token}` },
      payload: { showOnLeaderboard: false },
    });
    assert.equal(patchResponse.statusCode, 200);
    assert.equal(patchResponse.json().showOnLeaderboard, false);

    const getAgain = await app.inject({
      method: 'GET',
      url: '/v1/me/privacy',
      headers: { authorization: `Bearer ${auth.token}` },
    });
    assert.equal(getAgain.json().showOnLeaderboard, false);
  } finally {
    if (auth) await cleanupUser(prisma, auth.email);
    await app.close();
  }
});

test('leaderboard excludes users who opted out of visibility', async (t) => {
  if (!process.env.DATABASE_URL) {
    t.skip('DATABASE_URL not set');
    return;
  }

  const prisma = getSharedPrisma();
  const app = buildApp(new PrismaStore(prisma));
  let visibleAuth = null;
  let hiddenAuth = null;

  try {
    visibleAuth = await createAuthedUser(app, prisma, 'leaderboard-visible');
    hiddenAuth = await createAuthedUser(app, prisma, 'leaderboard-hidden');

    await prisma.user.update({
      where: { id: hiddenAuth.userId },
      data: { showOnLeaderboard: false },
    });

    await prisma.reputationEvent.createMany({
      data: [
        {
          userId: visibleAuth.userId,
          delta: 50,
          reason: 'test_visible',
          source: 'test:visible-1',
        },
        {
          userId: hiddenAuth.userId,
          delta: 100,
          reason: 'test_hidden',
          source: 'test:hidden-1',
        },
      ],
    });

    const gamification = new GamificationService(prisma);
    const leaderboard = await gamification.getLeaderboard(visibleAuth.userId, {
      period: 'all',
      scope: 'global',
      page: 1,
      limit: 25,
    });

    const userIds = leaderboard.entries.map((entry) => entry.userId);
    assert.ok(userIds.includes(visibleAuth.userId));
    assert.equal(userIds.includes(hiddenAuth.userId), false);
  } finally {
    if (visibleAuth) await cleanupUser(prisma, visibleAuth.email);
    if (hiddenAuth) await cleanupUser(prisma, hiddenAuth.email);
    await app.close();
  }
});
