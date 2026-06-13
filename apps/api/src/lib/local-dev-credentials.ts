/**
 * Local dev email/password credentials for seeded accounts.
 * Password defaults to local123 (override with NIBRAS_DEMO_PASSWORD, min 8 chars).
 */
import { SystemRole, type PrismaClient } from '@prisma/client';

export const DEFAULT_LOCAL_DEV_PASSWORD = 'local123';

/** Lowercase — Better Auth looks up emails with toLowerCase(). */
export const EPITOMEZIED_DEV_EMAIL = 'epitomezied@gmail.com' as const;

const LEGACY_EPITOMEZIED_DEV_EMAIL = 'epitomezied@users.noreply.github.com';

export const EPITOMEZIED_DEV_PASSWORD = 'epitomezied';

export const LOCAL_DEV_ACCOUNT_EMAILS = [
  'admin@nibras.local',
  'support@nibrasplatform.me',
  'demo@nibras.dev',
  'instructor@nibras.dev',
  EPITOMEZIED_DEV_EMAIL,
] as const;

async function consolidateEpitomeZiedAccounts(
  prisma: PrismaClient,
): Promise<void> {
  const adminCandidate = await prisma.user.findFirst({
    where: {
      systemRole: SystemRole.admin,
      OR: [
        { username: 'EpitomeZied' },
        {
          email: { equals: LEGACY_EPITOMEZIED_DEV_EMAIL, mode: 'insensitive' },
        },
        {
          email: {
            equals: 'EpitomeZied@users.noreply.github.com',
            mode: 'insensitive',
          },
        },
      ],
    },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  });

  const gmailUser = await prisma.user.findUnique({
    where: { email: EPITOMEZIED_DEV_EMAIL },
    select: { id: true },
  });

  if (adminCandidate && gmailUser && adminCandidate.id !== gmailUser.id) {
    await prisma.user.delete({ where: { id: gmailUser.id } });
  }

  if (adminCandidate) {
    await prisma.user.update({
      where: { id: adminCandidate.id },
      data: {
        email: EPITOMEZIED_DEV_EMAIL,
        username: 'EpitomeZied',
        displayName: 'EpitomeZied',
        emailVerified: true,
        systemRole: SystemRole.admin,
      },
    });
  }
}

export async function ensureEpitomeZiedDevUser(
  prisma: PrismaClient,
): Promise<{ id: string }> {
  await consolidateEpitomeZiedAccounts(prisma);

  const user = await prisma.user.upsert({
    where: { email: EPITOMEZIED_DEV_EMAIL },
    update: {
      username: 'EpitomeZied',
      displayName: 'EpitomeZied',
      systemRole: SystemRole.admin,
      emailVerified: true,
      githubLinked: true,
    },
    create: {
      username: 'EpitomeZied',
      email: EPITOMEZIED_DEV_EMAIL,
      displayName: 'EpitomeZied',
      systemRole: SystemRole.admin,
      emailVerified: true,
      githubLinked: true,
    },
    select: { id: true },
  });

  await prisma.githubAccount.upsert({
    where: { userId: user.id },
    update: { login: 'EpitomeZied', githubUserId: 'epitomezied-local' },
    create: {
      userId: user.id,
      login: 'EpitomeZied',
      githubUserId: 'epitomezied-local',
    },
  });

  return user;
}

export function resolveLocalDevPassword(): string {
  const configured = process.env.NIBRAS_DEMO_PASSWORD?.trim();
  return configured && configured.length >= 8
    ? configured
    : DEFAULT_LOCAL_DEV_PASSWORD;
}

async function hashPassword(plain: string): Promise<string> {
  const { hashPassword: hash } = require('@better-auth/utils/password') as {
    hashPassword: (password: string) => Promise<string>;
  };
  return hash(plain);
}

export async function seedCredentialPasswordForUser(
  prisma: PrismaClient,
  userId: string,
  plain?: string,
): Promise<boolean> {
  const password = plain ?? resolveLocalDevPassword();
  const hashed = await hashPassword(password);

  const existing = await prisma.authAccount.findFirst({
    where: { userId, providerId: 'credential' },
    select: { id: true },
  });

  if (existing) {
    await prisma.authAccount.update({
      where: { id: existing.id },
      data: { password: hashed },
    });
  } else {
    await prisma.authAccount.create({
      data: {
        id: crypto.randomUUID(),
        userId,
        providerId: 'credential',
        accountId: userId,
        password: hashed,
      },
    });
  }

  return true;
}

export async function seedLocalDevCredentials(
  prisma: PrismaClient,
  options?: { log?: (msg: string) => void },
): Promise<{ synced: string[]; skipped: string[] }> {
  const log = options?.log ?? (() => {});
  const plain = resolveLocalDevPassword();
  const synced: string[] = [];
  const skipped: string[] = [];

  await ensureEpitomeZiedDevUser(prisma);

  for (const email of LOCAL_DEV_ACCOUNT_EMAILS) {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (!user) {
      skipped.push(email);
      continue;
    }
    const password =
      email === EPITOMEZIED_DEV_EMAIL ? EPITOMEZIED_DEV_PASSWORD : plain;
    await seedCredentialPasswordForUser(prisma, user.id, password);
    synced.push(email);
  }

  if (synced.length > 0) {
    const source =
      plain === DEFAULT_LOCAL_DEV_PASSWORD
        ? 'default local123'
        : 'from NIBRAS_DEMO_PASSWORD';
    log(`  → local dev passwords set for: ${synced.join(', ')} (${source})`);
  }

  return { synced, skipped };
}
