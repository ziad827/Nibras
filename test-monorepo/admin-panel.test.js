'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');

const { buildApp } = require('../apps/api/dist/app');
const { PrismaStore } = require('../apps/api/dist/prisma-store');
const { getSharedPrisma } = require('../apps/api/dist/lib/prisma');
const { seedRbac } = require('../apps/api/dist/features/rbac/seed');
const {
  hashPassword,
  allocateUsername,
} = require('../apps/api/dist/features/admin-auth/helpers');

async function createAdminSession(app, prisma) {
  const email = `admin-panel-${Date.now()}@nibras.dev`;
  const username = await allocateUsername(prisma, email, 'Admin Panel');
  const adminRole = await prisma.role.findUnique({
    where: { name: 'super-admin' },
  });

  const user = await prisma.user.create({
    data: {
      email,
      username,
      displayName: 'Admin Panel Tester',
      emailVerified: true,
      systemRole: 'admin',
      roleId: adminRole?.id,
    },
  });

  await prisma.authAccount.create({
    data: {
      id: randomUUID(),
      userId: user.id,
      providerId: 'credential',
      accountId: user.id,
      password: await hashPassword('testpass123'),
    },
  });

  const session = await prisma.cliSession.create({
    data: {
      userId: user.id,
      accessToken: `access_${randomUUID()}`,
      refreshToken: `refresh_${randomUUID()}`,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });

  return { user, token: session.accessToken, email };
}

async function cleanupAdmin(prisma, userId, email) {
  await prisma.reputationEvent.deleteMany({ where: { userId } });
  await prisma.userBadge.deleteMany({ where: { userId } });
  await prisma.auditLog.deleteMany({ where: { userId } });
  await prisma.cliSession.deleteMany({ where: { userId } });
  await prisma.authAccount.deleteMany({ where: { userId } });
  await prisma.user.deleteMany({ where: { id: userId } });
  await prisma.authVerification.deleteMany({
    where: {
      OR: [
        { identifier: `otp:signup:${email}` },
        { identifier: `otp:reset:${email}` },
      ],
    },
  });
}

test('admin panel config, audit logs, ban duration, badges, and courses', async (t) => {
  if (!process.env.DATABASE_URL) {
    t.skip('DATABASE_URL not set');
    return;
  }

  const prisma = getSharedPrisma();
  await seedRbac(prisma);
  const app = buildApp(new PrismaStore(prisma));
  const ctx = await createAdminSession(app, prisma);

  try {
    const configGet = await app.inject({
      method: 'GET',
      url: '/v1/admin/config',
      headers: { authorization: `Bearer ${ctx.token}` },
    });
    assert.equal(configGet.statusCode, 200);
    const configBody = configGet.json();
    assert.ok(configBody.config?.featureFlags);

    const configPatch = await app.inject({
      method: 'PATCH',
      url: '/v1/admin/config',
      headers: { authorization: `Bearer ${ctx.token}` },
      payload: {
        config: {
          ...configBody.config,
          featureFlags: {
            ...configBody.config.featureFlags,
            enableGamification: false,
          },
        },
      },
    });
    assert.equal(configPatch.statusCode, 200);
    assert.equal(configPatch.json().config.featureFlags.enableGamification, false);

    const maintenancePatch = await app.inject({
      method: 'PATCH',
      url: '/v1/admin/config',
      headers: { authorization: `Bearer ${ctx.token}` },
      payload: {
        config: {
          ...configPatch.json().config,
          featureFlags: {
            ...configPatch.json().config.featureFlags,
            maintenanceMode: true,
          },
        },
      },
    });
    assert.equal(maintenancePatch.statusCode, 200);
    assert.equal(maintenancePatch.json().config.featureFlags.maintenanceMode, true);

    const configGetAgain = await app.inject({
      method: 'GET',
      url: '/v1/admin/config',
      headers: { authorization: `Bearer ${ctx.token}` },
    });
    assert.equal(configGetAgain.statusCode, 200);
    assert.equal(
      configGetAgain.json().config.featureFlags.maintenanceMode,
      true,
    );
    assert.ok(configGetAgain.json().fieldMeta?.featureFlags?.maintenanceMode);

    await prisma.auditLog.create({
      data: {
        userId: ctx.user.id,
        action: 'test.created',
        targetType: 'platform',
        targetId: 'test',
        payload: { ok: true },
      },
    });

    const auditLogs = await app.inject({
      method: 'GET',
      url: '/v1/admin/audit-logs?page=1&limit=10',
      headers: { authorization: `Bearer ${ctx.token}` },
    });
    assert.equal(auditLogs.statusCode, 200);
    const auditBody = auditLogs.json();
    assert.ok(Array.isArray(auditBody.logs));
    assert.ok(auditBody.pagination?.totalPages >= 1);

    const targetEmail = `ban-target-${Date.now()}@nibras.dev`;
    const targetUsername = await allocateUsername(prisma, targetEmail, 'Ban Target');
    const target = await prisma.user.create({
      data: {
        email: targetEmail,
        username: targetUsername,
        displayName: 'Ban Target',
        emailVerified: true,
      },
    });

    const banResponse = await app.inject({
      method: 'POST',
      url: `/v1/admin/users/${target.id}/ban`,
      headers: { authorization: `Bearer ${ctx.token}` },
      payload: { reason: 'test ban', duration: '7d' },
    });
    assert.equal(banResponse.statusCode, 200);
    const banned = await prisma.user.findUnique({ where: { id: target.id } });
    assert.ok(banned?.bannedAt);
    assert.ok(banned?.banExpiresAt);

    const badgeCreate = await app.inject({
      method: 'POST',
      url: '/v1/admin/badges',
      headers: { authorization: `Bearer ${ctx.token}` },
      payload: {
        name: `Test Badge ${Date.now()}`,
        description: 'Admin panel test badge',
        icon: 'fa-star',
        color: '#ff0000',
        criteria: 'Manual test',
      },
    });
    assert.equal(badgeCreate.statusCode, 201);
    const badgeId = badgeCreate.json().id;
    assert.ok(badgeId);

    const badgeAward = await app.inject({
      method: 'POST',
      url: `/v1/admin/badges/${badgeId}/award`,
      headers: { authorization: `Bearer ${ctx.token}` },
      payload: { email: targetEmail },
    });
    assert.equal(badgeAward.statusCode, 200);

    const courseCreate = await app.inject({
      method: 'POST',
      url: '/v1/admin/courses',
      headers: { authorization: `Bearer ${ctx.token}` },
      payload: {
        title: 'Admin Panel Course',
        code: `ADM${Date.now()}`,
        description: 'Created in admin panel test',
        status: 'active',
        sections: [{ name: 'Section A', schedule: 'Mon 10:00', capacity: 30 }],
      },
    });
    assert.equal(courseCreate.statusCode, 201);
    const courseId = courseCreate.json().id;
    assert.ok(courseId);

    const sectionCreate = await app.inject({
      method: 'POST',
      url: `/v1/admin/courses/${courseId}/sections`,
      headers: { authorization: `Bearer ${ctx.token}` },
      payload: { name: 'Section B', schedule: 'Wed 10:00', capacity: 20 },
    });
    assert.equal(sectionCreate.statusCode, 200);

    const sectionId = sectionCreate.json().sectionId;
    const enroll = await app.inject({
      method: 'POST',
      url: `/v1/admin/sections/${sectionId}/enroll`,
      headers: { authorization: `Bearer ${ctx.token}` },
      payload: { emails: [targetEmail] },
    });
    assert.equal(enroll.statusCode, 200);
    assert.equal(enroll.json().enrolled, 1);

    await prisma.badgeDefinition.delete({ where: { id: badgeId } }).catch(() => {});
    await prisma.course.delete({ where: { id: courseId } }).catch(() => {});
    await prisma.user.delete({ where: { id: target.id } }).catch(() => {});
  } finally {
    await cleanupAdmin(prisma, ctx.user.id, ctx.email);
    await app.close();
  }
});

test('admin config requires config:read and config:update permissions', async (t) => {
  if (!process.env.DATABASE_URL) {
    t.skip('DATABASE_URL not set');
    return;
  }

  const prisma = getSharedPrisma();
  await seedRbac(prisma);
  const app = buildApp(new PrismaStore(prisma));

  const limitedRole = await prisma.role.create({
    data: {
      name: `config-limited-${Date.now()}`,
      description: 'No config permissions',
    },
  });

  const auditPermission = await prisma.permission.findUnique({
    where: { code: 'audit-log:read' },
  });
  assert.ok(auditPermission?.id);
  await prisma.rolePermission.create({
    data: {
      roleId: limitedRole.id,
      permissionId: auditPermission.id,
    },
  });

  const email = `config-limited-${Date.now()}@nibras.dev`;
  const username = await allocateUsername(prisma, email, 'Config Limited');
  const user = await prisma.user.create({
    data: {
      email,
      username,
      displayName: 'Config Limited Admin',
      emailVerified: true,
      systemRole: 'admin',
      roleId: limitedRole.id,
    },
  });

  await prisma.authAccount.create({
    data: {
      id: randomUUID(),
      userId: user.id,
      providerId: 'credential',
      accountId: user.id,
      password: await hashPassword('testpass123'),
    },
  });

  const session = await prisma.cliSession.create({
    data: {
      userId: user.id,
      accessToken: `access_${randomUUID()}`,
      refreshToken: `refresh_${randomUUID()}`,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });

  try {
    const deniedGet = await app.inject({
      method: 'GET',
      url: '/v1/admin/config',
      headers: { authorization: `Bearer ${session.accessToken}` },
    });
    assert.equal(deniedGet.statusCode, 403);

    const deniedPatch = await app.inject({
      method: 'PATCH',
      url: '/v1/admin/config',
      headers: { authorization: `Bearer ${session.accessToken}` },
      payload: { config: { featureFlags: { maintenanceMode: true } } },
    });
    assert.equal(deniedPatch.statusCode, 403);
  } finally {
    await prisma.cliSession.deleteMany({ where: { userId: user.id } });
    await prisma.authAccount.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
    await prisma.role.delete({ where: { id: limitedRole.id } });
    await app.close();
  }
});

test('competitions routes return 503 when disabled in platform config', async (t) => {
  if (!process.env.DATABASE_URL) {
    t.skip('DATABASE_URL not set');
    return;
  }

  const prisma = getSharedPrisma();
  await seedRbac(prisma);
  const app = buildApp(new PrismaStore(prisma));
  const ctx = await createAdminSession(app, prisma);

  try {
    const configGet = await app.inject({
      method: 'GET',
      url: '/v1/admin/config',
      headers: { authorization: `Bearer ${ctx.token}` },
    });
    const configBody = configGet.json();

    await app.inject({
      method: 'PATCH',
      url: '/v1/admin/config',
      headers: { authorization: `Bearer ${ctx.token}` },
      payload: {
        config: {
          ...configBody.config,
          featureFlags: {
            ...configBody.config.featureFlags,
            enableCompetitions: false,
          },
        },
      },
    });

    const contests = await app.inject({
      method: 'GET',
      url: '/v1/contests',
    });
    assert.equal(contests.statusCode, 503);

    await app.inject({
      method: 'PATCH',
      url: '/v1/admin/config',
      headers: { authorization: `Bearer ${ctx.token}` },
      payload: {
        config: {
          ...configBody.config,
          featureFlags: {
            ...configBody.config.featureFlags,
            enableCompetitions: true,
          },
        },
      },
    });
  } finally {
    await cleanupAdmin(prisma, ctx.user.id, ctx.email);
    await app.close();
  }
});

test('RBAC seed is idempotent', async (t) => {
  if (!process.env.DATABASE_URL) {
    t.skip('DATABASE_URL not set');
    return;
  }

  const prisma = getSharedPrisma();
  const first = await seedRbac(prisma);
  const second = await seedRbac(prisma);
  assert.equal(first.roles, second.roles);
  assert.equal(first.permissions, second.permissions);
});
