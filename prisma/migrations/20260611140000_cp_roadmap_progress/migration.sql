-- CreateTable
CREATE TABLE "CpRoadmapProblemProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roadmapProblemId" TEXT NOT NULL,
    "solved" BOOLEAN NOT NULL DEFAULT false,
    "solvedAt" TIMESTAMP(3),
    "userMarked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CpRoadmapProblemProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CpRoadmapProblemProgress_userId_idx" ON "CpRoadmapProblemProgress"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CpRoadmapProblemProgress_userId_roadmapProblemId_key" ON "CpRoadmapProblemProgress"("userId", "roadmapProblemId");

-- AddForeignKey
ALTER TABLE "CpRoadmapProblemProgress" ADD CONSTRAINT "CpRoadmapProblemProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
