-- CP Roadmap notes, review scheduling, and gamification metrics
ALTER TABLE "CpRoadmapProblemProgress" ADD COLUMN IF NOT EXISTS "reviewAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "CpRoadmapProblemNote" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roadmapProblemId" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CpRoadmapProblemNote_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CpRoadmapProblemNote_userId_roadmapProblemId_key" ON "CpRoadmapProblemNote"("userId", "roadmapProblemId");
CREATE INDEX IF NOT EXISTS "CpRoadmapProblemNote_userId_idx" ON "CpRoadmapProblemNote"("userId");
CREATE INDEX IF NOT EXISTS "CpRoadmapProblemNote_roadmapProblemId_idx" ON "CpRoadmapProblemNote"("roadmapProblemId");

ALTER TABLE "CpRoadmapProblemNote" DROP CONSTRAINT IF EXISTS "CpRoadmapProblemNote_userId_fkey";
ALTER TABLE "CpRoadmapProblemNote" ADD CONSTRAINT "CpRoadmapProblemNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CpRoadmapProblemNote" DROP CONSTRAINT IF EXISTS "CpRoadmapProblemNote_roadmapProblemId_fkey";
ALTER TABLE "CpRoadmapProblemNote" ADD CONSTRAINT "CpRoadmapProblemNote_roadmapProblemId_fkey" FOREIGN KEY ("roadmapProblemId") REFERENCES "CpRoadmapProblem"("slug") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserGamificationMetrics" ADD COLUMN IF NOT EXISTS "cpRoadmapSolvedCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "UserGamificationMetrics" ADD COLUMN IF NOT EXISTS "cpRoadmapTopicsComplete" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "UserGamificationMetrics" ADD COLUMN IF NOT EXISTS "cpRoadmapPercent" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "UserGamificationMetrics" ADD COLUMN IF NOT EXISTS "cpRoadmapCategoriesComplete" INTEGER NOT NULL DEFAULT 0;
