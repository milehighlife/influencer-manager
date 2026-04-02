BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TYPE organization_status AS ENUM ('active', 'inactive');
CREATE TYPE user_role AS ENUM ('organization_admin', 'campaign_manager', 'campaign_editor', 'analyst', 'viewer');
CREATE TYPE user_status AS ENUM ('invited', 'active', 'suspended');
CREATE TYPE client_status AS ENUM ('active', 'inactive', 'archived');
CREATE TYPE company_status AS ENUM ('active', 'inactive', 'archived');
CREATE TYPE campaign_status AS ENUM ('draft', 'planned', 'active', 'paused', 'completed', 'archived');
CREATE TYPE mission_status AS ENUM ('planned', 'active', 'completed');
CREATE TYPE action_status AS ENUM ('draft', 'scheduled', 'active', 'awaiting_submission', 'under_review', 'completed');
CREATE TYPE social_platform AS ENUM ('instagram', 'tiktok', 'youtube', 'x', 'linkedin', 'threads', 'other');
CREATE TYPE content_format AS ENUM ('in_feed_post', 'carousel', 'reel', 'story_set', 'short_video', 'long_form_video', 'live_stream', 'other');
CREATE TYPE influencer_status AS ENUM ('active', 'inactive', 'archived');
CREATE TYPE assignment_status AS ENUM ('assigned', 'accepted', 'in_progress', 'submitted', 'approved', 'rejected', 'completed');
CREATE TYPE deliverable_status AS ENUM ('pending', 'submitted', 'approved', 'rejected');
CREATE TYPE deliverable_type AS ENUM ('draft_content', 'final_asset', 'caption_copy', 'story_frame', 'post_link', 'other');
CREATE TYPE post_media_type AS ENUM ('image', 'video', 'carousel', 'story', 'short_video', 'live_stream', 'text', 'other');
CREATE TYPE audit_changed_by_type AS ENUM ('user', 'influencer', 'system');

CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  status organization_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  role user_role NOT NULL,
  status user_status NOT NULL DEFAULT 'invited',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT users_organization_id_fkey
    FOREIGN KEY (organization_id) REFERENCES organizations (id) ON DELETE CASCADE,
  CONSTRAINT users_organization_id_id_key UNIQUE (organization_id, id),
  CONSTRAINT users_organization_id_email_key UNIQUE (organization_id, email)
);

CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  name TEXT NOT NULL,
  industry TEXT,
  primary_contact_name TEXT,
  primary_contact_email TEXT,
  status client_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT clients_organization_id_fkey
    FOREIGN KEY (organization_id) REFERENCES organizations (id) ON DELETE CASCADE,
  CONSTRAINT clients_organization_id_id_key UNIQUE (organization_id, id)
);

CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  client_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status company_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT companies_organization_id_fkey
    FOREIGN KEY (organization_id) REFERENCES organizations (id) ON DELETE CASCADE,
  CONSTRAINT companies_organization_client_id_fkey
    FOREIGN KEY (organization_id, client_id) REFERENCES clients (organization_id, id) ON DELETE CASCADE,
  CONSTRAINT companies_organization_id_id_key UNIQUE (organization_id, id)
);

CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  company_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  campaign_type TEXT NOT NULL,
  status campaign_status NOT NULL DEFAULT 'draft',
  start_date DATE,
  end_date DATE,
  budget NUMERIC(12, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT campaigns_organization_id_fkey
    FOREIGN KEY (organization_id) REFERENCES organizations (id) ON DELETE CASCADE,
  CONSTRAINT campaigns_organization_company_id_fkey
    FOREIGN KEY (organization_id, company_id) REFERENCES companies (organization_id, id) ON DELETE CASCADE,
  CONSTRAINT campaigns_organization_id_id_key UNIQUE (organization_id, id),
  CONSTRAINT campaigns_budget_nonnegative_check CHECK (budget IS NULL OR budget >= 0),
  CONSTRAINT campaigns_date_order_check CHECK (start_date IS NULL OR end_date IS NULL OR start_date <= end_date)
);

CREATE TABLE missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  campaign_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  sequence_order INTEGER NOT NULL,
  status mission_status NOT NULL DEFAULT 'planned',
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT missions_organization_id_fkey
    FOREIGN KEY (organization_id) REFERENCES organizations (id) ON DELETE CASCADE,
  CONSTRAINT missions_organization_campaign_id_fkey
    FOREIGN KEY (organization_id, campaign_id) REFERENCES campaigns (organization_id, id) ON DELETE CASCADE,
  CONSTRAINT missions_organization_id_id_key UNIQUE (organization_id, id),
  CONSTRAINT missions_campaign_sequence_key UNIQUE (campaign_id, sequence_order),
  CONSTRAINT missions_sequence_order_positive_check CHECK (sequence_order > 0),
  CONSTRAINT missions_date_order_check CHECK (start_date IS NULL OR end_date IS NULL OR start_date <= end_date)
);

