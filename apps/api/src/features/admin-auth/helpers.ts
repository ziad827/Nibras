import { randomInt, randomUUID } from 'node:crypto';
import { SystemRole, type PrismaClient } from '@prisma/client';
import { sendEmail } from '../../lib/email';
import { getUserPermissionCodes } from '../rbac/seed';

export type AdminAuthUser = {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  systemRole: SystemRole;
  emailVerified?: boolean;
  yearLevel?: number;
  roleId?: string | null;
};

export const ADMIN_AUTH_USER_SELECT = {
  id: true,
  email: true,
  username: true,
  displayName: true,
  systemRole: true,
  emailVerified: true,
  yearLevel: true,
  roleId: true,
} as const;

const STUDY_LEVEL_BY_YEAR: Record<number, string> = {
  1: 'Beginner',
  2: 'Intermediate',
  3: 'Advanced',
  4: 'Expert',
};

export function resolveSelectedLevel(user: AdminAuthUser): string {
  const yearLevel = user.yearLevel ?? 1;
  return STUDY_LEVEL_BY_YEAR[yearLevel] ?? 'Beginner';
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OTP_TTL_MS = 15 * 60 * 1000;

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim().toLowerCase());
}

export async function hashPassword(plain: string): Promise<string> {
  const { hashPassword: hash } = require('@better-auth/utils/password') as {
    hashPassword: (password: string) => Promise<string>;
  };
  return hash(plain);
}

export async function verifyCredentialPassword(
  hash: string,
  password: string,
): Promise<boolean> {
  const { verifyPassword } = require('@better-auth/utils/password') as {
    verifyPassword: (hash: string, password: string) => Promise<boolean>;
  };
  return verifyPassword(hash, password);
}

export function resolveFrontendRole(user: AdminAuthUser): string {
  const email = user.email.toLowerCase();
  if (email === 'instructor@nibras.dev') return 'instructor';
  if (user.systemRole === SystemRole.admin) return 'admin';
  return 'student';
}

export async function resolveFrontendRoleWithDb(
  user: AdminAuthUser,
  prisma?: PrismaClient,
): Promise<string> {
  if (user.systemRole === SystemRole.admin) return 'admin';
  if (!prisma) return resolveFrontendRole(user);

  if (user.roleId) {
    const rbacRole = await prisma.role.findUnique({
      where: { id: user.roleId },
      select: { name: true },
    });
    if (rbacRole?.name === 'instructor') return 'instructor';
    if (rbacRole?.name === 'admin' || rbacRole?.name === 'super-admin') {
      return 'admin';
    }
  }

  const application = await prisma.instructorApplication.findUnique({
    where: { userId: user.id },
    select: { status: true },
  });
  if (application?.status === 'approved') return 'instructor';

  return resolveFrontendRole(user);
}

export async function resolveInstructorStatus(
  userId: string,
  prisma?: PrismaClient,
): Promise<'pending' | 'approved' | 'rejected' | null> {
  if (!prisma) return null;
  const application = await prisma.instructorApplication.findUnique({
    where: { userId },
    select: { status: true },
  });
  return application?.status ?? null;
}

export async function toAdminUserPayload(
  user: AdminAuthUser,
  prisma?: PrismaClient,
) {
  const roleName = await resolveFrontendRoleWithDb(user, prisma);
  const permissions = prisma
    ? await getUserPermissionCodes(prisma, user.id)
    : [];
  const instructorStatus = prisma
    ? await resolveInstructorStatus(user.id, prisma)
    : null;
  const payload = {
    _id: user.id,
    id: user.id,
    email: user.email,
    username: user.username,
    displayName: user.displayName,
    name: user.displayName || user.username,
    role: { name: roleName, permissions },
    instructorStatus,
  };
  if (roleName === 'student') {
    return { ...payload, selectedLevel: resolveSelectedLevel(user) };
  }
  return payload;
}

export async function createCliSession(prisma: PrismaClient, userId: string) {
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  return prisma.cliSession.create({
    data: {
      userId,
      accessToken: `access_${randomUUID()}`,
      refreshToken: `refresh_${randomUUID()}`,
      expiresAt,
    },
  });
}

export async function buildAuthResponse(
  session: { accessToken: string; refreshToken: string },
  user: AdminAuthUser,
  prisma?: PrismaClient,
) {
  return {
    token: session.accessToken,
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    user: await toAdminUserPayload(user, prisma),
  };
}

function otpIdentifier(purpose: 'signup' | 'reset', email: string): string {
  return `otp:${purpose}:${email.trim().toLowerCase()}`;
}

export function generateOtp(): string {
  return String(randomInt(100000, 999999));
}

export async function storeOtp(
  prisma: PrismaClient,
  purpose: 'signup' | 'reset',
  email: string,
  otp: string,
): Promise<void> {
  const identifier = otpIdentifier(purpose, email);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);
  await prisma.authVerification.deleteMany({ where: { identifier } });
  await prisma.authVerification.create({
    data: {
      id: randomUUID(),
      identifier,
      value: otp,
      expiresAt,
    },
  });
}

