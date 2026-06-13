import { Prisma, PrismaClient, SubmissionStatus } from '@prisma/client';
import { enqueueVerificationJob } from './queue';

export function isRealCommitSha(commitSha: string): boolean {
  return (
    commitSha.length > 0 &&
    !commitSha.startsWith('github-pending-') &&
    !commitSha.startsWith('manual-')
  );
}

export type EnsureVerificationJobOptions = {
  attempt?: number;
  runLog?: string;
  runStatus?: SubmissionStatus;
  jobStatus?: SubmissionStatus;
  startedAt?: Date | null;
  maxAttempts?: number;
};

export type EnsureVerificationJobResult = {
  jobId: string;
  created: boolean;
};

type VerificationJobClient = Prisma.TransactionClient | PrismaClient;

export async function ensureVerificationJob(
  tx: VerificationJobClient,
  submissionAttemptId: string,
  opts?: EnsureVerificationJobOptions,
): Promise<EnsureVerificationJobResult> {
  const existingJob = await tx.verificationJob.findFirst({
    where: { submissionAttemptId },
    orderBy: { createdAt: 'asc' },
  });

  if (existingJob) {
    if (
      opts?.jobStatus === SubmissionStatus.queued &&
      existingJob.status !== SubmissionStatus.queued &&
      existingJob.status !== SubmissionStatus.running
    ) {
      await tx.verificationJob.update({
        where: { id: existingJob.id },
        data: {
          status: SubmissionStatus.queued,
          finishedAt: null,
          claimedAt: null,
        },
      });
    }
    return { jobId: existingJob.id, created: false };
  }

  const runCount = await tx.verificationRun.count({
    where: { submissionAttemptId },
  });
  const attempt = opts?.attempt ?? runCount;
  const runStatus = opts?.runStatus ?? SubmissionStatus.queued;
  const runLog = opts?.runLog ?? 'Queued';
  const jobStatus = opts?.jobStatus ?? SubmissionStatus.queued;

  await tx.verificationRun.create({
    data: {
      submissionAttemptId,
      attempt,
      status: runStatus,
      log: runLog,
      startedAt:
        opts?.startedAt !== undefined
          ? opts.startedAt
          : runStatus === SubmissionStatus.running
            ? new Date()
            : null,
    },
  });

  const vJob = await tx.verificationJob.create({
    data: {
      submissionAttemptId,
      status: jobStatus,
      attempt,
      maxAttempts: opts?.maxAttempts ?? 3,
    },
  });

  return { jobId: vJob.id, created: true };
}

export async function ensureVerificationJobAndEnqueue(
  prisma: PrismaClient,
  submissionAttemptId: string,
  opts?: EnsureVerificationJobOptions,
): Promise<string> {
  const result = await prisma.$transaction(async (tx) =>
    ensureVerificationJob(tx, submissionAttemptId, opts),
  );
  void enqueueVerificationJob({
    jobId: result.jobId,
    submissionAttemptId,
    attempt: opts?.attempt ?? 0,
    maxAttempts: opts?.maxAttempts ?? 3,
  });
  return result.jobId;
}
