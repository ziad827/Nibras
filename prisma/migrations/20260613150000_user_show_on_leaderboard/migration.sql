-- Add leaderboard visibility preference to User
ALTER TABLE "User" ADD COLUMN "showOnLeaderboard" BOOLEAN NOT NULL DEFAULT true;
