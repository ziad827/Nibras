-- CreateTable
CREATE TABLE "UserGamificationMetrics" (
    "userId" TEXT NOT NULL,
    "githubLinked" BOOLEAN NOT NULL DEFAULT false,
    "githubAppInstalled" BOOLEAN NOT NULL DEFAULT false,
    "courseEnrollments" INTEGER NOT NULL DEFAULT 0,
    "passedSubmissions" INTEGER NOT NULL DEFAULT 0,
    "totalSubmissions" INTEGER NOT NULL DEFAULT 0,
    "failedSubmissions" INTEGER NOT NULL DEFAULT 0,
    "teamMemberships" INTEGER NOT NULL DEFAULT 0,
    "questions" INTEGER NOT NULL DEFAULT 0,
    "answers" INTEGER NOT NULL DEFAULT 0,
    "acceptedAnswers" INTEGER NOT NULL DEFAULT 0,
    "questionUpvotesReceived" INTEGER NOT NULL DEFAULT 0,
    "communityVotes" INTEGER NOT NULL DEFAULT 0,
    "threads" INTEGER NOT NULL DEFAULT 0,
    "threadPosts" INTEGER NOT NULL DEFAULT 0,
    "solvedProblems" INTEGER NOT NULL DEFAULT 0,
    "problemBookmarks" INTEGER NOT NULL DEFAULT 0,
    "contestParticipations" INTEGER NOT NULL DEFAULT 0,
    "contestBookmarks" INTEGER NOT NULL DEFAULT 0,
    "assignmentSubmissions" INTEGER NOT NULL DEFAULT 0,
    "videosWatched" INTEGER NOT NULL DEFAULT 0,
    "earnedBadges" INTEGER NOT NULL DEFAULT 0,
    "dailyStreakCurrent" INTEGER NOT NULL DEFAULT 0,
    "dailyStreakLongest" INTEGER NOT NULL DEFAULT 0,
    "dailyProblemsCompleted" INTEGER NOT NULL DEFAULT 0,
    "codeforcesMaxRating" INTEGER NOT NULL DEFAULT 0,
    "leetcodeMaxRating" INTEGER NOT NULL DEFAULT 0,
    "plansSubmittedForAdvisor" INTEGER NOT NULL DEFAULT 0,
    "programSheetsGenerated" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserGamificationMetrics_pkey" PRIMARY KEY ("userId")
);

-- AddForeignKey
ALTER TABLE "UserGamificationMetrics" ADD CONSTRAINT "UserGamificationMetrics_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
