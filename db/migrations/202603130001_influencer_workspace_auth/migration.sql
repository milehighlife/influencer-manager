ALTER TYPE "user_role" ADD VALUE IF NOT EXISTS 'influencer';

ALTER TABLE "users"
ADD COLUMN "influencer_id" UUID;

CREATE UNIQUE INDEX "users_organization_id_influencer_id_key"
ON "users"("organization_id", "influencer_id");

ALTER TABLE "users"
ADD CONSTRAINT "users_organization_id_influencer_id_fkey"
FOREIGN KEY ("organization_id", "influencer_id")
REFERENCES "influencers"("organization_id", "id")
ON DELETE RESTRICT
ON UPDATE CASCADE;
