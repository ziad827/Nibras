import { PrismaClient } from '@prisma/client';
import { fetchers } from './fetchers/index';

const PLATFORMS = [
  'codeforces',
  'leetcode',
  'atcoder',
  'codechef',
  'ctftime',
] as const;

function log(level: string, msg: string, extra?: Record<string, unknown>) {
  process.stdout.write(
    JSON.stringify({ level, time: new Date().toISOString(), msg, ...extra }) +
      '\n',
  );
}

export async function runContestSync(prisma: PrismaClient): Promise<void> {
  for (const platform of PLATFORMS) {
    const startedAt = new Date();
    try {
      const fetcher = fetchers[platform];
      if (!fetcher) continue;

      const contests = await fetcher.fetchContests();
      let upserted = 0;

      for (const c of contests) {
        await prisma.contest.upsert({
          where: {
            platform_platformContestId: {
              platform,
              platformContestId: c.platformContestId,
            },
          },
          create: {
            platform,
            platformContestId: c.platformContestId,
            name: c.name,
            url: c.url,
            startsAt: c.startsAt,
            endsAt: c.endsAt,
            durationMinutes: c.durationMinutes,
            phase: c.phase,
            tags: c.tags,
          },
          update: {
            name: c.name,
            url: c.url,
            startsAt: c.startsAt,
            endsAt: c.endsAt,
            durationMinutes: c.durationMinutes,
            phase: c.phase,
            tags: c.tags,
          },
        });
        upserted++;
      }

      await prisma.compSyncLog.create({
        data: {
          jobType: 'contest_fetch',
          platform,
          status: 'success',
          itemCount: upserted,
          startedAt,
        },
      });

      log('info', `Contest sync: ${platform} — ${upserted} contests`, {
        platform,
        upserted,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      log('warn', `Contest sync failed: ${platform}`, {
        platform,
        error: message,
      });
      await prisma.compSyncLog.create({
        data: {
          jobType: 'contest_fetch',
          platform,
          status: 'error',
          errorMessage: message,
          startedAt,
        },
      });
    }
  }
}

const STALE_SYNC_MS = 6 * 60 * 60 * 1000;

export function isContestStartupSyncEnabled(): boolean {
  const flag = process.env.COMPETITIONS_STARTUP_SYNC;
  if (flag === 'false') return false;
  if (flag === 'true') return true;
  return process.env.NODE_ENV === 'production';
}

export async function shouldRunContestStartupSync(
  prisma: PrismaClient,
): Promise<boolean> {
  if (!isContestStartupSyncEnabled()) return false;

  const count = await prisma.contest.count();
  if (count === 0) return true;

  const lastSync = await prisma.compSyncLog.findFirst({
    where: { jobType: 'contest_fetch', status: 'success' },
    orderBy: { startedAt: 'desc' },
  });
  if (!lastSync) return true;
  return Date.now() - lastSync.startedAt.getTime() > STALE_SYNC_MS;
}
