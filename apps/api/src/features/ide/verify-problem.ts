import { PrismaClient } from '@prisma/client';
import type { IdeVerifyProblemRequest } from '@nibras/contracts';
import { DEFAULT_REPUTATION_WEIGHTS } from '../reputation/reputation-weights';
import {
  getTodayAssignment,
  verifyTodayProblemOnPlatform,
} from '../daily-problem/service';
import { getUserCfData } from '../competitions/practice/codeforces/cf-api';
import { parseRoadmapProblemUrl } from '../competitions/practice/cp-roadmap/problem-id';
import { setCpRoadmapProblemSolved } from '../competitions/practice/cp-roadmap/cp-roadmap-client';
import { getAtCoderUserStatus } from '../competitions/practice/atcoder/atcoder-api';
import { resolveVerifiedHandle } from '../competitions/practice/resolve-handle';
import { getLcUserStatus } from '../competitions/practice/leetcode/lc-api';
import { setNibras75ProblemSolved } from '../competitions/practice/nibras75/nibras75-client';
import { GamificationService } from '../gamification/service';

export type IdeVerifyProblemResult = {
  verified: boolean;
  error?: string;
  reputationEarned?: number;
  milestoneBonus?: number;
  newBadges?: string[];
};

export function verifyNibras75FromLcStatus(
  slug: string,
  handle: string,
  statusMap: Map<string, { solved: boolean }>,
): { verified: boolean; error?: string } {
  const solved = statusMap.get(slug)?.solved ?? false;
  if (!solved) {
    return {
      verified: false,
      error: `No accepted submission found for this problem on LeetCode (@${handle}).`,
    };
  }
  return { verified: true };
}

export function verifyCpRoadmapFromPlatformStatus(
  platformProblemId: string,
  platform: 'codeforces' | 'leetcode' | 'atcoder',
  handle: string,
  cfStatus: Map<string, { solved: boolean }>,
  lcStatus: Map<string, { solved: boolean }>,
  atcoderStatus: Map<string, { solved: boolean }>,
): { verified: boolean; error?: string } {
  const solved =
    platform === 'codeforces'
      ? (cfStatus.get(platformProblemId)?.solved ?? false)
      : platform === 'leetcode'
        ? (lcStatus.get(platformProblemId)?.solved ?? false)
        : (atcoderStatus.get(platformProblemId)?.solved ?? false);
  if (!solved) {
    const label =
      platform === 'codeforces'
        ? 'Codeforces'
        : platform === 'leetcode'
          ? 'LeetCode'
          : 'AtCoder';
    return {
      verified: false,
      error: `No accepted submission found for this problem on ${label} (@${handle}).`,
    };
  }
  return { verified: true };
}

async function awardCpRoadmapVerifyReputation(
  prisma: PrismaClient,
  userId: string,
  problemSlug: string,
): Promise<number> {
  const existing = await prisma.cpRoadmapProblemProgress.findUnique({
    where: {
      userId_roadmapProblemId: { userId, roadmapProblemId: problemSlug },
    },
    select: { solved: true },
  });
  if (existing?.solved) return 0;

  const source = `cp-roadmap:${problemSlug}`;
  const delta = DEFAULT_REPUTATION_WEIGHTS.problem;
  await prisma.reputationEvent.upsert({
    where: { userId_source: { userId, source } },
    create: {
      userId,
      source,
      reason: 'Solved a CP Roadmap problem',
      delta,
      category: 'problem',
    },
    update: {},
  });
  return delta;
}

async function upsertCpRoadmapUserProblemProgress(
  prisma: PrismaClient,
  userId: string,
  problemUrl: string,
): Promise<void> {
  const parsed = parseRoadmapProblemUrl(problemUrl);
  if (!parsed || parsed.platform === 'atcoder') return;

  const problem = await prisma.problem.findFirst({
    where: {
      platform: parsed.platform,
      platformProblemId: parsed.platformProblemId,
    },
    select: { id: true },
  });
  if (!problem) return;

  await prisma.userProblemProgress.upsert({
    where: { userId_problemId: { userId, problemId: problem.id } },
    create: {
      userId,
      problemId: problem.id,
      solved: true,
      solvedAt: new Date(),
    },
    update: { solved: true, solvedAt: new Date() },
  });
}

