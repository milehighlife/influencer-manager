import type { OrganizationRole } from "./auth";

export const CAMPAIGN_STATUSES = [
  "draft",
  "planned",
  "active",
  "paused",
  "completed",
  "archived",
] as const;

export const MISSION_STATUSES = ["planned", "active", "completed"] as const;

export const ACTION_STATUSES = [
  "draft",
  "scheduled",
  "active",
  "awaiting_submission",
  "under_review",
  "completed",
] as const;

export const ASSIGNMENT_STATUSES = [
  "assigned",
  "accepted",
  "in_progress",
  "submitted",
  "approved",
  "rejected",
  "completed",
  "completed_by_cascade",
] as const;

export const CREATOR_ASSIGNMENT_SORT_FIELDS = [
  "due_date",
  "updated_at",
] as const;

export const DELIVERABLE_STATUSES = [
  "pending",
  "submitted",
  "approved",
  "rejected",
] as const;

export const DELIVERABLE_TYPES = [
  "draft_content",
  "final_asset",
  "caption_copy",
  "story_frame",
  "post_link",
  "other",
] as const;

export const SOCIAL_PLATFORMS = [
  "instagram",
  "tiktok",
  "youtube",
  "facebook",
  "x",
  "linkedin",
  "threads",
  "other",
] as const;

export const POST_MEDIA_TYPES = [
  "image",
  "video",
  "carousel",
  "story",
  "short_video",
  "live_stream",
  "text",
  "other",
] as const;

export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];
export type MissionStatus = (typeof MISSION_STATUSES)[number];
export type ActionStatus = (typeof ACTION_STATUSES)[number];
export type AssignmentStatus = (typeof ASSIGNMENT_STATUSES)[number];
export type CreatorAssignmentSortField =
  (typeof CREATOR_ASSIGNMENT_SORT_FIELDS)[number];
export type DeliverableStatus = (typeof DELIVERABLE_STATUSES)[number];
export type DeliverableType = (typeof DELIVERABLE_TYPES)[number];
export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];
export type PostMediaType = (typeof POST_MEDIA_TYPES)[number];

export const CAMPAIGN_PLANNER_SORT_FIELDS = [
  "updated_at",
  "created_at",
  "start_date",
  "end_date",
  "name",
  "status",
  "client_name",
  "company_name",
] as const;

export const INFLUENCER_SORT_FIELDS = [
  "name",
  "created_at",
  "primary_platform",
  "status",
  "rating_average",
  "client",
  "company",
] as const;

export const SORT_DIRECTIONS = ["asc", "desc"] as const;
export const CAMPAIGN_PLANNER_SCHEDULE_STATES = [
  "scheduled",
  "partial",
  "unscheduled",
] as const;

export type CampaignPlannerSortField =
  (typeof CAMPAIGN_PLANNER_SORT_FIELDS)[number];
export type InfluencerSortField = (typeof INFLUENCER_SORT_FIELDS)[number];
export type SortDirection = (typeof SORT_DIRECTIONS)[number];
export type CampaignPlannerScheduleState =
  (typeof CAMPAIGN_PLANNER_SCHEDULE_STATES)[number];

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  organizationId: string;
  influencerId?: string | null;
  role: OrganizationRole;
  status: "active" | "invited" | "suspended";
}

export interface LoginResponse {
  access_token: string;
  user: AuthenticatedUser;
}

