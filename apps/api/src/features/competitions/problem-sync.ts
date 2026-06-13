import { PrismaClient } from '@prisma/client';
import { fetchers } from './fetchers/index';
import { isContestStartupSyncEnabled } from './contest-sync';

const PLATFORMS = ['codeforces', 'leetcode', 'atcoder', 'codechef'] as const;

const STALE_SYNC_MS = 6 * 60 * 60 * 1000;

function log(level: string, msg: string, extra?: Record<string, unknown>) {
  process.stdout.write(
    JSON.stringify({ level, time: new Date().toISOString(), msg, ...extra }) +
      '\n',
  );
}

export async function runProblemSync(prisma: PrismaClient): Promise<void> {
  for (const platform of PLATFORMS) {
    const startedAt = new Date();
    try {
      const fetcher = fetchers[platform];
      if (!fetcher) continue;

      const problems = await fetcher.fetchProblems();
      if (problems.length === 0) {
        log('info', `Problem sync: ${platform} — no problems returned`, {
          platform,
        });
        continue;
      }

      let upserted = 0;
      const BATCH_SIZE = 100;
      for (let i = 0; i < problems.length; i += BATCH_SIZE) {
        const batch = problems.slice(i, i + BATCH_SIZE);
        await Promise.all(
          batch.map((p) =>
            prisma.problem.upsert({
              where: {
                platform_platformProblemId: {
                  platform,
                  platformProblemId: p.platformProblemId,
                },
              },
              create: {
                platform,
                platformProblemId: p.platformProblemId,
                title: p.title,
                url: p.url,
                difficulty: p.difficulty,
                tags: p.tags,
              },
              update: {
                title: p.title,
                url: p.url,
                difficulty: p.difficulty,
                tags: p.tags,
              },
            }),
          ),
        );
        upserted += batch.length;
      }

      await prisma.compSyncLog.create({
        data: {
          jobType: 'problem_fetch',
          platform,
          status: 'success',
          itemCount: upserted,
          startedAt,
        },
      });

      log('info', `Problem sync: ${platform} — ${upserted} problems`, {
        platform,
        upserted,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      log('warn', `Problem sync failed: ${platform}`, {
        platform,
        error: message,
      });
      await prisma.compSyncLog.create({
        data: {
          jobType: 'problem_fetch',
          platform,
          status: 'error',
          errorMessage: message,
          startedAt,
        },
      });
    }
  }
}

export async function shouldRunProblemStartupSync(
  prisma: PrismaClient,
): Promise<boolean> {
  if (!isContestStartupSyncEnabled()) return false;

  const codeforcesCount = await prisma.problem.count({
    where: { platform: 'codeforces' },
  });
  if (codeforcesCount === 0) return true;

  const lastSync = await prisma.compSyncLog.findFirst({
    where: { jobType: 'problem_fetch', status: 'success' },
    orderBy: { startedAt: 'desc' },
  });
  if (!lastSync) return true;
  return Date.now() - lastSync.startedAt.getTime() > STALE_SYNC_MS;
}
