/**
 * Thin Resend wrapper for transactional emails.
 * Silently disabled when RESEND_API_KEY is not set.
 */
async function sendEmail(
  to: string,
  subject: string,
  text: string,
  html?: string,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;
  const from = process.env.NIBRAS_EMAIL_FROM ?? 'Nibras <noreply@nibras.dev>';
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      text,
      ...(html ? { html } : {}),
    }),
  });
  if (!res.ok) {
    throw new Error(`Resend ${res.status}: ${await res.text()}`);
  }
}

// ── HTML Templates ─────────────────────────────────────────────────────────────

function submissionStatusHtml(ctx: SubmissionStatusEmailContext): string {
  const statusColors = {
    passed: '#22c55e',
    failed: '#ef4444',
    needs_review: '#f59e0b',
  };
  const statusLabels = {
    passed: 'Tests Passed ✓',
    failed: 'Tests Failed ✗',
    needs_review: 'Awaiting Review',
  };
  const color = statusColors[ctx.status];
  const label = statusLabels[ctx.status];
  const bodyText = {
    passed: `Your submission for <strong>${ctx.projectName}</strong> passed all automated tests.`,
    failed: `Your submission for <strong>${ctx.projectName}</strong> did not pass the automated tests. Please review your code and resubmit.`,
    needs_review: `Your submission for <strong>${ctx.projectName}</strong> passed all automated tests and has been sent to your instructor for review.`,
  };
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family:system-ui,-apple-system,sans-serif;background:#f9fafb;margin:0;padding:32px 16px;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);">
    <div style="background:${color};padding:24px 32px;">
      <h1 style="margin:0;color:#fff;font-size:20px;font-weight:600;">${label}</h1>
      <p style="margin:4px 0 0;color:rgba(255,255,255,.85);font-size:14px;">${ctx.projectName}</p>
    </div>
    <div style="padding:32px;">
      <p style="margin:0 0 16px;color:#374151;font-size:15px;">Hi ${ctx.studentName},</p>
      <p style="margin:0 0 24px;color:#374151;font-size:15px;">${bodyText[ctx.status]}</p>
      <a href="${ctx.submissionUrl}"
         style="display:inline-block;background:${color};color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:500;">
        View Submission
      </a>
    </div>
    <div style="padding:16px 32px;border-top:1px solid #f3f4f6;color:#9ca3af;font-size:12px;">
      Nibras — Automated Submission Platform
    </div>
  </div>
</body>
</html>`;
}

function reviewReadyHtml(ctx: ReviewReadyEmailContext): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family:system-ui,-apple-system,sans-serif;background:#f9fafb;margin:0;padding:32px 16px;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);">
    <div style="background:#7c3aed;padding:24px 32px;">
      <h1 style="margin:0;color:#fff;font-size:20px;font-weight:600;">Review Needed</h1>
      <p style="margin:4px 0 0;color:rgba(255,255,255,.85);font-size:14px;">${ctx.projectName}</p>
    </div>
    <div style="padding:32px;">
      <p style="margin:0 0 16px;color:#374151;font-size:15px;">Hi ${ctx.instructorName},</p>
      <p style="margin:0 0 24px;color:#374151;font-size:15px;">
        <strong>${ctx.studentName}</strong>'s submission for <strong>${ctx.projectName}</strong>
        passed automated tests but was flagged for human review.
      </p>
      <a href="${ctx.reviewQueueUrl}"
         style="display:inline-block;background:#7c3aed;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:500;">
        Open Review Queue
      </a>
    </div>
    <div style="padding:16px 32px;border-top:1px solid #f3f4f6;color:#9ca3af;font-size:12px;">
      Nibras — Automated Submission Platform
    </div>
  </div>
</body>
</html>`;
}

// ── Public email functions ──────────────────────────────────────────────────────

export type SubmissionStatusEmailContext = {
  studentEmail: string;
  studentName: string;
  projectName: string;
  status: 'passed' | 'failed' | 'needs_review';
  submissionUrl: string;
};

