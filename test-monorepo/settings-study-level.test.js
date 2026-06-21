'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { buildApp } = require('../apps/api/dist/app');
const { PrismaStore } = require('../apps/api/dist/prisma-store');
const { getSharedPrisma } = require('../apps/api/dist/lib/prisma');

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
  await prisma.userAiCredential.deleteMany({ where: { userId: user.id } });
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

test('study level can be updated and reflected on auth/me', async (t) => {
  if (!process.env.DATABASE_URL) {
    t.skip('DATABASE_URL not set');
    return;
  }

  const prisma = getSharedPrisma();
  const app = buildApp(new PrismaStore(prisma));
  let auth = null;

  try {
    auth = await createAuthedUser(app, prisma, 'study-level');
    const patchResponse = await app.inject({
      method: 'PATCH',
      url: '/v1/me/study-level',
      headers: { authorization: `Bearer ${auth.token}` },
      payload: { studyLevel: 'Advanced' },
    });
    assert.equal(patchResponse.statusCode, 200);
    assert.equal(patchResponse.json().studyLevel, 'Advanced');
    assert.equal(patchResponse.json().yearLevel, 3);

    const stored = await prisma.user.findUnique({ where: { id: auth.userId } });
    assert.equal(stored?.yearLevel, 3);

    const meResponse = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { authorization: `Bearer ${auth.token}` },
    });
    assert.equal(meResponse.statusCode, 200);
    assert.equal(meResponse.json().user.selectedLevel, 'Advanced');
  } finally {
    if (auth) await cleanupUser(prisma, auth.email);
    await app.close();
  }
});

test('ai credentials can be saved, read masked, and removed', async (t) => {
  if (!process.env.DATABASE_URL) {
    t.skip('DATABASE_URL not set');
    return;
  }

  if (!process.env.NIBRAS_CREDENTIALS_ENCRYPTION_KEY) {
    t.skip('NIBRAS_CREDENTIALS_ENCRYPTION_KEY not set');
    return;
  }

  const prisma = getSharedPrisma();
  const app = buildApp(new PrismaStore(prisma));
  let auth = null;

  try {
    auth = await createAuthedUser(app, prisma, 'ai-credentials');
    const initialGet = await app.inject({
      method: 'GET',
      url: '/v1/me/ai-credentials',
      headers: { authorization: `Bearer ${auth.token}` },
    });
    assert.equal(initialGet.statusCode, 200);
    assert.equal(initialGet.json().configured, false);

    const putResponse = await app.inject({
      method: 'PUT',
      url: '/v1/me/ai-credentials',
      headers: { authorization: `Bearer ${auth.token}` },
      payload: {
        provider: 'openai',
        model: 'gpt-4o-mini',
        apiKey: 'sk-test-key-for-settings-flow',
      },
    });
    assert.equal(putResponse.statusCode, 200);
    assert.equal(putResponse.json().configured, true);
    assert.ok(putResponse.json().maskedKey);

    const getResponse = await app.inject({
      method: 'GET',
      url: '/v1/me/ai-credentials',
      headers: { authorization: `Bearer ${auth.token}` },
    });
    assert.equal(getResponse.statusCode, 200);
    assert.equal(getResponse.json().configured, true);
    assert.ok(getResponse.json().maskedKey);

    const deleteResponse = await app.inject({
      method: 'DELETE',
      url: '/v1/me/ai-credentials',
      headers: { authorization: `Bearer ${auth.token}` },
    });
    assert.equal(deleteResponse.statusCode, 200);
    assert.equal(deleteResponse.json().ok, true);

    const afterDelete = await app.inject({
      method: 'GET',
      url: '/v1/me/ai-credentials',
      headers: { authorization: `Bearer ${auth.token}` },
    });
    assert.equal(afterDelete.json().configured, false);
  } finally {
    if (auth) await cleanupUser(prisma, auth.email);
    await app.close();
  }
});