CREATE TABLE actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  mission_id UUID NOT NULL,
  title TEXT NOT NULL,
  platform social_platform NOT NULL,
  instructions TEXT,
  content_format content_format NOT NULL,
  required_deliverables INTEGER NOT NULL DEFAULT 1,
  approval_required BOOLEAN NOT NULL DEFAULT TRUE,
  start_window TIMESTAMPTZ,
  end_window TIMESTAMPTZ,
  status action_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT actions_organization_id_fkey
    FOREIGN KEY (organization_id) REFERENCES organizations (id) ON DELETE CASCADE,
  CONSTRAINT actions_organization_mission_id_fkey
    FOREIGN KEY (organization_id, mission_id) REFERENCES missions (organization_id, id) ON DELETE CASCADE,
  CONSTRAINT actions_organization_id_id_key UNIQUE (organization_id, id),
  CONSTRAINT actions_required_deliverables_positive_check CHECK (required_deliverables > 0),
  CONSTRAINT actions_window_order_check CHECK (start_window IS NULL OR end_window IS NULL OR start_window <= end_window)
);

CREATE TABLE influencers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  primary_platform social_platform NOT NULL,
  location TEXT,
  audience_description TEXT,
  status influencer_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT influencers_organization_id_fkey
    FOREIGN KEY (organization_id) REFERENCES organizations (id) ON DELETE CASCADE,
  CONSTRAINT influencers_organization_id_id_key UNIQUE (organization_id, id)
);

CREATE TABLE action_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  action_id UUID NOT NULL,
  influencer_id UUID NOT NULL,
  assignment_status assignment_status NOT NULL DEFAULT 'assigned',
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  due_date TIMESTAMPTZ,
  completion_date TIMESTAMPTZ,
  deliverable_count_expected INTEGER NOT NULL DEFAULT 1,
  deliverable_count_submitted INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT action_assignments_organization_id_fkey
    FOREIGN KEY (organization_id) REFERENCES organizations (id) ON DELETE CASCADE,
  CONSTRAINT action_assignments_organization_action_id_fkey
    FOREIGN KEY (organization_id, action_id) REFERENCES actions (organization_id, id) ON DELETE CASCADE,
  CONSTRAINT action_assignments_organization_influencer_id_fkey
    FOREIGN KEY (organization_id, influencer_id) REFERENCES influencers (organization_id, id) ON DELETE CASCADE,
  CONSTRAINT action_assignments_organization_id_id_key UNIQUE (organization_id, id),
  CONSTRAINT action_assignments_action_influencer_key UNIQUE (action_id, influencer_id),
  CONSTRAINT action_assignments_deliverable_count_expected_positive_check CHECK (deliverable_count_expected > 0),
  CONSTRAINT action_assignments_deliverable_count_submitted_nonnegative_check CHECK (deliverable_count_submitted >= 0),
  CONSTRAINT action_assignments_completion_after_assignment_check CHECK (completion_date IS NULL OR completion_date >= assigned_at)
);

CREATE TABLE deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  action_assignment_id UUID NOT NULL,
  deliverable_type deliverable_type NOT NULL,
  description TEXT,
  status deliverable_status NOT NULL DEFAULT 'pending',
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT deliverables_organization_id_fkey
    FOREIGN KEY (organization_id) REFERENCES organizations (id) ON DELETE CASCADE,
  CONSTRAINT deliverables_organization_action_assignment_id_fkey
    FOREIGN KEY (organization_id, action_assignment_id) REFERENCES action_assignments (organization_id, id) ON DELETE CASCADE,
  CONSTRAINT deliverables_organization_id_id_key UNIQUE (organization_id, id),
  CONSTRAINT deliverables_submission_timestamps_check CHECK (approved_at IS NULL OR submitted_at IS NULL OR approved_at >= submitted_at)
);

CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  deliverable_id UUID NOT NULL,
  platform social_platform NOT NULL,
  external_post_id TEXT,
  post_url TEXT NOT NULL,
  caption TEXT,
  media_type post_media_type NOT NULL,
  posted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT posts_organization_id_fkey
    FOREIGN KEY (organization_id) REFERENCES organizations (id) ON DELETE CASCADE,
  CONSTRAINT posts_organization_deliverable_id_fkey
    FOREIGN KEY (organization_id, deliverable_id) REFERENCES deliverables (organization_id, id) ON DELETE CASCADE,
  CONSTRAINT posts_organization_id_id_key UNIQUE (organization_id, id)
);

