DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'import_log_status') THEN
    CREATE TYPE "import_log_status" AS ENUM (
      'queued',
      'running',
      'completed',
      'failed'
    );
  END IF;
END
$$;

CREATE TABLE "import_logs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "post_id" UUID NOT NULL,
  "platform" "social_platform" NOT NULL,
  "status" "import_log_status" NOT NULL DEFAULT 'queued',
  "requested_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completed_at" TIMESTAMPTZ(6),
  "error_message" TEXT,
  "raw_metadata_json" JSONB,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "import_logs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "import_logs_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "import_logs_organization_id_post_id_fkey"
    FOREIGN KEY ("organization_id", "post_id") REFERENCES "posts"("organization_id", "id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "import_logs_organization_id_id_key"
ON "import_logs"("organization_id", "id");

CREATE INDEX "import_logs_organization_id_idx"
ON "import_logs"("organization_id");

CREATE INDEX "import_logs_organization_id_post_id_idx"
ON "import_logs"("organization_id", "post_id");

CREATE INDEX "import_logs_organization_id_platform_status_idx"
ON "import_logs"("organization_id", "platform", "status");
