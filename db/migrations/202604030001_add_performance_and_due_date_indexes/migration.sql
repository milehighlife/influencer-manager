-- CreateIndex
CREATE INDEX CONCURRENTLY IF NOT EXISTS "action_assignments_organization_id_due_date_idx"
  ON "action_assignments"("organization_id", "due_date");

-- CreateIndex
CREATE INDEX CONCURRENTLY IF NOT EXISTS "action_performance_summaries_action_id_idx"
  ON "action_performance_summaries"("action_id");

-- CreateIndex
CREATE INDEX CONCURRENTLY IF NOT EXISTS "mission_performance_summaries_mission_id_idx"
  ON "mission_performance_summaries"("mission_id");

-- CreateIndex
CREATE INDEX CONCURRENTLY IF NOT EXISTS "campaign_performance_summaries_campaign_id_idx"
  ON "campaign_performance_summaries"("campaign_id");

-- CreateIndex
CREATE INDEX CONCURRENTLY IF NOT EXISTS "influencer_performance_summaries_influencer_id_idx"
  ON "influencer_performance_summaries"("influencer_id");
