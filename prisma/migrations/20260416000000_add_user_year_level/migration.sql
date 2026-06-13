-- Add global yearLevel to User as the single source of truth for academic standing.
-- Back-fill from MAX(CourseMembership.level) to avoid regressing existing students.

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "yearLevel" INTEGER NOT NULL DEFAULT 1;

UPDATE "User" u
SET "yearLevel" = COALESCE(
  (
    SELECT MAX(cm.level)
    FROM "CourseMembership" cm
    WHERE cm."userId" = u.id
      AND cm.role = 'student'
  ),
  1
);

CREATE INDEX IF NOT EXISTS "User_yearLevel_idx" ON "User"("yearLevel");
