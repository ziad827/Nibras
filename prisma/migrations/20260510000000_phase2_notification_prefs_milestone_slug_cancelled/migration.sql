-- Phase 2 migration: notification preferences, milestone slug, and cancelled submission status

-- 1. Add `cancelled` to the SubmissionStatus enum
--    PostgreSQL requires ADD VALUE outside of transactions.
ALTER TYPE "SubmissionStatus" ADD VALUE IF NOT EXISTS 'cancelled';

-- 2. Add optional slug column to Milestone and a unique index
ALTER TABLE "Milestone" ADD COLUMN IF NOT EXISTS "slug" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Milestone_projectId_slug_key"
  ON "Milestone"("projectId", "slug")
  WHERE "slug" IS NOT NULL;

-- 3. Create the NotificationPreference table
CREATE TABLE IF NOT EXISTS "NotificationPreference" (
  "id"        TEXT         NOT NULL,
  "userId"    TEXT         NOT NULL,
  "type"      TEXT         NOT NULL,
  "enabled"   BOOLEAN      NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "NotificationPreference_userId_type_key"
  ON "NotificationPreference"("userId", "type");

CREATE INDEX IF NOT EXISTS "NotificationPreference_userId_idx"
  ON "NotificationPreference"("userId");

ALTER TABLE "NotificationPreference"
  ADD CONSTRAINT "NotificationPreference_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
