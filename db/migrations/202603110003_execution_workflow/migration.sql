ALTER TABLE "deliverables"
ADD COLUMN "submission_url" TEXT,
ADD COLUMN "submission_metadata_json" JSONB,
ADD COLUMN "rejection_reason" TEXT,
ADD COLUMN "submitted_by_user_id" UUID;

CREATE INDEX "deliverables_organization_id_submitted_by_user_id_idx"
ON "deliverables"("organization_id", "submitted_by_user_id");

ALTER TABLE "deliverables"
ADD CONSTRAINT "deliverables_organization_id_submitted_by_user_id_fkey"
FOREIGN KEY ("organization_id", "submitted_by_user_id")
REFERENCES "users"("organization_id", "id")
ON DELETE RESTRICT
ON UPDATE CASCADE;
