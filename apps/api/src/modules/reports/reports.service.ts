import { Injectable } from "@nestjs/common";
import type { SocialPlatform } from "@prisma/client";

import { SummaryFiltersDto } from "./dto/summary-filters.dto";
import { AnalyticsAggregationService } from "./analytics-aggregation.service";
import type { ReportSummaryResponse } from "./reports.types";

@Injectable()
export class ReportsService {
  constructor(
    private readonly analyticsAggregationService: AnalyticsAggregationService,
  ) {}

  async getPostSummary(
    organizationId: string,
    postId: string,
    filters: SummaryFiltersDto,
  ): Promise<ReportSummaryResponse> {
    const hasFilters = this.hasFilters(filters);
    const summary = hasFilters
      ? await this.analyticsAggregationService.computePostSummary(
          organizationId,
          postId,
          filters,
        )
      : await this.analyticsAggregationService.getStoredPostSummary(
          organizationId,
          postId,
        );

    return {
      scope: {
        type: "post",
        id: postId,
      },
      ...this.toReportPayload(summary),
      filters_applied: this.buildAppliedFilters(filters),
    };
  }

  async getActionSummary(
    organizationId: string,
    actionId: string,
    filters: SummaryFiltersDto,
  ): Promise<ReportSummaryResponse> {
    const hasFilters = this.hasFilters(filters);
    const summary = hasFilters
      ? await this.analyticsAggregationService.computeActionSummary(
          organizationId,
          actionId,
          filters,
        )
      : await this.analyticsAggregationService.getStoredActionSummary(
          organizationId,
          actionId,
        );

    return {
      scope: {
        type: "action",
        id: actionId,
      },
      ...this.toReportPayload(summary),
      filters_applied: this.buildAppliedFilters(filters),
    };
  }

  async getMissionSummary(
    organizationId: string,
    missionId: string,
    filters: SummaryFiltersDto,
  ): Promise<ReportSummaryResponse> {
    const hasFilters = this.hasFilters(filters);
    const summary = hasFilters
      ? await this.analyticsAggregationService.computeMissionSummary(
          organizationId,
          missionId,
          filters,
        )
      : await this.analyticsAggregationService.getStoredMissionSummary(
          organizationId,
          missionId,
        );

    return {
      scope: {
        type: "mission",
        id: missionId,
      },
      ...this.toReportPayload(summary),
      filters_applied: this.buildAppliedFilters(filters),
    };
  }

  async getCampaignSummary(
    organizationId: string,
    campaignId: string,
    filters: SummaryFiltersDto,
  ): Promise<ReportSummaryResponse> {
    const hasFilters = this.hasFilters(filters);
    const summary = hasFilters
      ? await this.analyticsAggregationService.computeCampaignSummary(
          organizationId,
          campaignId,
          filters,
        )
      : await this.analyticsAggregationService.getStoredCampaignSummary(
          organizationId,
          campaignId,
        );

    return {
      scope: {
        type: "campaign",
        id: campaignId,
      },
      ...this.toReportPayload(summary),
      filters_applied: this.buildAppliedFilters(filters),
    };
  }

  async getInfluencerSummary(
    organizationId: string,
    influencerId: string,
    filters: SummaryFiltersDto,
  ): Promise<ReportSummaryResponse> {
    const hasFilters = this.hasFilters(filters);
    const summary = hasFilters
      ? await this.analyticsAggregationService.computeInfluencerSummary(
          organizationId,
          influencerId,
          filters,
        )
      : await this.analyticsAggregationService.getStoredInfluencerSummary(
          organizationId,
          influencerId,
        );

    return {
      scope: {
        type: "influencer",
        id: influencerId,
      },
      ...this.toReportPayload(summary),
      filters_applied: this.buildAppliedFilters(filters),
    };
  }

  async refreshCampaignSummary(organizationId: string, campaignId: string) {
    await this.analyticsAggregationService.refreshCampaignHierarchy(
      organizationId,
      campaignId,
    );

    return this.getCampaignSummary(organizationId, campaignId, {});
  }

  private buildAppliedFilters(filters: SummaryFiltersDto) {
    return {
      ...(filters.date_from ? { date_from: filters.date_from } : {}),
      ...(filters.date_to ? { date_to: filters.date_to } : {}),
      ...(filters.platform ? { platform: filters.platform } : {}),
      ...(filters.campaign_id ? { campaign_id: filters.campaign_id } : {}),
      ...(filters.influencer_id ? { influencer_id: filters.influencer_id } : {}),
    };
  }

  private hasFilters(filters: SummaryFiltersDto) {
    return Boolean(
      filters.date_from ||
        filters.date_to ||
        filters.platform ||
        filters.campaign_id ||
        filters.influencer_id,
    );
  }

  private toReportPayload(summary: {
    total_impressions: number;
    total_engagement: number;
    engagement_rate: number;
    total_posts: number;
    total_influencers: number;
    last_snapshot_at: Date | null;
    platform?: SocialPlatform | null;
  }) {
    return {
      total_impressions: summary.total_impressions,
      total_engagement: summary.total_engagement,
      engagement_rate: summary.engagement_rate,
      total_posts: summary.total_posts,
      total_influencers: summary.total_influencers,
      last_snapshot_at: summary.last_snapshot_at,
      ...(summary.platform ? { platform: summary.platform } : {}),
    };
  }
}
