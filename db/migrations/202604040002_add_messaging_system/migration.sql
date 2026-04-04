-- CreateEnum
CREATE TYPE "message_template_category" AS ENUM ('outreach', 'assignment_notification', 'reminder', 'follow_up', 'completion', 'custom');
CREATE TYPE "conversation_entity_type" AS ENUM ('campaign', 'mission', 'action', 'assignment');
CREATE TYPE "message_sender_type" AS ENUM ('user', 'influencer', 'system');
CREATE TYPE "notification_type" AS ENUM ('new_message', 'assignment_update', 'reminder', 'system');
CREATE TYPE "notification_recipient_type" AS ENUM ('user', 'influencer');

-- CreateTable: message_templates
CREATE TABLE "message_templates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "category" "message_template_category" NOT NULL DEFAULT 'custom',
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_by_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "message_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable: conversations
CREATE TABLE "conversations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "subject" TEXT NOT NULL,
    "related_entity_type" "conversation_entity_type",
    "related_entity_id" UUID,
    "created_by_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable: conversation_participants
CREATE TABLE "conversation_participants" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "conversation_id" UUID NOT NULL,
    "user_id" UUID,
    "influencer_id" UUID,
    "joined_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_read_at" TIMESTAMPTZ(6),
    CONSTRAINT "conversation_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable: messages
CREATE TABLE "messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "conversation_id" UUID NOT NULL,
    "sender_id" UUID,
    "sender_type" "message_sender_type" NOT NULL,
    "body" TEXT NOT NULL,
    "template_id" UUID,
    "sent_via_email" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable: message_attachments
CREATE TABLE "message_attachments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "message_id" UUID NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_type" TEXT,
    "file_size_bytes" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "message_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable: notifications
CREATE TABLE "notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "recipient_id" UUID NOT NULL,
    "recipient_type" "notification_recipient_type" NOT NULL,
    "type" "notification_type" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "related_entity_type" TEXT,
    "related_entity_id" UUID,
    "read_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable: automated_message_logs
CREATE TABLE "automated_message_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "assignment_id" UUID NOT NULL,
    "template_type" TEXT NOT NULL,
    "sent_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "automated_message_logs_pkey" PRIMARY KEY ("id")
);

-- Indexes: message_templates
CREATE UNIQUE INDEX "message_templates_organization_id_id_key" ON "message_templates"("organization_id", "id");
CREATE INDEX "message_templates_organization_id_idx" ON "message_templates"("organization_id");
CREATE INDEX "message_templates_organization_id_category_idx" ON "message_templates"("organization_id", "category");

-- Indexes: conversations
CREATE UNIQUE INDEX "conversations_organization_id_id_key" ON "conversations"("organization_id", "id");
CREATE INDEX "conversations_organization_id_idx" ON "conversations"("organization_id");
CREATE INDEX "conversations_organization_id_related_entity_type_related_en_idx" ON "conversations"("organization_id", "related_entity_type", "related_entity_id");

-- Indexes: conversation_participants
CREATE UNIQUE INDEX "conversation_participants_conversation_id_user_id_key" ON "conversation_participants"("conversation_id", "user_id");
CREATE UNIQUE INDEX "conversation_participants_conversation_id_influencer_id_key" ON "conversation_participants"("conversation_id", "influencer_id");
CREATE INDEX "conversation_participants_conversation_id_idx" ON "conversation_participants"("conversation_id");
CREATE INDEX "conversation_participants_user_id_idx" ON "conversation_participants"("user_id");
CREATE INDEX "conversation_participants_influencer_id_idx" ON "conversation_participants"("influencer_id");

-- Indexes: messages
CREATE INDEX "messages_conversation_id_idx" ON "messages"("conversation_id");
CREATE INDEX "messages_conversation_id_created_at_idx" ON "messages"("conversation_id", "created_at");
CREATE INDEX "messages_sender_id_idx" ON "messages"("sender_id");

-- Indexes: message_attachments
CREATE INDEX "message_attachments_message_id_idx" ON "message_attachments"("message_id");

-- Indexes: notifications
CREATE INDEX "notifications_organization_id_idx" ON "notifications"("organization_id");
CREATE INDEX "notifications_organization_id_recipient_id_recipient_type_idx" ON "notifications"("organization_id", "recipient_id", "recipient_type");
CREATE INDEX "notifications_organization_id_recipient_id_read_at_idx" ON "notifications"("organization_id", "recipient_id", "read_at");

-- Indexes: automated_message_logs
CREATE UNIQUE INDEX "automated_message_logs_assignment_id_template_type_key" ON "automated_message_logs"("assignment_id", "template_type");
CREATE INDEX "automated_message_logs_organization_id_idx" ON "automated_message_logs"("organization_id");
CREATE INDEX "automated_message_logs_assignment_id_idx" ON "automated_message_logs"("assignment_id");

-- Foreign keys: message_templates
ALTER TABLE "message_templates" ADD CONSTRAINT "message_templates_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "message_templates" ADD CONSTRAINT "message_templates_organization_id_created_by_id_fkey" FOREIGN KEY ("organization_id", "created_by_id") REFERENCES "users"("organization_id", "id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Foreign keys: conversations
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_organization_id_created_by_id_fkey" FOREIGN KEY ("organization_id", "created_by_id") REFERENCES "users"("organization_id", "id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Foreign keys: conversation_participants
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_influencer_id_fkey" FOREIGN KEY ("influencer_id") REFERENCES "influencers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Foreign keys: messages
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "messages" ADD CONSTRAINT "messages_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "message_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Foreign keys: message_attachments
ALTER TABLE "message_attachments" ADD CONSTRAINT "message_attachments_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Foreign keys: notifications
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
