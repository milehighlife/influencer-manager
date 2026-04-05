-- Data migration: map existing statuses to new lifecycle
-- Must be in a separate migration from the ALTER TYPE so new enum values are committed

-- assigned → accepted (directly assigned = effectively accepted)
UPDATE "action_assignments" SET "accepted_at" = "assigned_at" WHERE "assignment_status" = 'assigned';
UPDATE "action_assignments" SET "assignment_status" = 'accepted' WHERE "assignment_status" = 'assigned';

-- submitted: set submitted_at
UPDATE "action_assignments" SET "submitted_at" = "updated_at" WHERE "assignment_status" = 'submitted' AND "submitted_at" IS NULL;

-- approved → completed
UPDATE "action_assignments" SET "completed_at" = "completion_date", "assignment_status" = 'completed' WHERE "assignment_status" = 'approved';

-- rejected → revision
UPDATE "action_assignments" SET "revision_count" = 1, "assignment_status" = 'revision' WHERE "assignment_status" = 'rejected';

-- completed: set completed_at
UPDATE "action_assignments" SET "completed_at" = "completion_date" WHERE "assignment_status" = 'completed' AND "completed_at" IS NULL AND "completion_date" IS NOT NULL;

-- Set invited_at for all existing records
UPDATE "action_assignments" SET "invited_at" = "assigned_at" WHERE "invited_at" IS NULL;