export async function verifyIdeProblem(
  prisma: PrismaClient,
  userId: string,
  payload: IdeVerifyProblemRequest,
): Promise<IdeVerifyProblemResult> {
  if (payload.source === 'daily') {
    const today = await getTodayAssignment(prisma, userId);
    const todayProblemId = today.assignment?.problem.id;
    if (!todayProblemId || todayProblemId !== payload.slug.trim()) {
      return {
        verified: false,
        error: 'Platform verify is only available for today’s daily problem.',
      };
    }
    return verifyTodayProblemOnPlatform(prisma, userId);
  }

  if (payload.source === 'nibras75') {
    const slug = payload.slug.trim();
    const lcHandle = await resolveVerifiedHandle(prisma, 'leetcode', userId);
    if (!lcHandle) {
      return {
        verified: false,
        error: 'Link and verify your LeetCode account under Contests first.',
      };
    }

    const statusMap = await getLcUserStatus(lcHandle);
    const check = verifyNibras75FromLcStatus(slug, lcHandle, statusMap);
    if (!check.verified) {
      return check;
    }

    await setNibras75ProblemSolved(prisma, userId, slug, true);
    return { verified: true };
  }

  if (payload.source === 'cp-roadmap') {
    const problemUrl = payload.externalUrl?.trim();
    const problemSlug = payload.slug.trim();
    if (!problemUrl) {
      return {
        verified: false,
        error: 'Problem URL is required for CP roadmap verification.',
      };
    }

    const parsed = parseRoadmapProblemUrl(problemUrl);
    if (!parsed) {
      return {
        verified: false,
        error:
          'Platform verification is only supported for Codeforces, LeetCode, and AtCoder problems.',
      };
    }

    if (parsed.platform === 'codeforces') {
      const handle = await resolveVerifiedHandle(prisma, 'codeforces', userId);
      if (!handle) {
        return {
          verified: false,
          error:
            'Link and verify your Codeforces account under Contests first.',
        };
      }
      const { statusMap } = await getUserCfData(handle);
      const check = verifyCpRoadmapFromPlatformStatus(
        parsed.platformProblemId,
        'codeforces',
        handle,
        statusMap,
        new Map(),
        new Map(),
      );
      if (!check.verified) return check;
    } else if (parsed.platform === 'leetcode') {
      const handle = await resolveVerifiedHandle(prisma, 'leetcode', userId);
      if (!handle) {
        return {
          verified: false,
          error: 'Link and verify your LeetCode account under Contests first.',
        };
      }
      const statusMap = await getLcUserStatus(handle);
      const check = verifyCpRoadmapFromPlatformStatus(
        parsed.platformProblemId,
        'leetcode',
        handle,
        new Map(),
        statusMap,
        new Map(),
      );
      if (!check.verified) return check;
    } else {
      const handle = await resolveVerifiedHandle(prisma, 'atcoder', userId);
      if (!handle) {
        return {
          verified: false,
          error: 'Link and verify your AtCoder account under Contests first.',
        };
      }
      const statusMap = await getAtCoderUserStatus(handle);
      const check = verifyCpRoadmapFromPlatformStatus(
        parsed.platformProblemId,
        'atcoder',
        handle,
        new Map(),
        new Map(),
        statusMap,
      );
      if (!check.verified) return check;
    }

    const reputationEarned = await awardCpRoadmapVerifyReputation(
      prisma,
      userId,
      problemSlug,
    );
    await setCpRoadmapProblemSolved(prisma, userId, problemSlug, true, {
      userMarked: false,
    });
    await upsertCpRoadmapUserProblemProgress(prisma, userId, problemUrl);

    const gamification = new GamificationService(prisma);
    const newBadges = (await gamification.checkAndAwardBadges(userId)).map(
      (b) => b.name,
    );

    return { verified: true, reputationEarned, newBadges };
  }

  return { verified: false, error: 'Unsupported problem source.' };
}
