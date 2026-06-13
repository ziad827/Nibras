-- CreateIndex
CREATE INDEX "CourseMembership_userId_idx" ON "CourseMembership"("userId");

-- CreateIndex
CREATE INDEX "Review_submissionAttemptId_idx" ON "Review"("submissionAttemptId");

-- CreateIndex
CREATE INDEX "AuditLog_courseId_createdAt_idx" ON "AuditLog"("courseId", "createdAt");

-- CreateIndex
CREATE INDEX "Milestone_projectId_idx" ON "Milestone"("projectId");

-- CreateIndex
CREATE INDEX "Project_courseId_status_idx" ON "Project"("courseId", "status");

-- CreateIndex
CREATE INDEX "Petition_studentProgramId_status_idx" ON "Petition"("studentProgramId", "status");