export interface Company {
  id: string;
  organization_id?: string;
  client_id: string;
  client_name?: string | null;
  name: string;
  description: string | null;
  contact_first_name: string | null;
  contact_last_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  priority_instagram: number;
  priority_tiktok: number;
  priority_youtube: number;
  priority_facebook: number;
  priority_x: number;
  priority_linkedin: number;
  priority_threads: number;
  priority_regions: Record<string, string>;
  priorities_updated_at: string | null;
  priorities_updated_by: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  organization_id?: string;
  name: string;
  industry: string | null;
  primary_contact_first_name: string | null;
  primary_contact_name: string | null;
  primary_contact_email: string | null;
  primary_contact_phone: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Campaign {
  id: string;
  organization_id?: string;
  company_id: string;
  name: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  budget: number | null;
  status: CampaignStatus;
  campaign_type: string | null;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface CampaignPlannerListItem extends Pick<
  Campaign,
  | "id"
  | "company_id"
  | "name"
  | "start_date"
  | "end_date"
  | "status"
  | "created_at"
  | "updated_at"
> {
  company: {
    id: string;
    name: string;
    client_id: string;
    client_name: string | null;
  };
  mission_count: number;
  scheduled_mission_count: number;
  partial_mission_count: number;
  unscheduled_mission_count: number;
}

export interface Mission {
  id: string;
  organization_id?: string;
  campaign_id: string;
  name: string;
  description: string | null;
  sequence_order: number;
  start_date: string | null;
  end_date: string | null;
  status: MissionStatus;
  auto_completed: boolean;
  auto_completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Action {
  id: string;
  organization_id?: string;
  mission_id: string;
  platform: SocialPlatform;
  title: string;
  instructions: string | null;
  content_format: string | null;
  required_deliverables: number;
  approval_required: boolean;
  start_window: string | null;
  end_window: string | null;
  required_platforms: string[];
  status: ActionStatus;
  auto_completed: boolean;
  auto_completed_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Returns active platform slugs by inspecting which URL fields are populated.
 */
export function getInfluencerPlatforms(influencer: {
  url_instagram?: string | null;
  url_tiktok?: string | null;
  url_youtube?: string | null;
  url_facebook?: string | null;
  url_linkedin?: string | null;
  url_x?: string | null;
  url_threads?: string | null;
}): string[] {
  const map: [string, string | null | undefined][] = [
    ["instagram", influencer.url_instagram],
    ["tiktok", influencer.url_tiktok],
    ["youtube", influencer.url_youtube],
    ["facebook", influencer.url_facebook],
    ["linkedin", influencer.url_linkedin],
    ["x", influencer.url_x],
    ["threads", influencer.url_threads],
  ];
  return map.filter(([, url]) => url != null && url !== "").map(([slug]) => slug);
}

/**
 * Returns actions eligible for an influencer based on their active platforms.
 * - If action.required_platforms is empty → eligible (universal action)
 * - If action.required_platforms contains ANY of the influencer's active platforms → eligible
 * - Otherwise → not eligible
 */
export function getEligibleActions<T extends { required_platforms?: string[] }>(
  influencerPlatforms: string[],
  actions: T[],
): { eligible: T[]; ineligible: T[] } {
  const eligible: T[] = [];
  const ineligible: T[] = [];

  for (const action of actions) {
    const required = action.required_platforms ?? [];
    if (required.length === 0 || required.some((p) => influencerPlatforms.includes(p))) {
      eligible.push(action);
    } else {
      ineligible.push(action);
    }
  }

  return { eligible, ineligible };
}

export interface Influencer {
  id: string;
  organization_id?: string;
  name: string;
  handle: string | null;
  primary_platform: SocialPlatform;
  email: string | null;
  location: string | null;
  mailing_address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  phone: string | null;
  url_instagram: string | null;
  url_tiktok: string | null;
  url_facebook: string | null;
  url_youtube: string | null;
  url_linkedin: string | null;
  url_x: string | null;
  url_threads: string | null;
  audience_description: string | null;
  niche_tags: string[];
  clients?: string[];
  companies?: string[];
  rating_average?: number | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface ActionAssignment {
  id: string;
  organization_id?: string;
  action_id: string;
  influencer_id: string;
  assignment_status: AssignmentStatus;
  cascade_reason: string | null;
  assigned_at: string | null;
  due_date: string | null;
  completion_date: string | null;
  submission_url: string | null;
  published_at: string | null;
  total_views: number;
  total_comments: number;
  total_shares: number;
  metrics_updated_at: string | null;
  deliverable_count_expected: number;
  deliverable_count_submitted: number;
  created_at: string;
  updated_at: string;
}

export interface Deliverable {
  id: string;
  organization_id?: string;
  action_assignment_id: string;
  deliverable_type: DeliverableType;
  description: string | null;
  status: DeliverableStatus;
  submission_url: string | null;
  rejection_reason: string | null;
  submitted_by_user_id?: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PostRecord {
  id: string;
  organization_id?: string;
  deliverable_id: string;
  platform: SocialPlatform;
  external_post_id: string | null;
  post_url: string;
  caption: string | null;
  media_type: string;
  posted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PerformanceSnapshotRecord {
  id: string;
  organization_id?: string;
  post_id: string;
  captured_at: string;
  impressions: number;
  reach: number;
  views: number;
  video_views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  clicks: number;
  conversions: number;
  created_at?: string;
  updated_at?: string;
}

export interface LinkedPostRecord extends PostRecord {
  deliverable?: Pick<
    Deliverable,
    "id" | "deliverable_type" | "status"
  >;
  performance_snapshots: PerformanceSnapshotRecord[];
}

export interface SummaryMetrics {
  total_impressions: number;
  total_engagement: number;
  engagement_rate: number;
  total_posts: number;
  total_influencers: number;
  last_snapshot_at: string | null;
}

export interface ReportSummaryResponse extends SummaryMetrics {
  scope: {
    type: "post" | "action" | "mission" | "campaign" | "influencer";
    id: string;
  };
  platform?: SocialPlatform;
  filters_applied: Partial<{
    date_from: string;
    date_to: string;
    platform: SocialPlatform;
    campaign_id: string;
    influencer_id: string;
  }>;
}

export interface PlanningViewInfluencerSummary {
  id: string;
  name: string;
  email: string | null;
  primary_platform: SocialPlatform;
  location: string | null;
  status: string;
}

export interface PlanningViewAssignment extends ActionAssignment {
  influencer_summary: PlanningViewInfluencerSummary;
}

export interface PlanningViewAction extends Action {
  assignments: PlanningViewAssignment[];
}

export interface PlanningViewMission extends Mission {
  actions: PlanningViewAction[];
}

export interface CampaignPlanningView extends Campaign {
  company: Pick<
    Company,
    "id" | "client_id" | "name" | "description" | "status" | "created_at" | "updated_at"
  >;
  missions: PlanningViewMission[];
}

export interface MissionActionListItem extends Action {
  _count: {
    action_assignments: number;
  };
}

export interface MissionActionsResponse {
  data: MissionActionListItem[];
}

export interface ActionAssignmentsResponse {
  action: Action & {
    mission: Pick<
      Mission,
      "id" | "campaign_id" | "name" | "sequence_order" | "status"
    >;
  };
  assignments: Array<
    ActionAssignment & {
      influencer: PlanningViewInfluencerSummary;
    }
  >;
}

export interface InfluencerAssignmentsResponse {
  influencer: Influencer;
  campaign_action_counts?: Record<string, number>;
  assignments: Array<
    ActionAssignment & {
      action: Pick<
        Action,
        "id" | "mission_id" | "title" | "platform" | "content_format" | "status"
      > & {
        mission: Pick<
          Mission,
          "id" | "campaign_id" | "name" | "sequence_order" | "status"
        > & {
          campaign: Pick<
            Campaign,
            "id" | "company_id" | "name" | "campaign_type" | "status"
          > & {
            company: Pick<Company, "id" | "client_id" | "name" | "status"> & {
              client: Pick<Client, "id" | "name"> | null;
            };
          };
        };
      };
    }
  >;
}

export interface ApiErrorResponse {
  statusCode?: number;
  message?: string | string[];
  error?: string;
}

export interface SubmitAssignmentDeliverableInput {
  deliverable_type: DeliverableType;
  description?: string;
  submission_url?: string;
  submission_metadata_json?: Record<string, unknown>;
}

export interface SubmitAssignmentPayload {
  deliverables: SubmitAssignmentDeliverableInput[];
}

export interface SubmitAssignmentResponse {
  assignment: ActionAssignment;
  deliverables: Deliverable[];
}

export interface RejectDeliverablePayload {
  reason: string;
}

export interface DeliverableReviewResponse {
  deliverable: Deliverable;
  assignment: ActionAssignment;
}

export interface CreateDeliverablePostPayload {
  platform: SocialPlatform;
  external_post_id?: string;
  post_url: string;
  caption?: string;
  media_type: PostMediaType;
  posted_at?: string;
}

export interface CreateDeliverablePostResponse {
  post: LinkedPostRecord;
  assignment: ActionAssignment | null;
}

export interface AssignmentPostsResponse {
  assignment: {
    id: string;
    action_id: string;
    action: Pick<Action, "id" | "title" | "mission_id" | "status">;
  };
  posts: LinkedPostRecord[];
}

export interface InfluencerWorkspaceAssignment extends ActionAssignment {
  action: Pick<
    Action,
    | "id"
    | "mission_id"
    | "platform"
    | "title"
    | "instructions"
    | "content_format"
    | "required_deliverables"
    | "approval_required"
    | "start_window"
    | "end_window"
    | "status"
    | "created_at"
    | "updated_at"
  > & {
    mission: Pick<
      Mission,
      | "id"
      | "campaign_id"
      | "name"
      | "description"
      | "sequence_order"
      | "start_date"
      | "end_date"
      | "status"
      | "created_at"
      | "updated_at"
    > & {
      campaign: Pick<
        Campaign,
        | "id"
        | "company_id"
        | "name"
        | "description"
        | "start_date"
        | "end_date"
        | "budget"
        | "status"
        | "campaign_type"
        | "created_at"
        | "updated_at"
      > & {
        company: Pick<Company, "id" | "client_id" | "name" | "status">;
      };
    };
  };
}

export interface InfluencerWorkspaceAssignmentSummary {
  total_assignments: number;
  status_counts: Record<AssignmentStatus, number>;
}

export interface InfluencerWorkspaceAssignmentListResponse
  extends PaginatedResponse<InfluencerWorkspaceAssignment> {
  summary: InfluencerWorkspaceAssignmentSummary;
}

export type InfluencerStatusDigestItemType =
  | "assignment_awaiting_acceptance"
  | "submission_in_review"
  | "assignment_approved"
  | "assignment_revision_required"
  | "assignment_completed"
  | "post_linked"
  | "post_metrics_available";

export type InfluencerStatusDigestDestination =
  | {
      type: "assignment";
      assignment_id: string;
      assignment_title: string;
    }
  | {
      type: "post";
      post_id: string;
      post_url: string;
    };

export interface InfluencerStatusDigestItem {
  id: string;
  type: InfluencerStatusDigestItemType;
  title: string;
  description: string;
  updated_at: string;
  badge_status: string;
  badge_label: string;
  attention: boolean;
  destination: InfluencerStatusDigestDestination;
}

export interface InfluencerStatusDigestResponse {
  items: InfluencerStatusDigestItem[];
  limit: number;
  attention_count: number;
}

export interface InfluencerWorkspaceDeliverable extends Deliverable {
  posts: LinkedPostRecord[];
}

export interface InfluencerWorkspaceAssignmentDetailResponse {
  assignment: InfluencerWorkspaceAssignment;
  deliverables: InfluencerWorkspaceDeliverable[];
  posts: LinkedPostRecord[];
}

export interface InfluencerWorkspacePost extends LinkedPostRecord {
  deliverable: Pick<Deliverable, "id" | "deliverable_type" | "status"> & {
    action_assignment_id: string;
  };
}

export interface InfluencerWorkspacePostSummary {
  total_posts: number;
  tracked_posts: number;
  pending_sync_posts: number;
  latest_snapshot_at: string | null;
}

export interface InfluencerWorkspacePostListResponse
  extends PaginatedResponse<InfluencerWorkspacePost> {
  summary: InfluencerWorkspacePostSummary;
}

export interface InfluencerWorkspacePostPerformanceResponse {
  post: LinkedPostRecord & {
    deliverable: Pick<Deliverable, "id" | "deliverable_type" | "status"> & {
      action_assignment: InfluencerWorkspaceAssignment;
    };
  };
  latest_snapshot: PerformanceSnapshotRecord | null;
  summary: ReportSummaryResponse;
}

export interface InfluencerLinkPostResponse
  extends CreateDeliverablePostResponse {
  metric_sync_enqueued: boolean;
}

export interface CampaignCascadePreview {
  missions_to_complete: number;
  actions_to_complete: number;
  assignments_to_close: number;
  influencers_to_notify: number;
  actions_with_media_in_progress: number;
  actions_without_media: number;
}

// ---------------------------------------------------------------------------
// Messaging & Outreach
// ---------------------------------------------------------------------------

export const MESSAGE_TEMPLATE_CATEGORIES = [
  "outreach",
  "assignment_notification",
  "reminder",
  "follow_up",
  "completion",
  "custom",
] as const;

export const CONVERSATION_ENTITY_TYPES = [
  "campaign",
  "mission",
  "action",
  "assignment",
] as const;

export const MESSAGE_SENDER_TYPES = ["user", "influencer", "system"] as const;

export const NOTIFICATION_TYPES = [
  "new_message",
  "assignment_update",
  "reminder",
  "system",
] as const;

export type MessageTemplateCategory =
  (typeof MESSAGE_TEMPLATE_CATEGORIES)[number];
export type ConversationEntityType =
  (typeof CONVERSATION_ENTITY_TYPES)[number];
export type MessageSenderType = (typeof MESSAGE_SENDER_TYPES)[number];
export type NotificationTypeValue = (typeof NOTIFICATION_TYPES)[number];

export interface MessageTemplate {
  id: string;
  organization_id?: string;
  name: string;
  subject: string;
  body: string;
  category: MessageTemplateCategory;
  is_default: boolean;
  created_by_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConversationListItem {
  id: string;
  subject: string;
  related_entity_type: ConversationEntityType | null;
  related_entity_id: string | null;
  created_at: string;
  updated_at: string;
  last_message: {
    body: string;
    sender_type: MessageSenderType;
    sender_name: string | null;
    created_at: string;
  } | null;
  unread: boolean;
  participant_count: number;
}

export interface ConversationDetail {
  id: string;
  subject: string;
  related_entity_type: ConversationEntityType | null;
  related_entity_id: string | null;
  created_at: string;
  updated_at: string;
  participants: ConversationParticipantInfo[];
}

export interface ConversationParticipantInfo {
  id: string;
  user_id: string | null;
  influencer_id: string | null;
  name: string;
  type: "user" | "influencer";
  joined_at: string;
  last_read_at: string | null;
}

export interface MessageRecord {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  sender_type: MessageSenderType;
  sender_name: string | null;
  body: string;
  template_id: string | null;
  sent_via_email: boolean;
  created_at: string;
  attachments: MessageAttachmentRecord[];
}

export interface MessageAttachmentRecord {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string | null;
  file_size_bytes: number | null;
}

export interface NotificationRecord {
  id: string;
  type: NotificationTypeValue;
  title: string;
  body: string;
  related_entity_type: string | null;
  related_entity_id: string | null;
  read_at: string | null;
  created_at: string;
}

export interface NotificationCountResponse {
  unread: number;
}

export interface BulkOutreachPayload {
  template_id: string;
  influencer_ids: string[];
  related_entity_type?: ConversationEntityType;
  related_entity_id?: string;
  send_email?: boolean;
}

export interface BulkOutreachResult {
  job_id: string;
  total_recipients: number;
}

/** Available merge variables for message templates. */
export const TEMPLATE_MERGE_VARIABLES = [
  "influencer_first_name",
  "influencer_name",
  "campaign_name",
  "action_title",
  "company_name",
  "due_date",
] as const;