CREATE TABLE performance_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  post_id UUID NOT NULL,
  captured_at TIMESTAMPTZ NOT NULL,
  impressions INTEGER NOT NULL DEFAULT 0,
  reach INTEGER NOT NULL DEFAULT 0,
  views INTEGER NOT NULL DEFAULT 0,
  video_views INTEGER NOT NULL DEFAULT 0,
  likes INTEGER NOT NULL DEFAULT 0,
  comments INTEGER NOT NULL DEFAULT 0,
  shares INTEGER NOT NULL DEFAULT 0,
  saves INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  conversions INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT performance_snapshots_organization_id_fkey
    FOREIGN KEY (organization_id) REFERENCES organizations (id) ON DELETE CASCADE,
  CONSTRAINT performance_snapshots_organization_post_id_fkey
    FOREIGN KEY (organization_id, post_id) REFERENCES posts (organization_id, id) ON DELETE CASCADE,
  CONSTRAINT performance_snapshots_organization_id_id_key UNIQUE (organization_id, id),
  CONSTRAINT performance_snapshots_post_capture_key UNIQUE (post_id, captured_at),
  CONSTRAINT performance_snapshots_metric_nonnegative_check CHECK (
    impressions >= 0
    AND reach >= 0
    AND views >= 0
    AND video_views >= 0
    AND likes >= 0
    AND comments >= 0
    AND shares >= 0
    AND saves >= 0
    AND clicks >= 0
    AND conversions >= 0
  )
);

CREATE TABLE influencer_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  influencer_id UUID NOT NULL,
  campaign_id UUID NOT NULL,
  rater_user_id UUID NOT NULL,
  content_quality_score SMALLINT NOT NULL,
  reliability_score SMALLINT NOT NULL,
  audience_fit_score SMALLINT NOT NULL,
  communication_score SMALLINT NOT NULL,
  brand_safety_score SMALLINT NOT NULL,
  overall_score NUMERIC(3, 2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT influencer_ratings_organization_id_fkey
    FOREIGN KEY (organization_id) REFERENCES organizations (id) ON DELETE CASCADE,
  CONSTRAINT influencer_ratings_organization_influencer_id_fkey
    FOREIGN KEY (organization_id, influencer_id) REFERENCES influencers (organization_id, id) ON DELETE CASCADE,
  CONSTRAINT influencer_ratings_organization_campaign_id_fkey
    FOREIGN KEY (organization_id, campaign_id) REFERENCES campaigns (organization_id, id) ON DELETE CASCADE,
  CONSTRAINT influencer_ratings_organization_rater_user_id_fkey
    FOREIGN KEY (organization_id, rater_user_id) REFERENCES users (organization_id, id) ON DELETE RESTRICT,
  CONSTRAINT influencer_ratings_organization_id_id_key UNIQUE (organization_id, id),
  CONSTRAINT influencer_ratings_campaign_influencer_rater_key UNIQUE (campaign_id, influencer_id, rater_user_id),
  CONSTRAINT influencer_ratings_scores_range_check CHECK (
    content_quality_score BETWEEN 1 AND 5
    AND reliability_score BETWEEN 1 AND 5
    AND audience_fit_score BETWEEN 1 AND 5
    AND communication_score BETWEEN 1 AND 5
    AND brand_safety_score BETWEEN 1 AND 5
    AND overall_score BETWEEN 1 AND 5
  )
);

CREATE TABLE influencer_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  influencer_id UUID NOT NULL,
  author_user_id UUID NOT NULL,
  note_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT influencer_notes_organization_id_fkey
    FOREIGN KEY (organization_id) REFERENCES organizations (id) ON DELETE CASCADE,
  CONSTRAINT influencer_notes_organization_influencer_id_fkey
    FOREIGN KEY (organization_id, influencer_id) REFERENCES influencers (organization_id, id) ON DELETE CASCADE,
  CONSTRAINT influencer_notes_organization_author_user_id_fkey
    FOREIGN KEY (organization_id, author_user_id) REFERENCES users (organization_id, id) ON DELETE RESTRICT,
  CONSTRAINT influencer_notes_organization_id_id_key UNIQUE (organization_id, id)
);

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  parent_entity_type TEXT,
  parent_entity_id UUID,
  event_type TEXT NOT NULL,
  previous_value JSONB,
  new_value JSONB,
  changed_by_type audit_changed_by_type NOT NULL,
  changed_by_id UUID,
  reason TEXT,
  metadata_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT audit_logs_organization_id_fkey
    FOREIGN KEY (organization_id) REFERENCES organizations (id) ON DELETE CASCADE,
  CONSTRAINT audit_logs_organization_id_id_key UNIQUE (organization_id, id)
);

