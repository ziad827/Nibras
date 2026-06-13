import { CompPlatform, PrismaClient } from '@prisma/client';

export async function resolveVerifiedHandle(
  prisma: PrismaClient,
  platform: CompPlatform,
  userId: string | undefined,
  queryHandle?: string,
): Promise<string | undefined> {
  if (queryHandle?.trim()) return queryHandle.trim();
  if (!userId) return undefined;

  const account = await prisma.linkedAccount.findUnique({
    where: { userId_platform: { userId, platform } },
  });
  if (!account) return undefined;
  if (account.verificationStatus !== 'verified') return undefined;
  return account.handle;
}
