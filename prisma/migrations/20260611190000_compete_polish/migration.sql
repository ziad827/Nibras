-- Nibras 75 notes, spaced repetition, weekly digest preference
ALTER TABLE "UserProblemProgress" ADD COLUMN "reviewAt" TIMESTAMP(3);

CREATE INDEX "UserProblemProgress_userId_reviewAt_idx" ON "UserProblemProgress"("userId", "reviewAt");

CREATE TABLE "Nibras75ProblemNote" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Nibras75ProblemNote_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Nibras75ProblemNote_userId_slug_key" ON "Nibras75ProblemNote"("userId", "slug");
CREATE INDEX "Nibras75ProblemNote_userId_idx" ON "Nibras75ProblemNote"("userId");

ALTER TABLE "Nibras75ProblemNote" ADD CONSTRAINT "Nibras75ProblemNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DailyProblemConfig" ADD COLUMN "weeklyDigestEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "DailyProblemConfig" ADD COLUMN "lastWeeklyDigestWeek" TEXT;
