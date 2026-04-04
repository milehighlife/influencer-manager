-- CreateEnum
CREATE TYPE "asset_source_type" AS ENUM ('upload', 'external_link');
CREATE TYPE "asset_category" AS ENUM ('logo', 'brand_guidelines', 'product_photo', 'video_broll', 'copy_caption', 'hashtag_list', 'mood_board', 'template', 'font', 'color_palette', 'other');

-- CreateTable: campaign_assets
CREATE TABLE "campaign_assets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "campaign_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "source_type" "asset_source_type" NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_name" TEXT,
    "file_size_bytes" INTEGER,
    "mime_type" TEXT,
    "thumbnail_url" TEXT,
    "category" "asset_category" NOT NULL DEFAULT 'other',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "uploaded_by_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "campaign_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable: campaign_asset_actions
CREATE TABLE "campaign_asset_actions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "campaign_asset_id" UUID NOT NULL,
    "action_id" UUID NOT NULL,
    CONSTRAINT "campaign_asset_actions_pkey" PRIMARY KEY ("id")
);

-- Indexes: campaign_assets
CREATE INDEX "campaign_assets_organization_id_idx" ON "campaign_assets"("organization_id");
CREATE INDEX "campaign_assets_organization_id_campaign_id_idx" ON "campaign_assets"("organization_id", "campaign_id");
CREATE INDEX "campaign_assets_client_id_created_at_idx" ON "campaign_assets"("client_id", "created_at" DESC);
CREATE INDEX "campaign_assets_organization_id_company_id_idx" ON "campaign_assets"("organization_id", "company_id");
CREATE INDEX "campaign_assets_organization_id_category_idx" ON "campaign_assets"("organization_id", "category");

-- Indexes: campaign_asset_actions
CREATE UNIQUE INDEX "campaign_asset_actions_campaign_asset_id_action_id_key" ON "campaign_asset_actions"("campaign_asset_id", "action_id");
CREATE INDEX "campaign_asset_actions_campaign_asset_id_idx" ON "campaign_asset_actions"("campaign_asset_id");
CREATE INDEX "campaign_asset_actions_action_id_idx" ON "campaign_asset_actions"("action_id");

-- Foreign keys: campaign_assets
ALTER TABLE "campaign_assets" ADD CONSTRAINT "campaign_assets_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "campaign_assets" ADD CONSTRAINT "campaign_assets_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "campaign_assets" ADD CONSTRAINT "campaign_assets_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "campaign_assets" ADD CONSTRAINT "campaign_assets_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "campaign_assets" ADD CONSTRAINT "campaign_assets_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Foreign keys: campaign_asset_actions
ALTER TABLE "campaign_asset_actions" ADD CONSTRAINT "campaign_asset_actions_campaign_asset_id_fkey" FOREIGN KEY ("campaign_asset_id") REFERENCES "campaign_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "campaign_asset_actions" ADD CONSTRAINT "campaign_asset_actions_action_id_fkey" FOREIGN KEY ("action_id") REFERENCES "actions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
