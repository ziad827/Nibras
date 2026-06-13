/**
 * Thin Resend wrapper for transactional emails.
 * Silently disabled when RESEND_API_KEY is not set.
 */
export async function sendEmail(
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

type ReviewSubmittedCtx = {
  studentEmail: string;
  studentName: string;
  projectName: string;
  reviewStatus: 'approved' | 'graded' | 'changes_requested' | 'pending';
  feedback: string;
  submissionUrl: string;
};

function reviewSubmittedHtml(opts: ReviewSubmittedCtx): string {
  const label =
    opts.reviewStatus === 'changes_requested'
      ? 'changes requested'
      : opts.reviewStatus;
  const statusColors: Record<string, string> = {
    approved: '#22c55e',
    graded: '#3b82f6',
    changes_requested: '#f59e0b',
    pending: '#6b7280',
  };
  const color = statusColors[opts.reviewStatus] ?? '#6b7280';
  const feedbackHtml = opts.feedback
    ? `<div style="background:#f9fafb;border-left:3px solid ${color};padding:12px 16px;margin:16px 0;border-radius:0 6px 6px 0;">
        <p style="margin:0;font-size:13px;color:#6b7280;font-weight:500;text-transform:uppercase;letter-spacing:.05em;">Instructor Feedback</p>
        <p style="margin:8px 0 0;color:#374151;font-size:14px;white-space:pre-wrap;">${opts.feedback}</p>
       </div>`
    : '';
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family:system-ui,-apple-system,sans-serif;background:#f9fafb;margin:0;padding:32px 16px;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);">
    <div style="background:${color};padding:24px 32px;">
      <h1 style="margin:0;color:#fff;font-size:20px;font-weight:600;">Review: ${label}</h1>
      <p style="margin:4px 0 0;color:rgba(255,255,255,.85);font-size:14px;">${opts.projectName}</p>
    </div>
    <div style="padding:32px;">
      <p style="margin:0 0 16px;color:#374151;font-size:15px;">Hi ${opts.studentName},</p>
      <p style="margin:0 0 8px;color:#374151;font-size:15px;">
        Your instructor has reviewed your submission for <strong>${opts.projectName}</strong> (${label}).
      </p>
      ${feedbackHtml}
      <a href="${opts.submissionUrl}"
         style="display:inline-block;background:${color};color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:500;margin-top:8px;">
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

// ── Public email functions ──────────────────────────────────────────────────────

export async function sendReviewSubmittedEmail(
  opts: ReviewSubmittedCtx,
): Promise<void> {
  const label =
    opts.reviewStatus === 'changes_requested'
      ? 'changes requested'
      : opts.reviewStatus;
  const subject = `[Nibras] ${opts.projectName} — review: ${label}`;
  const feedbackLine = opts.feedback
    ? `\n\nInstructor feedback:\n${opts.feedback}`
    : '';
  const text = `Hi ${opts.studentName},\n\nYour instructor has reviewed your submission for "${opts.projectName}" (${label}).${feedbackLine}\n\nView details: ${opts.submissionUrl}`;
  await sendEmail(opts.studentEmail, subject, text, reviewSubmittedHtml(opts));
}
