import type { PrismaClient } from '@prisma/client';

function startOfDay(d: Date): Date {
  const out = new Date(d);
  out.setUTCHours(0, 0, 0, 0);
  return out;
}

function endOfDay(d: Date): Date {
  const out = new Date(d);
  out.setUTCHours(23, 59, 59, 999);
  return out;
}

function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * 24 * 60 * 60 * 1000);
}

function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function runAnalyticsSnapshot(
  prisma: PrismaClient,
): Promise<void> {
  const end = endOfDay(new Date());
  const start = startOfDay(addDays(end, -1));
  const period = toDateKey(start);

  const [activeUsers, submissionCount, questionCount, contestCount] =
    await Promise.all([
      prisma.videoProgress.findMany({
        where: { updatedAt: { gte: start, lte: end } },
        select: { userId: true },
        distinct: ['userId'],
      }),
      prisma.submissionAttempt.count({
        where: {
          OR: [
            { submittedAt: { gte: start, lte: end } },
            { submittedAt: null, createdAt: { gte: start, lte: end } },
          ],
        },
      }),
      prisma.communityQuestion.count({
        where: { createdAt: { gte: start, lte: end } },
      }),
      prisma.contest.count({
        where: { startsAt: { gte: start, lte: end } },
      }),
    ]);

  await prisma.analyticsSnapshot.create({
    data: {
      type: 'platform',
      targetId: null,
      period,
      metricsJson: {
        activeUsers: activeUsers.length,
        submissionCount,
        questionsAsked: questionCount,
        contestsHeld: contestCount,
        period: { from: start.toISOString(), to: end.toISOString() },
      },
    },
  });
}
