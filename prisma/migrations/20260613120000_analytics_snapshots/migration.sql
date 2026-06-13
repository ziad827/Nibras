-- CreateEnum
CREATE TYPE "AnalyticsSnapshotType" AS ENUM ('student', 'course', 'platform');

-- CreateTable
CREATE TABLE "AnalyticsSnapshot" (
    "id" TEXT NOT NULL,
    "type" "AnalyticsSnapshotType" NOT NULL,
    "targetId" TEXT,
    "period" TEXT NOT NULL,
    "metricsJson" JSONB NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AnalyticsSnapshot_type_period_calculatedAt_idx" ON "AnalyticsSnapshot"("type", "period", "calculatedAt");

-- CreateIndex
CREATE INDEX "AnalyticsSnapshot_targetId_type_idx" ON "AnalyticsSnapshot"("targetId", "type");
