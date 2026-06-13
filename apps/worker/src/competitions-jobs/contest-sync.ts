import type { PrismaClient } from '@prisma/client';

export async function runContestSync(prisma: PrismaClient): Promise<void> {
  const { runContestSync: sync } = await import(
    '../../../api/dist/features/competitions/contest-sync.js'
  );
  return sync(prisma);
}
