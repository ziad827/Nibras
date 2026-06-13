import { PrismaClient } from '@prisma/client';
import { getUserToday, msUntilMidnight } from '@nibras/daily-problem';

function log(level: string, msg: string, extra?: Record<string, unknown>) {
  process.stdout.write(
    JSON.stringify({ level, time: new Date().toISOString(), msg, ...extra }) +
      '\n',
  );
}

async function sendDailyReminderEmail(
  to: string,
  problemTitle: string,
  streak: number,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;
  const from = process.env.NIBRAS_EMAIL_FROM ?? 'Nibras <noreply@nibras.dev>';
  const subject = `[Nibras] Daily problem reminder — ${problemTitle}`;
  const text = `Your daily problem "${problemTitle}" is still waiting. Current streak: ${streak} day${streak === 1 ? '' : 's'}. Open Nibras to solve it before midnight in your timezone.`;
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

export async function runDailyProblemReminder(
  prisma: PrismaClient,
): Promise<void> {
  const configs = await prisma.dailyProblemConfig.findMany({
    where: {
      enabled: true,
      reminderEnabled: true,
      OR: [{ pausedUntil: null }, { pausedUntil: { lte: new Date() } }],
    },
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
    const today = getUserToday(config.timezone);
    if (config.lastReminderDate === today) continue;

    const msLeft = msUntilMidnight(config.timezone);
    const msBefore = config.reminderMinutesBefore * 60 * 1000;
    if (msLeft > msBefore) continue;

    const assignment = await prisma.dailyProblemAssignment.findUnique({
      where: {
        userId_assignedDate: { userId: config.userId, assignedDate: today },
      },
      include: { problem: true },
    });

    if (!assignment || assignment.solved || assignment.skipped) continue;

    await prisma.notification.create({
      data: {
        userId: config.userId,
        type: 'daily_problem_reminder',
        title: 'Daily problem reminder',
        body: `"${assignment.problem.title}" is due before midnight. Streak: ${config.currentStreak} day${config.currentStreak === 1 ? '' : 's'}.`,
        link: '/competitions/daily',
      },
    });

    const email = config.user.notificationEmail ?? config.user.email;
    try {
      await sendDailyReminderEmail(
        email,
        assignment.problem.title,
        config.currentStreak,
      );
    } catch (err) {
      log('warn', 'Daily reminder email failed', {
        userId: config.userId,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    await prisma.dailyProblemConfig.update({
      where: { id: config.id },
      data: { lastReminderDate: today },
    });

    sent++;
  }

  if (sent > 0) {
    log('info', `Daily problem reminders: sent ${sent}`);
  }
}
