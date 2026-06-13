ALTER TABLE "DailyProblemConfig"
ADD COLUMN "reminderEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "reminderMinutesBefore" INTEGER NOT NULL DEFAULT 120,
ADD COLUMN "lastReminderDate" TEXT;
