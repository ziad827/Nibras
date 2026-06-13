-- DropForeignKey
ALTER TABLE "SubmissionAttempt" DROP CONSTRAINT "SubmissionAttempt_projectId_fkey";

-- DropForeignKey
ALTER TABLE "SubmissionAttempt" DROP CONSTRAINT "SubmissionAttempt_projectReleaseId_fkey";

-- AlterTable
ALTER TABLE "CatalogCourse" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Petition" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Program" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ProgramApproval" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ProgramVersion" ADD COLUMN     "durationYears" INTEGER NOT NULL DEFAULT 4,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "RequirementGroup" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "StudentPlannedCourse" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "StudentProgram" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "StudentRequirementDecision" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Track" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateIndex
CREATE UNIQUE INDEX "StudentPlannedCourse_studentProgramId_catalogCourseId_plann_key" ON "StudentPlannedCourse"("studentProgramId", "catalogCourseId", "plannedYear", "plannedTerm");

-- CreateIndex
CREATE INDEX "StudentProgram_userId_idx" ON "StudentProgram"("userId");

-- AddForeignKey
ALTER TABLE "SubmissionAttempt" ADD CONSTRAINT "SubmissionAttempt_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmissionAttempt" ADD CONSTRAINT "SubmissionAttempt_projectReleaseId_fkey" FOREIGN KEY ("projectReleaseId") REFERENCES "ProjectRelease"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "StudentPlannedCourse_studentProgramId_plannedYear_plannedTerm_i" RENAME TO "StudentPlannedCourse_studentProgramId_plannedYear_plannedTe_idx";

-- RenameIndex
ALTER INDEX "StudentRequirementDecision_studentProgramId_requirementGroupId_" RENAME TO "StudentRequirementDecision_studentProgramId_requirementGrou_key";