CREATE INDEX users_organization_id_idx
  ON users (organization_id);
CREATE INDEX clients_organization_id_idx
  ON clients (organization_id);
CREATE INDEX clients_organization_name_idx
  ON clients (organization_id, name);
CREATE INDEX companies_organization_id_idx
  ON companies (organization_id);
CREATE INDEX companies_organization_client_id_idx
  ON companies (organization_id, client_id);
CREATE INDEX campaigns_organization_id_idx
  ON campaigns (organization_id);
CREATE INDEX campaigns_organization_company_id_idx
  ON campaigns (organization_id, company_id);
CREATE INDEX campaigns_organization_status_idx
  ON campaigns (organization_id, status);
CREATE INDEX missions_organization_id_idx
  ON missions (organization_id);
CREATE INDEX missions_organization_campaign_id_idx
  ON missions (organization_id, campaign_id);
CREATE INDEX actions_organization_id_idx
  ON actions (organization_id);
CREATE INDEX actions_organization_mission_id_idx
  ON actions (organization_id, mission_id);
CREATE INDEX actions_organization_status_idx
  ON actions (organization_id, status);
CREATE INDEX influencers_organization_id_idx
  ON influencers (organization_id);
CREATE INDEX influencers_organization_primary_platform_idx
  ON influencers (organization_id, primary_platform);
CREATE INDEX action_assignments_organization_id_idx
  ON action_assignments (organization_id);
CREATE INDEX action_assignments_organization_action_id_idx
  ON action_assignments (organization_id, action_id);
CREATE INDEX action_assignments_organization_influencer_id_idx
  ON action_assignments (organization_id, influencer_id);
CREATE INDEX action_assignments_organization_status_idx
  ON action_assignments (organization_id, assignment_status);
CREATE INDEX deliverables_organization_id_idx
  ON deliverables (organization_id);
CREATE INDEX deliverables_organization_action_assignment_id_idx
  ON deliverables (organization_id, action_assignment_id);
CREATE INDEX deliverables_organization_status_idx
  ON deliverables (organization_id, status);
CREATE INDEX posts_organization_id_idx
  ON posts (organization_id);
CREATE INDEX posts_organization_deliverable_id_idx
  ON posts (organization_id, deliverable_id);
CREATE INDEX posts_organization_platform_idx
  ON posts (organization_id, platform);
CREATE INDEX performance_snapshots_organization_id_idx
  ON performance_snapshots (organization_id);
CREATE INDEX performance_snapshots_post_id_captured_at_idx
  ON performance_snapshots (post_id, captured_at);
CREATE INDEX performance_snapshots_organization_post_id_captured_at_idx
  ON performance_snapshots (organization_id, post_id, captured_at);
CREATE INDEX influencer_ratings_organization_id_idx
  ON influencer_ratings (organization_id);
CREATE INDEX influencer_ratings_organization_campaign_id_idx
  ON influencer_ratings (organization_id, campaign_id);
CREATE INDEX influencer_ratings_organization_influencer_id_idx
  ON influencer_ratings (organization_id, influencer_id);
CREATE INDEX influencer_notes_organization_id_idx
  ON influencer_notes (organization_id);
CREATE INDEX influencer_notes_organization_influencer_id_idx
  ON influencer_notes (organization_id, influencer_id);
CREATE INDEX audit_logs_organization_id_idx
  ON audit_logs (organization_id);
CREATE INDEX audit_logs_organization_entity_lookup_idx
  ON audit_logs (organization_id, entity_type, entity_id);
CREATE INDEX audit_logs_organization_parent_lookup_idx
  ON audit_logs (organization_id, parent_entity_type, parent_entity_id);

CREATE TRIGGER organizations_set_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER users_set_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER clients_set_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER companies_set_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER campaigns_set_updated_at BEFORE UPDATE ON campaigns FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER missions_set_updated_at BEFORE UPDATE ON missions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER actions_set_updated_at BEFORE UPDATE ON actions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER influencers_set_updated_at BEFORE UPDATE ON influencers FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER action_assignments_set_updated_at BEFORE UPDATE ON action_assignments FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER deliverables_set_updated_at BEFORE UPDATE ON deliverables FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER posts_set_updated_at BEFORE UPDATE ON posts FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER performance_snapshots_set_updated_at BEFORE UPDATE ON performance_snapshots FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER influencer_ratings_set_updated_at BEFORE UPDATE ON influencer_ratings FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER influencer_notes_set_updated_at BEFORE UPDATE ON influencer_notes FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER audit_logs_set_updated_at BEFORE UPDATE ON audit_logs FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
