-- Add new statuses to assignment_status enum
ALTER TYPE "assignment_status" ADD VALUE IF NOT EXISTS 'invited';
ALTER TYPE "assignment_status" ADD VALUE IF NOT EXISTS 'revision';
ALTER TYPE "assignment_status" ADD VALUE IF NOT EXISTS 'declined';

-- Add new fields to action_assignments
ALTER TABLE "action_assignments"
  ADD COLUMN "invited_at" TIMESTAMPTZ(6),
  ADD COLUMN "accepted_at" TIMESTAMPTZ(6),
  ADD COLUMN "submitted_at" TIMESTAMPTZ(6),
  ADD COLUMN "completed_at" TIMESTAMPTZ(6),
  ADD COLUMN "revision_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "revision_reason" TEXT;

-- Change default status for new assignments
ALTER TABLE "action_assignments" ALTER COLUMN "assignment_status" SET DEFAULT 'invited';
