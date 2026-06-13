-- Planner enhancements: prerequisites, catalog links, submit workflow, summer/away terms

ALTER TYPE "AcademicTerm" ADD VALUE IF NOT EXISTS 'summer';
ALTER TYPE "AcademicTerm" ADD VALUE IF NOT EXISTS 'away';

ALTER TABLE "CatalogCourse" ADD COLUMN IF NOT EXISTS "plannerCode" TEXT;
ALTER TABLE "CatalogCourse" ADD COLUMN IF NOT EXISTS "trackingCourseId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "CatalogCourse_trackingCourseId_key"
  ON "CatalogCourse"("trackingCourseId");

CREATE INDEX IF NOT EXISTS "CatalogCourse_programId_plannerCode_idx"
  ON "CatalogCourse"("programId", "plannerCode");

ALTER TABLE "CatalogCourse" DROP CONSTRAINT IF EXISTS "CatalogCourse_trackingCourseId_fkey";
ALTER TABLE "CatalogCourse" ADD CONSTRAINT "CatalogCourse_trackingCourseId_fkey"
  FOREIGN KEY ("trackingCourseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "CatalogCoursePrerequisite" (
  "id" TEXT NOT NULL,
  "catalogCourseId" TEXT NOT NULL,
  "prerequisiteCourseId" TEXT NOT NULL,
  CONSTRAINT "CatalogCoursePrerequisite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CatalogCoursePrerequisite_catalogCourseId_prerequisiteCourseId_key"
  ON "CatalogCoursePrerequisite"("catalogCourseId", "prerequisiteCourseId");

CREATE INDEX IF NOT EXISTS "CatalogCoursePrerequisite_catalogCourseId_idx"
  ON "CatalogCoursePrerequisite"("catalogCourseId");

CREATE INDEX IF NOT EXISTS "CatalogCoursePrerequisite_prerequisiteCourseId_idx"
  ON "CatalogCoursePrerequisite"("prerequisiteCourseId");

ALTER TABLE "CatalogCoursePrerequisite" DROP CONSTRAINT IF EXISTS "CatalogCoursePrerequisite_catalogCourseId_fkey";
ALTER TABLE "CatalogCoursePrerequisite" ADD CONSTRAINT "CatalogCoursePrerequisite_catalogCourseId_fkey"
  FOREIGN KEY ("catalogCourseId") REFERENCES "CatalogCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CatalogCoursePrerequisite" DROP CONSTRAINT IF EXISTS "CatalogCoursePrerequisite_prerequisiteCourseId_fkey";
ALTER TABLE "CatalogCoursePrerequisite" ADD CONSTRAINT "CatalogCoursePrerequisite_prerequisiteCourseId_fkey"
  FOREIGN KEY ("prerequisiteCourseId") REFERENCES "CatalogCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StudentProgram" ADD COLUMN IF NOT EXISTS "submittedForAdvisorAt" TIMESTAMP(3);

ALTER TABLE "Petition" ADD COLUMN IF NOT EXISTS "attachmentUrl" TEXT;
