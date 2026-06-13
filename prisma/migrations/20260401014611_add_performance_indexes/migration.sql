-- AlterTable
ALTER TABLE "VerificationJob" ALTER COLUMN "traceId" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "CliSession_userId_idx" ON "CliSession"("userId");

-- CreateIndex
CREATE INDEX "SubmissionAttempt_userId_idx" ON "SubmissionAttempt"("userId");

-- CreateIndex
CREATE INDEX "SubmissionAttempt_projectId_idx" ON "SubmissionAttempt"("projectId");

-- CreateIndex
CREATE INDEX "SubmissionAttempt_status_idx" ON "SubmissionAttempt"("status");

-- CreateIndex
CREATE INDEX "SubmissionAttempt_milestoneId_idx" ON "SubmissionAttempt"("milestoneId");

-- CreateIndex
CREATE INDEX "User_systemRole_idx" ON "User"("systemRole");

-- CreateIndex
CREATE INDEX "WebSession_userId_idx" ON "WebSession"("userId");
