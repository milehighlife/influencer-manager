-- CreateEnum
CREATE TYPE "conversation_participant_status" AS ENUM ('active', 'archived', 'snoozed');
CREATE TYPE "notification_preference" AS ENUM ('all_messages', 'replies_only', 'none');

-- AlterTable: users — add notification preference
ALTER TABLE "users"
  ADD COLUMN "notification_preference" "notification_preference" NOT NULL DEFAULT 'replies_only';

-- AlterTable: conversations — add outreach batch tracking
ALTER TABLE "conversations"
  ADD COLUMN "outreach_batch_id" UUID,
  ADD COLUMN "outreach_template_name" TEXT;

-- AlterTable: conversation_participants — add status and snooze
ALTER TABLE "conversation_participants"
  ADD COLUMN "status" "conversation_participant_status" NOT NULL DEFAULT 'active',
  ADD COLUMN "snoozed_until" TIMESTAMPTZ(6);

-- Index for batch grouping
CREATE INDEX "conversations_organization_id_outreach_batch_id_idx" ON "conversations"("organization_id", "outreach_batch_id");
