CREATE TABLE "post_performance_summaries" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "post_id" UUID NOT NULL,
  "platform" "social_platform" NOT NULL,
  "total_impressions" INTEGER NOT NULL DEFAULT 0,
  "total_engagement" INTEGER NOT NULL DEFAULT 0,
  "engagement_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "total_posts" INTEGER NOT NULL DEFAULT 1,
  "total_influencers" INTEGER NOT NULL DEFAULT 1,
  "last_snapshot_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "post_performance_summaries_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "post_performance_summaries_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "post_performance_summaries_organization_id_post_id_key"
ON "post_performance_summaries"("organization_id", "post_id");

CREATE INDEX "post_performance_summaries_organization_id_idx"
ON "post_performance_summaries"("organization_id");

CREATE INDEX "post_performance_summaries_organization_id_platform_idx"
ON "post_performance_summaries"("organization_id", "platform");

CREATE TABLE "action_performance_summaries" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "action_id" UUID NOT NULL,
  "total_impressions" INTEGER NOT NULL DEFAULT 0,
  "total_engagement" INTEGER NOT NULL DEFAULT 0,
  "engagement_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "total_posts" INTEGER NOT NULL DEFAULT 0,
  "total_influencers" INTEGER NOT NULL DEFAULT 0,
  "last_snapshot_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "action_performance_summaries_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "action_performance_summaries_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "action_performance_summaries_organization_id_action_id_key"
ON "action_performance_summaries"("organization_id", "action_id");

CREATE INDEX "action_performance_summaries_organization_id_idx"
ON "action_performance_summaries"("organization_id");

CREATE TABLE "mission_performance_summaries" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "mission_id" UUID NOT NULL,
  "total_impressions" INTEGER NOT NULL DEFAULT 0,
  "total_engagement" INTEGER NOT NULL DEFAULT 0,
  "engagement_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "total_posts" INTEGER NOT NULL DEFAULT 0,
  "total_influencers" INTEGER NOT NULL DEFAULT 0,
  "last_snapshot_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "mission_performance_summaries_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "mission_performance_summaries_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "mission_performance_summaries_organization_id_mission_id_key"
ON "mission_performance_summaries"("organization_id", "mission_id");

CREATE INDEX "mission_performance_summaries_organization_id_idx"
ON "mission_performance_summaries"("organization_id");

CREATE TABLE "campaign_performance_summaries" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "campaign_id" UUID NOT NULL,
  "total_impressions" INTEGER NOT NULL DEFAULT 0,
  "total_engagement" INTEGER NOT NULL DEFAULT 0,
  "engagement_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "total_posts" INTEGER NOT NULL DEFAULT 0,
  "total_influencers" INTEGER NOT NULL DEFAULT 0,
  "last_snapshot_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "campaign_performance_summaries_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "campaign_performance_summaries_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "campaign_performance_summaries_organization_id_campaign_id_key"
ON "campaign_performance_summaries"("organization_id", "campaign_id");

CREATE INDEX "campaign_performance_summaries_organization_id_idx"
ON "campaign_performance_summaries"("organization_id");

CREATE TABLE "influencer_performance_summaries" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "influencer_id" UUID NOT NULL,
  "total_impressions" INTEGER NOT NULL DEFAULT 0,
  "total_engagement" INTEGER NOT NULL DEFAULT 0,
  "engagement_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "total_posts" INTEGER NOT NULL DEFAULT 0,
  "total_influencers" INTEGER NOT NULL DEFAULT 1,
  "last_snapshot_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "influencer_performance_summaries_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "influencer_performance_summaries_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "influencer_performance_summaries_organization_id_influencer_id_key"
ON "influencer_performance_summaries"("organization_id", "influencer_id");

CREATE INDEX "influencer_performance_summaries_organization_id_idx"
ON "influencer_performance_summaries"("organization_id");