export async function consumeOtp(
  prisma: PrismaClient,
  purpose: 'signup' | 'reset',
  email: string,
  otp: string,
): Promise<boolean> {
  const identifier = otpIdentifier(purpose, email);
  const record = await prisma.authVerification.findFirst({
    where: { identifier, value: otp.trim() },
  });
  if (!record || record.expiresAt < new Date()) {
    return false;
  }
  await prisma.authVerification.deleteMany({ where: { identifier } });
  return true;
}

export async function deliverOtpEmail(
  email: string,
  otp: string,
  purpose: 'signup' | 'reset',
): Promise<void> {
  const subject =
    purpose === 'signup'
      ? 'Verify your Nibras account'
      : 'Reset your Nibras password';
  const text =
    purpose === 'signup'
      ? `Your Nibras verification code is ${otp}. It expires in 15 minutes.`
      : `Your Nibras password reset code is ${otp}. It expires in 15 minutes.`;

  if (!process.env.RESEND_API_KEY) {
    console.log(`[admin-auth] OTP for ${email} (${purpose}): ${otp}`);
    return;
  }

  await sendEmail(email, subject, text);
}

export async function allocateUsername(
  prisma: PrismaClient,
  email: string,
  name?: string,
): Promise<string> {
  const localPart = email.split('@')[0] ?? 'user';
  const base =
    (name || localPart)
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .slice(0, 30) ||
    localPart.slice(0, 30) ||
    'user';

  let candidate = base;
  let suffix = 0;
  while (await prisma.user.findUnique({ where: { username: candidate } })) {
    suffix += 1;
    candidate = `${base.slice(0, Math.max(1, 30 - String(suffix).length))}${suffix}`;
  }
  return candidate;
}

type GoogleProfile = {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
};

type MicrosoftProfile = {
  id: string;
  mail?: string;
  userPrincipalName?: string;
  displayName?: string;
};

export async function fetchGoogleProfile(body: {
  access_token?: string;
  idToken?: string;
}): Promise<GoogleProfile | null> {
  if (body.access_token?.trim()) {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { authorization: `Bearer ${body.access_token.trim()}` },
    });
    if (!res.ok) return null;
    return (await res.json()) as GoogleProfile;
  }

  if (body.idToken?.trim()) {
    const url = new URL('https://oauth2.googleapis.com/tokeninfo');
    url.searchParams.set('id_token', body.idToken.trim());
    const res = await fetch(url);
    if (!res.ok) return null;
    const payload = (await res.json()) as GoogleProfile & {
      email_verified?: string;
    };
    if (payload.email_verified === 'false') return null;
    return payload;
  }

  return null;
}

export async function fetchMicrosoftProfile(
  accessToken: string,
): Promise<MicrosoftProfile | null> {
  const res = await fetch('https://graph.microsoft.com/v1.0/me', {
    headers: { authorization: `Bearer ${accessToken.trim()}` },
  });
  if (!res.ok) return null;
  return (await res.json()) as MicrosoftProfile;
}

export async function upsertOAuthUser(
  prisma: PrismaClient,
  providerId: 'google' | 'microsoft',
  profile: {
    accountId: string;
    email: string;
    displayName?: string | null;
    image?: string | null;
  },
): Promise<AdminAuthUser> {
  const email = profile.email.trim().toLowerCase();
  const existingAccount = await prisma.authAccount.findFirst({
    where: { providerId, accountId: profile.accountId },
      include: {
        user: {
          select: ADMIN_AUTH_USER_SELECT,
        },
      },
  });

  if (existingAccount?.user) {
    const user = await prisma.user.update({
      where: { id: existingAccount.user.id },
      data: {
        emailVerified: true,
        displayName: profile.displayName ?? existingAccount.user.displayName,
        image: profile.image ?? undefined,
      },
      select: ADMIN_AUTH_USER_SELECT,
    });
    return user;
  }

  let user = await prisma.user.findUnique({
    where: { email },
    select: ADMIN_AUTH_USER_SELECT,
  });

  if (!user) {
    const username = await allocateUsername(
      prisma,
      email,
      profile.displayName ?? undefined,
    );
    user = await prisma.user.create({
      data: {
        email,
        username,
        displayName: profile.displayName ?? username,
        emailVerified: true,
        image: profile.image ?? undefined,
        systemRole: SystemRole.user,
      },
      select: ADMIN_AUTH_USER_SELECT,
    });
  } else {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        displayName: profile.displayName ?? user.displayName,
        image: profile.image ?? undefined,
      },
      select: ADMIN_AUTH_USER_SELECT,
    });
  }

  const existingProvider = await prisma.authAccount.findFirst({
    where: { userId: user.id, providerId },
    select: { id: true },
  });
  if (existingProvider) {
    await prisma.authAccount.update({
      where: { id: existingProvider.id },
      data: { accountId: profile.accountId },
    });
  } else {
    await prisma.authAccount.create({
      data: {
        id: randomUUID(),
        userId: user.id,
        providerId,
        accountId: profile.accountId,
      },
    });
  }

  return user;
}
