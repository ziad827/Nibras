import type { Prisma, PrismaClient } from '@prisma/client';

export type ReputationWeightKey =
  | 'submission'
  | 'answerAccepted'
  | 'problem'
  | 'dailySolve'
  | 'dailyMiss'
  | 'contest';

export type ReputationWeights = Record<ReputationWeightKey, number>;

export const DEFAULT_REPUTATION_WEIGHTS: ReputationWeights = {
  submission: 10,
  answerAccepted: 15,
  problem: 5,
  dailySolve: 10,
  dailyMiss: -3,
  contest: 5,
};

export function parseReputationWeights(
  raw: Prisma.JsonValue | null | undefined,
): ReputationWeights {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ...DEFAULT_REPUTATION_WEIGHTS };
  }
  const obj = raw as Record<string, unknown>;
  const result = { ...DEFAULT_REPUTATION_WEIGHTS };
  for (const key of Object.keys(
    DEFAULT_REPUTATION_WEIGHTS,
  ) as ReputationWeightKey[]) {
    const value = obj[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      result[key] = Math.round(value);
    }
  }
  return result;
}

export async function loadCourseReputationWeights(
  prisma: PrismaClient,
  courseIds: string[],
): Promise<Map<string, ReputationWeights>> {
  if (courseIds.length === 0) return new Map();
  const rows = await prisma.course.findMany({
    where: { id: { in: courseIds } },
    select: { id: true, reputationWeights: true },
  });
  return new Map(
    rows.map((row) => [row.id, parseReputationWeights(row.reputationWeights)]),
  );
}
