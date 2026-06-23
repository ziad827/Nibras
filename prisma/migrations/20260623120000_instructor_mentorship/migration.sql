-- Instructor applications and mentorship tables

CREATE TYPE "InstructorApplicationStatus" AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE "MentorProfileStatus" AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE "MentorshipRequestStatus" AS ENUM ('pending', 'accepted', 'declined', 'cancelled');

CREATE TABLE "InstructorApplication" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "status" "InstructorApplicationStatus" NOT NULL DEFAULT 'pending',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstructorApplication_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InstructorApplication_userId_key" ON "InstructorApplication"("userId");
CREATE INDEX "InstructorApplication_status_idx" ON "InstructorApplication"("status");

ALTER TABLE "InstructorApplication" ADD CONSTRAINT "InstructorApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InstructorApplication" ADD CONSTRAINT "InstructorApplication_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "MentorProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bio" TEXT,
    "expertise" TEXT[],
    "availability" TEXT,
    "status" "MentorProfileStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MentorProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MentorProfile_userId_key" ON "MentorProfile"("userId");
CREATE INDEX "MentorProfile_status_idx" ON "MentorProfile"("status");

ALTER TABLE "MentorProfile" ADD CONSTRAINT "MentorProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "MentorshipRequest" (
    "id" TEXT NOT NULL,
    "menteeId" TEXT NOT NULL,
    "mentorId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "MentorshipRequestStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MentorshipRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MentorshipRequest_menteeId_mentorId_key" ON "MentorshipRequest"("menteeId", "mentorId");
CREATE INDEX "MentorshipRequest_menteeId_idx" ON "MentorshipRequest"("menteeId");
CREATE INDEX "MentorshipRequest_mentorId_idx" ON "MentorshipRequest"("mentorId");

ALTER TABLE "MentorshipRequest" ADD CONSTRAINT "MentorshipRequest_menteeId_fkey" FOREIGN KEY ("menteeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MentorshipRequest" ADD CONSTRAINT "MentorshipRequest_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
