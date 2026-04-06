ALTER TABLE "deliverables"
  ADD COLUMN "reviewed_by_user_id" UUID,
  ADD COLUMN "reviewed_at" TIMESTAMPTZ(6);

ALTER TABLE "deliverables" ADD CONSTRAINT "deliverables_reviewed_by_user_id_fkey" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
