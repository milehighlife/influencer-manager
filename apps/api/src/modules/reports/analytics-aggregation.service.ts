import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, SocialPlatform } from "@prisma/client";

import { PrismaService } from "../../database/prisma.service";
import { SummaryFiltersDto } from "./dto/summary-filters.dto";
import type { SummaryMetrics } from "./reports.types";

interface ScopeFilters {
  postId?: string;
  actionId?: string;
  missionId?: string;
  campaignId?: string;
  influencerId?: string;
  platform?: SocialPlatform;
  dateFrom?: string;
  dateTo?: string;
}

interface AnalyticsMetricRow {
  postId: string;
  platform: SocialPlatform;
  influencerId: string;
  actionId: string;
  missionId: string;
  campaignId: string;
  capturedAt: Date | null;
  impressions: number;
  engagement: number;
}

interface PostSummaryScope {
  postId: string;
  actionId: string;
  missionId: string;
  campaignId: string;
  influencerId: string;
}

@Injectable()
export class AnalyticsAggregationService {
  constructor(private readonly prisma: PrismaService) {}

  async refreshForPost(organizationId: string, postId: string) {
    const scope = await this.getPostScope(organizationId, postId);
    await this.refreshScope(organizationId, scope, true);
  }

  async refreshCampaignHierarchy(organizationId: string, campaignId: string) {
    await this.assertCampaignExists(organizationId, campaignId);

    const [missionIds, actionIds, postIds, influencerIds] = await Promise.all([
      this.prisma.mission.findMany({
        where: {
          organization_id: organizationId,
          campaign_id: campaignId,
        },
        select: { id: true },
      }),
      this.prisma.action.findMany({
        where: {
          organization_id: organizationId,
          mission: {
            campaign_id: campaignId,
          },
        },
        select: { id: true },
      }),
      this.prisma.post.findMany({
        where: {
          organization_id: organizationId,
          deliverable: {
            action_assignment: {
              action: {
                mission: {
                  campaign_id: campaignId,
                },
              },
            },
          },
        },
        select: { id: true },
      }),
      this.prisma.actionAssignment.findMany({
        where: {
          organization_id: organizationId,
          action: {
            mission: {
              campaign_id: campaignId,
            },
          },
        },
        select: { influencer_id: true },
        distinct: ["influencer_id"],
      }),
    ]);

    await this.refreshCampaignSummary(organizationId, campaignId);

    for (const mission of missionIds) {
      await this.refreshMissionSummary(organizationId, mission.id);
    }

    for (const action of actionIds) {
      await this.refreshActionSummary(organizationId, action.id);
    }

    for (const post of postIds) {
      await this.refreshPostSummary(organizationId, post.id);
    }

    for (const influencer of influencerIds) {
      await this.refreshInfluencerSummary(organizationId, influencer.influencer_id);
    }
  }

  async refreshPostSummary(organizationId: string, postId: string) {
    const post = await this.prisma.post.findFirst({
      where: {
        id: postId,
        organization_id: organizationId,
      },
      select: {
        id: true,
        platform: true,
      },
    });

    if (!post) {
      throw new NotFoundException("Post not found.");
    }

    const rows = await this.loadMetricRows(organizationId, { postId });
    const summary = this.aggregateRows(rows, post.platform);

    return this.prisma.postPerformanceSummary.upsert({
      where: {
        organization_id_post_id: {
          organization_id: organizationId,
          post_id: postId,
        },
      },
      create: {
        organization_id: organizationId,
        post_id: postId,
        platform: post.platform,
        ...summary,
      },
      update: {
        platform: post.platform,
        ...summary,
      },
    });
  }

