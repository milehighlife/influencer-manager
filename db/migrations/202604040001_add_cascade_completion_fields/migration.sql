-- AlterEnum: Add completed_by_cascade to assignment_status
ALTER TYPE "assignment_status" ADD VALUE IF NOT EXISTS 'completed_by_cascade';

-- AlterTable: Add auto_completed fields to missions
ALTER TABLE "missions"
  ADD COLUMN "auto_completed" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "auto_completed_at" TIMESTAMPTZ(6);

-- AlterTable: Add auto_completed fields to actions
ALTER TABLE "actions"
  ADD COLUMN "auto_completed" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "auto_completed_at" TIMESTAMPTZ(6);

-- AlterTable: Add cascade_reason to action_assignments
ALTER TABLE "action_assignments"
  ADD COLUMN "cascade_reason" TEXT;

-- AlterTable: Add version for optimistic locking on campaigns
ALTER TABLE "campaigns"
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
