import { PrismaClient } from '@prisma/client';

function log(level: string, msg: string, extra?: Record<string, unknown>) {
  process.stdout.write(
    JSON.stringify({ level, time: new Date().toISOString(), msg, ...extra }) +
      '\n',
  );
}

function currentIsoWeek(): string {
  const now = new Date();
  const day = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const dayNum = day.getUTCDay() || 7;
  day.setUTCDate(day.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(day.getUTCFullYear(), 0, 1));
  const week = Math.ceil(
    ((day.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
  );
  return `${day.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

async function sendWeeklyDigestEmail(
  to: string,
  streak: number,
  longestStreak: number,
  totalCompleted: number,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;
  const from = process.env.NIBRAS_EMAIL_FROM ?? 'Nibras <noreply@nibras.dev>';
  const subject = '[Nibras] Your weekly daily problem digest';
  const text = `Weekly recap: ${streak}-day current streak (${longestStreak} best), ${totalCompleted} problems completed overall. Keep your streak alive on Nibras.`;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ from, to: [to], subject, text }),
  });
  if (!res.ok) {
    throw new Error(`Resend ${res.status}: ${await res.text()}`);
  }
}

export async function runDailyProblemWeeklyDigest(
  prisma: PrismaClient,
): Promise<void> {
  const now = new Date();
  if (now.getUTCDay() !== 0) return;

  const weekKey = currentIsoWeek();
  const configs = await prisma.dailyProblemConfig.findMany({
    where: { weeklyDigestEnabled: true },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          notificationEmail: true,
          username: true,
        },
      },
    },
  });

  let sent = 0;

  for (const config of configs) {
    if (config.lastWeeklyDigestWeek === weekKey) continue;

    await prisma.notification.create({
      data: {
        userId: config.userId,
        type: 'daily_problem_weekly_digest',
        title: 'Weekly daily problem recap',
        body: `Streak: ${config.currentStreak} days (${config.longestStreak} best) · ${config.totalCompleted} completed overall.`,
        link: '/competitions/daily',
      },
    });

    const email = config.user.notificationEmail ?? config.user.email;
    try {
      await sendWeeklyDigestEmail(
        email,
        config.currentStreak,
        config.longestStreak,
        config.totalCompleted,
      );
    } catch (err) {
      log('warn', 'Weekly digest email failed', {
        userId: config.userId,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    await prisma.dailyProblemConfig.update({
      where: { id: config.id },
      data: { lastWeeklyDigestWeek: weekKey },
    });

    sent++;
  }

  if (sent > 0) {
    log('info', `Daily problem weekly digests: sent ${sent}`);
  }
}