  async getPostScope(organizationId: string, postId: string): Promise<PostSummaryScope> {
    const post = await this.prisma.post.findFirst({
      where: {
        id: postId,
        organization_id: organizationId,
      },
      select: {
        id: true,
        deliverable: {
          select: {
            action_assignment: {
              select: {
                influencer_id: true,
                action_id: true,
                action: {
                  select: {
                    mission_id: true,
                    mission: {
                      select: {
                        campaign_id: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!post) {
      throw new NotFoundException("Post not found for analytics refresh.");
    }

    return {
      postId: post.id,
      actionId: post.deliverable.action_assignment.action_id,
      missionId: post.deliverable.action_assignment.action.mission_id,
      campaignId: post.deliverable.action_assignment.action.mission.campaign_id,
      influencerId: post.deliverable.action_assignment.influencer_id,
    };
  }

  async refreshScope(
    organizationId: string,
    scope: PostSummaryScope,
    includePostSummary = false,
  ) {
    if (includePostSummary) {
      await this.refreshPostSummary(organizationId, scope.postId);
    }

    await this.refreshActionSummary(organizationId, scope.actionId);
    await this.refreshMissionSummary(organizationId, scope.missionId);
    await this.refreshCampaignSummary(organizationId, scope.campaignId);
    await this.refreshInfluencerSummary(organizationId, scope.influencerId);
  }

  async deletePostSummary(organizationId: string, postId: string) {
    await this.prisma.postPerformanceSummary.deleteMany({
      where: {
        organization_id: organizationId,
        post_id: postId,
      },
    });
  }

  async refreshActionSummary(organizationId: string, actionId: string) {
    await this.assertActionExists(organizationId, actionId);

    const rows = await this.loadMetricRows(organizationId, { actionId });
    const summary = this.aggregateRows(rows);

    return this.prisma.actionPerformanceSummary.upsert({
      where: {
        organization_id_action_id: {
          organization_id: organizationId,
          action_id: actionId,
        },
      },
      create: {
        organization_id: organizationId,
        action_id: actionId,
        ...summary,
      },
      update: summary,
    });
  }

  async refreshMissionSummary(organizationId: string, missionId: string) {
    await this.assertMissionExists(organizationId, missionId);

    const rows = await this.loadMetricRows(organizationId, { missionId });
    const summary = this.aggregateRows(rows);

    return this.prisma.missionPerformanceSummary.upsert({
      where: {
        organization_id_mission_id: {
          organization_id: organizationId,
          mission_id: missionId,
        },
      },
      create: {
        organization_id: organizationId,
        mission_id: missionId,
        ...summary,
      },
      update: summary,
    });
  }

  async refreshCampaignSummary(organizationId: string, campaignId: string) {
    await this.assertCampaignExists(organizationId, campaignId);

    const rows = await this.loadMetricRows(organizationId, { campaignId });
    const summary = this.aggregateRows(rows);

    return this.prisma.campaignPerformanceSummary.upsert({
      where: {
        organization_id_campaign_id: {
          organization_id: organizationId,
          campaign_id: campaignId,
        },
      },
      create: {
        organization_id: organizationId,
        campaign_id: campaignId,
        ...summary,
      },
      update: summary,
    });
  }

  async refreshInfluencerSummary(organizationId: string, influencerId: string) {
    await this.assertInfluencerExists(organizationId, influencerId);

    const rows = await this.loadMetricRows(organizationId, { influencerId });
    const summary = this.aggregateRows(rows);

    return this.prisma.influencerPerformanceSummary.upsert({
      where: {
        organization_id_influencer_id: {
          organization_id: organizationId,
          influencer_id: influencerId,
        },
      },
      create: {
        organization_id: organizationId,
        influencer_id: influencerId,
        ...summary,
      },
      update: summary,
    });
  }

  async getStoredPostSummary(organizationId: string, postId: string) {
    await this.getPostScope(organizationId, postId);

    const summary = await this.prisma.postPerformanceSummary.findUnique({
      where: {
        organization_id_post_id: {
          organization_id: organizationId,
          post_id: postId,
        },
      },
    });

    return summary ?? this.refreshPostSummary(organizationId, postId);
  }

  async getStoredActionSummary(organizationId: string, actionId: string) {
    await this.assertActionExists(organizationId, actionId);

    const summary = await this.prisma.actionPerformanceSummary.findUnique({
      where: {
        organization_id_action_id: {
          organization_id: organizationId,
          action_id: actionId,
        },
      },
    });

    return summary ?? this.refreshActionSummary(organizationId, actionId);
  }

  async getStoredMissionSummary(organizationId: string, missionId: string) {
    await this.assertMissionExists(organizationId, missionId);

    const summary = await this.prisma.missionPerformanceSummary.findUnique({
      where: {
        organization_id_mission_id: {
          organization_id: organizationId,
          mission_id: missionId,
        },
      },
    });

    return summary ?? this.refreshMissionSummary(organizationId, missionId);
  }

  async getStoredCampaignSummary(organizationId: string, campaignId: string) {
    await this.assertCampaignExists(organizationId, campaignId);

    const summary = await this.prisma.campaignPerformanceSummary.findUnique({
      where: {
        organization_id_campaign_id: {
          organization_id: organizationId,
          campaign_id: campaignId,
        },
      },
    });

    return summary ?? this.refreshCampaignSummary(organizationId, campaignId);
  }

  async getStoredInfluencerSummary(
    organizationId: string,
    influencerId: string,
  ) {
    await this.assertInfluencerExists(organizationId, influencerId);

    const summary = await this.prisma.influencerPerformanceSummary.findUnique({
      where: {
        organization_id_influencer_id: {
          organization_id: organizationId,
          influencer_id: influencerId,
        },
      },
    });

    return summary ?? this.refreshInfluencerSummary(organizationId, influencerId);
  }

  async computePostSummary(
    organizationId: string,
    postId: string,
    filters: SummaryFiltersDto,
  ) {
    const post = await this.prisma.post.findFirst({
      where: { id: postId, organization_id: organizationId },
      select: { id: true, platform: true },
    });

    if (!post) {
      throw new NotFoundException("Post not found.");
    }

    const rows = await this.loadMetricRows(organizationId, {
      postId,
      platform: filters.platform,
      influencerId: filters.influencer_id,
      campaignId: filters.campaign_id,
      dateFrom: filters.date_from,
      dateTo: filters.date_to,
    });

    return this.aggregateRows(rows, post.platform);
  }

  async computeActionSummary(
    organizationId: string,
    actionId: string,
    filters: SummaryFiltersDto,
  ) {
    await this.assertActionExists(organizationId, actionId);

    const rows = await this.loadMetricRows(organizationId, {
      actionId,
      platform: filters.platform,
      influencerId: filters.influencer_id,
      campaignId: filters.campaign_id,
      dateFrom: filters.date_from,
      dateTo: filters.date_to,
    });

    return this.aggregateRows(rows);
  }

  async computeMissionSummary(
    organizationId: string,
    missionId: string,
    filters: SummaryFiltersDto,
  ) {
    await this.assertMissionExists(organizationId, missionId);

    const rows = await this.loadMetricRows(organizationId, {
      missionId,
      platform: filters.platform,
      influencerId: filters.influencer_id,
      campaignId: filters.campaign_id,
      dateFrom: filters.date_from,
      dateTo: filters.date_to,
    });

    return this.aggregateRows(rows);
  }

  async computeCampaignSummary(
    organizationId: string,
    campaignId: string,
    filters: SummaryFiltersDto,
  ) {
    await this.assertCampaignExists(organizationId, campaignId);

    const rows = await this.loadMetricRows(organizationId, {
      campaignId,
      platform: filters.platform,
      influencerId: filters.influencer_id,
      dateFrom: filters.date_from,
      dateTo: filters.date_to,
    });

    return this.aggregateRows(rows);
  }

  async computeInfluencerSummary(
    organizationId: string,
    influencerId: string,
    filters: SummaryFiltersDto,
  ) {
    await this.assertInfluencerExists(organizationId, influencerId);

    const rows = await this.loadMetricRows(organizationId, {
      influencerId,
      platform: filters.platform,
      campaignId: filters.campaign_id,
      dateFrom: filters.date_from,
      dateTo: filters.date_to,
    });

    return this.aggregateRows(rows);
  }

  private async loadMetricRows(
    organizationId: string,
    filters: ScopeFilters,
  ): Promise<AnalyticsMetricRow[]> {
    const hasSnapshotDateFilter = Boolean(filters.dateFrom || filters.dateTo);
    const campaignFilter: Prisma.CampaignWhereInput = {
      ...(filters.campaignId ? { id: filters.campaignId } : {}),
    };
    const missionFilter: Prisma.MissionWhereInput = {
      ...(filters.missionId ? { id: filters.missionId } : {}),
      ...(Object.keys(campaignFilter).length > 0
        ? { campaign: campaignFilter }
        : {}),
    };
    const actionFilter: Prisma.ActionWhereInput = {
      ...(filters.actionId ? { id: filters.actionId } : {}),
      ...(Object.keys(missionFilter).length > 0 ? { mission: missionFilter } : {}),
    };
    const assignmentFilter: Prisma.ActionAssignmentWhereInput = {
      ...(filters.influencerId ? { influencer_id: filters.influencerId } : {}),
      ...(Object.keys(actionFilter).length > 0 ? { action: actionFilter } : {}),
    };

    const posts = await this.prisma.post.findMany({
      where: {
        organization_id: organizationId,
        ...(filters.postId ? { id: filters.postId } : {}),
        ...(filters.platform ? { platform: filters.platform } : {}),
        ...(Object.keys(assignmentFilter).length > 0
          ? {
              deliverable: {
                action_assignment: assignmentFilter,
              },
            }
          : {}),
      },
      include: {
        deliverable: {
          select: {
            action_assignment: {
              select: {
                influencer_id: true,
                action_id: true,
                action: {
                  select: {
                    mission_id: true,
                    mission: {
                      select: {
                        campaign_id: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        performance_snapshots: {
          where: {
            ...(filters.dateFrom
              ? { captured_at: { gte: new Date(filters.dateFrom) } }
              : {}),
            ...(filters.dateTo
              ? {
                  captured_at: {
                    ...(filters.dateFrom ? { gte: new Date(filters.dateFrom) } : {}),
                    lte: new Date(filters.dateTo),
                  },
                }
              : {}),
          },
          orderBy: {
            captured_at: "desc",
          },
          take: 1,
        },
      },
    });

    return posts
      .map((post) => {
        const snapshot = post.performance_snapshots[0];

        if (!snapshot) {
          if (hasSnapshotDateFilter) {
            return null;
          }

          return {
            postId: post.id,
            platform: post.platform,
            influencerId: post.deliverable.action_assignment.influencer_id,
            actionId: post.deliverable.action_assignment.action_id,
            missionId: post.deliverable.action_assignment.action.mission_id,
            campaignId:
              post.deliverable.action_assignment.action.mission.campaign_id,
            capturedAt: null,
            impressions: 0,
            engagement: 0,
          } satisfies AnalyticsMetricRow;
        }

        return {
          postId: post.id,
          platform: post.platform,
          influencerId: post.deliverable.action_assignment.influencer_id,
          actionId: post.deliverable.action_assignment.action_id,
          missionId: post.deliverable.action_assignment.action.mission_id,
          campaignId:
            post.deliverable.action_assignment.action.mission.campaign_id,
          capturedAt: snapshot.captured_at,
          impressions: snapshot.impressions,
          engagement:
            snapshot.likes +
            snapshot.comments +
            snapshot.shares +
            snapshot.saves +
            snapshot.clicks,
        } satisfies AnalyticsMetricRow;
      })
      .filter((row): row is AnalyticsMetricRow => row !== null);
  }

  private aggregateRows(
    rows: AnalyticsMetricRow[],
    platform?: SocialPlatform,
  ): SummaryMetrics & { platform?: SocialPlatform } {
    const postIds = new Set<string>();
    const influencerIds = new Set<string>();
    let totalImpressions = 0;
    let totalEngagement = 0;
    let lastSnapshotAt: Date | null = null;

    for (const row of rows) {
      postIds.add(row.postId);
      influencerIds.add(row.influencerId);
      totalImpressions += row.impressions;
      totalEngagement += row.engagement;

      if (row.capturedAt && (!lastSnapshotAt || row.capturedAt > lastSnapshotAt)) {
        lastSnapshotAt = row.capturedAt;
      }
    }

    return {
      total_impressions: totalImpressions,
      total_engagement: totalEngagement,
      engagement_rate:
        totalImpressions > 0 ? totalEngagement / totalImpressions : 0,
      total_posts: postIds.size,
      total_influencers: influencerIds.size,
      last_snapshot_at: lastSnapshotAt,
      ...(platform ? { platform } : {}),
    };
  }

  private async assertCampaignExists(organizationId: string, campaignId: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: {
        id: campaignId,
        organization_id: organizationId,
      },
      select: { id: true },
    });

    if (!campaign) {
      throw new NotFoundException("Campaign not found.");
    }
  }

  private async assertMissionExists(organizationId: string, missionId: string) {
    const mission = await this.prisma.mission.findFirst({
      where: {
        id: missionId,
        organization_id: organizationId,
      },
      select: { id: true },
    });

    if (!mission) {
      throw new NotFoundException("Mission not found.");
    }
  }

  private async assertActionExists(organizationId: string, actionId: string) {
    const action = await this.prisma.action.findFirst({
      where: {
        id: actionId,
        organization_id: organizationId,
      },
      select: { id: true },
    });

    if (!action) {
      throw new NotFoundException("Action not found.");
    }
  }

  private async assertInfluencerExists(
    organizationId: string,
    influencerId: string,
  ) {
    const influencer = await this.prisma.influencer.findFirst({
      where: {
        id: influencerId,
        organization_id: organizationId,
      },
      select: { id: true },
    });

    if (!influencer) {
      throw new NotFoundException("Influencer not found.");
    }
  }
}
