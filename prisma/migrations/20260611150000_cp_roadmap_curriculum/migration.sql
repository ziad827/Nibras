-- CreateEnum
CREATE TYPE "CpRoadmapSuggestionStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateTable
CREATE TABLE "CpRoadmapCategory" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CpRoadmapCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CpRoadmapSubCategory" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CpRoadmapSubCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CpRoadmapTopic" (
    "id" TEXT NOT NULL,
    "subCategoryId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "difficulty" INTEGER,
    "importance" INTEGER,
    "phase" INTEGER,
    "prerequisites" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CpRoadmapTopic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CpRoadmapResource" (
    "id" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "sourcePlatform" TEXT NOT NULL DEFAULT 'other',
    "isStarred" BOOLEAN NOT NULL DEFAULT false,
    "comments" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CpRoadmapResource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CpRoadmapTemplate" (
    "id" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CpRoadmapTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CpRoadmapProblem" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "sourcePlatform" TEXT NOT NULL DEFAULT 'other',
    "difficulty" INTEGER NOT NULL DEFAULT 0,
    "isStarred" BOOLEAN NOT NULL DEFAULT false,
    "solveCount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CpRoadmapProblem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CpRoadmapTopicProblem" (
    "id" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CpRoadmapTopicProblem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CpRoadmapProblemSuggestion" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "notes" TEXT,
    "difficulty" INTEGER,
    "status" "CpRoadmapSuggestionStatus" NOT NULL DEFAULT 'pending',
    "reviewerId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdProblemId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CpRoadmapProblemSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CpRoadmapCategory_slug_key" ON "CpRoadmapCategory"("slug");

-- CreateIndex
CREATE INDEX "CpRoadmapSubCategory_categoryId_idx" ON "CpRoadmapSubCategory"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "CpRoadmapSubCategory_categoryId_slug_key" ON "CpRoadmapSubCategory"("categoryId", "slug");

-- CreateIndex
CREATE INDEX "CpRoadmapTopic_subCategoryId_idx" ON "CpRoadmapTopic"("subCategoryId");

-- CreateIndex
CREATE UNIQUE INDEX "CpRoadmapTopic_subCategoryId_slug_key" ON "CpRoadmapTopic"("subCategoryId", "slug");

-- CreateIndex
CREATE INDEX "CpRoadmapResource_topicId_idx" ON "CpRoadmapResource"("topicId");

-- CreateIndex
CREATE INDEX "CpRoadmapTemplate_topicId_idx" ON "CpRoadmapTemplate"("topicId");

-- CreateIndex
CREATE UNIQUE INDEX "CpRoadmapProblem_slug_key" ON "CpRoadmapProblem"("slug");

-- CreateIndex
CREATE INDEX "CpRoadmapTopicProblem_topicId_idx" ON "CpRoadmapTopicProblem"("topicId");

-- CreateIndex
CREATE INDEX "CpRoadmapTopicProblem_problemId_idx" ON "CpRoadmapTopicProblem"("problemId");

-- CreateIndex
CREATE UNIQUE INDEX "CpRoadmapTopicProblem_topicId_problemId_key" ON "CpRoadmapTopicProblem"("topicId", "problemId");

-- CreateIndex
CREATE INDEX "CpRoadmapProblemSuggestion_userId_idx" ON "CpRoadmapProblemSuggestion"("userId");

-- CreateIndex
CREATE INDEX "CpRoadmapProblemSuggestion_topicId_idx" ON "CpRoadmapProblemSuggestion"("topicId");

-- CreateIndex
CREATE INDEX "CpRoadmapProblemSuggestion_status_idx" ON "CpRoadmapProblemSuggestion"("status");

-- CreateIndex
CREATE INDEX "CpRoadmapProblemProgress_roadmapProblemId_idx" ON "CpRoadmapProblemProgress"("roadmapProblemId");

-- AddForeignKey
ALTER TABLE "CpRoadmapSubCategory" ADD CONSTRAINT "CpRoadmapSubCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "CpRoadmapCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CpRoadmapTopic" ADD CONSTRAINT "CpRoadmapTopic_subCategoryId_fkey" FOREIGN KEY ("subCategoryId") REFERENCES "CpRoadmapSubCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CpRoadmapResource" ADD CONSTRAINT "CpRoadmapResource_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "CpRoadmapTopic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CpRoadmapTemplate" ADD CONSTRAINT "CpRoadmapTemplate_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "CpRoadmapTopic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CpRoadmapTopicProblem" ADD CONSTRAINT "CpRoadmapTopicProblem_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "CpRoadmapTopic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CpRoadmapTopicProblem" ADD CONSTRAINT "CpRoadmapTopicProblem_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "CpRoadmapProblem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CpRoadmapProblemSuggestion" ADD CONSTRAINT "CpRoadmapProblemSuggestion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CpRoadmapProblemSuggestion" ADD CONSTRAINT "CpRoadmapProblemSuggestion_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "CpRoadmapTopic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CpRoadmapProblemSuggestion" ADD CONSTRAINT "CpRoadmapProblemSuggestion_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CpRoadmapProblemSuggestion" ADD CONSTRAINT "CpRoadmapProblemSuggestion_createdProblemId_fkey" FOREIGN KEY ("createdProblemId") REFERENCES "CpRoadmapProblem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey (NOT VALID until seed:cp-roadmap populates problems)
ALTER TABLE "CpRoadmapProblemProgress" ADD CONSTRAINT "CpRoadmapProblemProgress_roadmapProblemId_fkey" FOREIGN KEY ("roadmapProblemId") REFERENCES "CpRoadmapProblem"("slug") ON DELETE CASCADE ON UPDATE CASCADE NOT VALID;
