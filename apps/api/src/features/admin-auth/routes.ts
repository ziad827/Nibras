import { SystemRole, type PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { FastifyInstance } from 'fastify';
import { AppStore } from '../../store';
import { requestBaseUrl } from '../../lib/request-base-url';
import {
  allocateUsername,
  buildAuthResponse,
  consumeOtp,
  createCliSession,
  deliverOtpEmail,
  fetchGoogleProfile,
  fetchMicrosoftProfile,
  generateOtp,
  hashPassword,
  isGmailAddress,
  storeOtp,
  toAdminUserPayload,
  upsertOAuthUser,
  verifyCredentialPassword,
} from './helpers';

function authFailure(
  reply: { code: (status: number) => { send: (body: unknown) => unknown } },
  message: string,
) {
  return reply.code(401).send({ message });
}

export function registerAdminAuthRoutes(
  app: FastifyInstance,
  store: AppStore,
  prisma: PrismaClient,
): void {
  app.post('/api/auth/login', async (request, reply) => {
    const body = request.body as { email?: string; password?: string };
    const email = body?.email?.trim().toLowerCase();
    const password = body?.password ?? '';

    if (!email || !password) {
      return reply
        .code(400)
        .send({ message: 'Email and password are required.' });
    }

    const user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        systemRole: true,
        emailVerified: true,
      },
    });
    if (!user) {
      return authFailure(reply, 'Invalid email or password.');
    }

    if (!user.emailVerified) {
      return reply.code(403).send({
        message:
          'Your account is not verified. Please verify your OTP sent to your email.',
      });
    }

    const account = await prisma.authAccount.findFirst({
      where: { userId: user.id, providerId: 'credential' },
      select: { password: true },
    });
    if (!account?.password) {
      return authFailure(reply, 'Invalid email or password.');
    }

    const valid = await verifyCredentialPassword(account.password, password);
    if (!valid) {
      return authFailure(reply, 'Invalid email or password.');
    }

    const session = await createCliSession(prisma, user.id);
    return buildAuthResponse(session, user);
  });

  app.post('/api/auth/register', async (request, reply) => {
    const body = request.body as {
      name?: string;
      email?: string;
      password?: string;
      role?: string;
    };
    const name = body?.name?.trim();
    const email = body?.email?.trim().toLowerCase();
    const password = body?.password ?? '';

    if (!name || !email || !password) {
      return reply
        .code(400)
        .send({ message: 'Name, email, and password are required.' });
    }
    if (!isGmailAddress(email)) {
      return reply
        .code(400)
        .send({ message: 'Registration requires a valid @gmail.com address.' });
    }
    if (password.length < 6) {
      return reply
        .code(400)
        .send({ message: 'Password must be at least 6 characters.' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return reply
        .code(409)
        .send({ message: 'An account with this email already exists.' });
    }

    const username = await allocateUsername(prisma, email, name);
    const hashed = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email,
        username,
        displayName: name,
        emailVerified: false,
        systemRole: SystemRole.user,
      },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        systemRole: true,
        emailVerified: true,
      },
    });

    await prisma.authAccount.create({
      data: {
        id: randomUUID(),
        userId: user.id,
        providerId: 'credential',
        accountId: user.id,
        password: hashed,
      },
    });

    const otp = generateOtp();
    await storeOtp(prisma, 'signup', email, otp);
    await deliverOtpEmail(email, otp, 'signup');

    return reply.code(201).send({
      message:
        'Registration successful. Enter the OTP sent to your email. If you do not see it, check Spam/Promotions.',
    });
  });

  app.post('/api/auth/verify-otp', async (request, reply) => {
    const body = request.body as { email?: string; otp?: string };
    const email = body?.email?.trim().toLowerCase();
    const otp = body?.otp?.trim();

    if (!email || !otp) {
      return reply.code(400).send({ message: 'Email and OTP are required.' });
    }
    if (!isGmailAddress(email)) {
      return reply.code(400).send({
        message: 'OTP verification requires a valid @gmail.com address.',
      });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        systemRole: true,
        emailVerified: true,
      },
    });
    if (!user) {
      return reply.code(404).send({ message: 'Account not found.' });
    }

    const valid = await consumeOtp(prisma, 'signup', email, otp);
    if (!valid) {
      return reply.code(400).send({ message: 'Invalid or expired OTP code.' });
    }

    const verified = await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        systemRole: true,
        emailVerified: true,
      },
    });

    const session = await createCliSession(prisma, verified.id);
    return buildAuthResponse(session, verified);
  });

  app.post('/api/auth/google', async (request, reply) => {
    const body = request.body as {
      access_token?: string;
      idToken?: string;
    };
    const profile = await fetchGoogleProfile(body);
    if (!profile?.sub || !profile.email) {
      return reply.code(401).send({ message: 'Invalid Google access token.' });
    }

    const user = await upsertOAuthUser(prisma, 'google', {
      accountId: profile.sub,
      email: profile.email,
      displayName: profile.name ?? null,
      image: profile.picture ?? null,
    });
    const session = await createCliSession(prisma, user.id);
    return buildAuthResponse(session, user);
  });

  app.post('/api/auth/microsoft', async (request, reply) => {
    const body = request.body as { access_token?: string };
    const accessToken = body?.access_token?.trim();
    if (!accessToken) {
      return reply.code(400).send({ message: 'access_token is required.' });
    }

    const profile = await fetchMicrosoftProfile(accessToken);
    const email = profile?.mail || profile?.userPrincipalName;
    if (!profile?.id || !email) {
      return reply
        .code(401)
        .send({ message: 'Invalid Microsoft access token.' });
    }

    const user = await upsertOAuthUser(prisma, 'microsoft', {
      accountId: profile.id,
      email,
      displayName: profile.displayName ?? null,
    });
    const session = await createCliSession(prisma, user.id);
    return buildAuthResponse(session, user);
  });

  app.post('/api/auth/forgot-password', async (request, reply) => {
    const body = request.body as { email?: string };
    const email = body?.email?.trim().toLowerCase();
    if (!email) {
      return reply.code(400).send({ message: 'Email is required.' });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (!user) {
      return reply.send({
        message:
          'If an account exists for that email, a reset code has been sent.',
      });
    }

    const otp = generateOtp();
    await storeOtp(prisma, 'reset', email, otp);
    await deliverOtpEmail(email, otp, 'reset');

    return reply.send({
      message:
        'If an account exists for that email, a reset code has been sent.',
    });
  });

  app.post('/api/auth/reset-password', async (request, reply) => {
    const body = request.body as {
      email?: string;
      otp?: string;
      newPassword?: string;
    };
    const email = body?.email?.trim().toLowerCase();
    const otp = body?.otp?.trim();
    const newPassword = body?.newPassword ?? '';

    if (!email || !otp || !newPassword) {
      return reply
        .code(400)
        .send({ message: 'Email, OTP, and newPassword are required.' });
    }
    if (newPassword.length < 6) {
      return reply
        .code(400)
        .send({ message: 'Password must be at least 6 characters.' });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (!user) {
      return reply.code(404).send({ message: 'Account not found.' });
    }

    const valid = await consumeOtp(prisma, 'reset', email, otp);
    if (!valid) {
      return reply.code(400).send({ message: 'Invalid or expired OTP code.' });
    }

    const hashed = await hashPassword(newPassword);
    const account = await prisma.authAccount.findFirst({
      where: { userId: user.id, providerId: 'credential' },
      select: { id: true },
    });
    if (account) {
      await prisma.authAccount.update({
        where: { id: account.id },
        data: { password: hashed },
      });
    } else {
      await prisma.authAccount.create({
        data: {
          id: randomUUID(),
          userId: user.id,
          providerId: 'credential',
          accountId: user.id,
          password: hashed,
        },
      });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true },
    });

    return reply.send({ message: 'Password reset successfully.' });
  });

  app.get('/api/auth/me', async (request, reply) => {
    const authHeader = request.headers.authorization;
    const token =
      authHeader && authHeader.startsWith('Bearer ')
        ? authHeader.slice('Bearer '.length).trim()
        : null;
    if (!token) {
      return reply.code(401).send({ message: 'Authentication required.' });
    }

    const user = await store.getUserByToken(requestBaseUrl(request), token);
    if (!user) {
      return reply.code(401).send({ message: 'Invalid or expired session.' });
    }

    return {
      user: toAdminUserPayload({
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName ?? null,
        systemRole:
          user.systemRole === 'admin' ? SystemRole.admin : SystemRole.user,
      }),
    };
  });

  app.post('/api/auth/refresh-tokens', async (request, reply) => {
    const body = request.body as { refreshToken?: string };
    const refreshToken = body?.refreshToken?.trim();
    if (!refreshToken) {
      return reply.code(400).send({ message: 'refreshToken is required.' });
    }

    const session = await prisma.cliSession.findFirst({
      where: { refreshToken, revokedAt: null },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
            displayName: true,
            systemRole: true,
          },
        },
      },
    });
    if (!session || (session.expiresAt && session.expiresAt < new Date())) {
      return reply
        .code(401)
        .send({ message: 'Invalid or expired refresh token.' });
    }

    const nextSession = await createCliSession(prisma, session.userId);
    await prisma.cliSession.updateMany({
      where: { id: session.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return buildAuthResponse(nextSession, session.user);
  });

  app.post('/api/auth/logout', async (request, reply) => {
    const body = request.body as { refreshToken?: string };
    const refreshToken = body?.refreshToken?.trim();
    if (refreshToken) {
      await prisma.cliSession.updateMany({
        where: { refreshToken, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    return reply.send({ ok: true });
  });
}