export async function sendSubmissionStatusEmail(
  ctx: SubmissionStatusEmailContext,
): Promise<void> {
  const subjectMap = {
    passed: `[Nibras] ${ctx.projectName} — tests passed`,
    failed: `[Nibras] ${ctx.projectName} — tests failed`,
    needs_review: `[Nibras] ${ctx.projectName} — tests passed, awaiting review`,
  };
  const bodyMap = {
    passed: `Hi ${ctx.studentName},\n\nYour submission for "${ctx.projectName}" passed all tests.\n\nView details: ${ctx.submissionUrl}`,
    failed: `Hi ${ctx.studentName},\n\nYour submission for "${ctx.projectName}" did not pass the automated tests. Please review your code and resubmit.\n\nView details: ${ctx.submissionUrl}`,
    needs_review: `Hi ${ctx.studentName},\n\nYour submission for "${ctx.projectName}" passed all automated tests and has been sent to your instructor for review.\n\nView details: ${ctx.submissionUrl}`,
  };
  await sendEmail(
    ctx.studentEmail,
    subjectMap[ctx.status],
    bodyMap[ctx.status],
    submissionStatusHtml(ctx),
  );
}

export type ReviewReadyEmailContext = {
  instructorEmail: string;
  instructorName: string;
  studentName: string;
  projectName: string;
  reviewQueueUrl: string;
};

export async function sendReviewReadyEmail(
  ctx: ReviewReadyEmailContext,
): Promise<void> {
  const subject = `[Nibras] Review needed — ${ctx.projectName} (${ctx.studentName})`;
  const text = `Hi ${ctx.instructorName},\n\n${ctx.studentName}'s submission for "${ctx.projectName}" passed automated tests but was flagged for human review.\n\nReview queue: ${ctx.reviewQueueUrl}`;
  await sendEmail(ctx.instructorEmail, subject, text, reviewReadyHtml(ctx));
}

function wrapTemplate(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html><html lang="en"><body style="font-family:system-ui,sans-serif;background:#f9fafb;padding:24px;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:24px;">
    <h1 style="margin:0 0 16px;font-size:20px;">${title}</h1>
    ${bodyHtml}
    <p style="color:#9ca3af;font-size:12px;margin-top:24px;">Nibras Educational Platform</p>
  </div></body></html>`;
}

export async function sendWelcomeEmail(
  to: string,
  name: string,
): Promise<void> {
  const html = wrapTemplate(
    'Welcome to Nibras',
    `<p>Hi ${name},</p><p>Your account is ready. Explore courses, join contests, and track your project milestones.</p>`,
  );
  await sendEmail(
    to,
    'Welcome to Nibras',
    `Hi ${name},\n\nWelcome to Nibras!`,
    html,
  );
}

export async function sendAssignmentDueEmail(
  to: string,
  name: string,
  assignmentTitle: string,
  dueAt: string,
  courseTitle: string,
): Promise<void> {
  const html = wrapTemplate(
    'Assignment due soon',
    `<p>Hi ${name},</p><p><strong>${assignmentTitle}</strong> in <strong>${courseTitle}</strong> is due on ${dueAt}.</p>`,
  );
  await sendEmail(
    to,
    `[Nibras] Assignment due: ${assignmentTitle}`,
    `Hi ${name},\n\n${assignmentTitle} (${courseTitle}) is due on ${dueAt}.`,
    html,
  );
}

export async function sendContestStartingEmail(
  to: string,
  name: string,
  contestName: string,
  startsAt: string,
  url: string,
): Promise<void> {
  const html = wrapTemplate(
    'Contest starting soon',
    `<p>Hi ${name},</p><p><strong>${contestName}</strong> starts at ${startsAt}.</p><p><a href="${url}">View contest</a></p>`,
  );
  await sendEmail(
    to,
    `[Nibras] Contest starting: ${contestName}`,
    `Hi ${name},\n\n${contestName} starts at ${startsAt}.\n${url}`,
    html,
  );
}

export async function sendBadgeEarnedEmail(
  to: string,
  name: string,
  badgeName: string,
  badgeDescription: string,
): Promise<void> {
  const html = wrapTemplate(
    'Badge earned',
    `<p>Hi ${name},</p><p>You earned <strong>${badgeName}</strong>.</p><p>${badgeDescription}</p>`,
  );
  await sendEmail(
    to,
    `[Nibras] Badge earned: ${badgeName}`,
    `Hi ${name},\n\nYou earned the "${badgeName}" badge.\n${badgeDescription}`,
    html,
  );
}
