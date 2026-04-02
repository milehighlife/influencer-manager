import type { SocialPlatform } from "@prisma/client";

export interface SummaryMetrics {
  total_impressions: number;
  total_engagement: number;
  engagement_rate: number;
  total_posts: number;
  total_influencers: number;
  last_snapshot_at: Date | null;
}

export interface ReportSummaryResponse extends SummaryMetrics {
  scope: {
    type: "post" | "action" | "mission" | "campaign" | "influencer";
    id: string;
  };
  platform?: SocialPlatform | null;
  filters_applied?: {
    date_from?: string;
    date_to?: string;
    platform?: SocialPlatform;
    campaign_id?: string;
    influencer_id?: string;
  };
}
