import { NotFoundException } from "@nestjs/common";
import { SocialPlatform } from "@prisma/client";
import { describe, expect, it, jest } from "@jest/globals";

import { AnalyticsAggregationService } from "../src/modules/reports/analytics-aggregation.service";

describe("AnalyticsAggregationService", () => {
  it("aggregates latest post snapshots into campaign metrics", async () => {
    const prisma = {
      campaign: {
        findFirst: jest.fn<() => Promise<unknown>>().mockResolvedValue({
          id: "campaign-1",
        }),
      },
      post: {
        findMany: jest.fn<() => Promise<unknown[]>>().mockResolvedValue([
          {
            id: "post-1",
            platform: SocialPlatform.instagram,
            deliverable: {
              action_assignment: {
                influencer_id: "influencer-1",
                action_id: "action-1",
                action: {
                  mission_id: "mission-1",
                  mission: {
                    campaign_id: "campaign-1",
                  },
                },
              },
            },
            performance_snapshots: [
              {
                captured_at: new Date("2026-03-10T10:00:00.000Z"),
                impressions: 1000,
                likes: 50,
                comments: 10,
                shares: 5,
                saves: 15,
                clicks: 20,
              },
            ],
          },
          {
            id: "post-2",
            platform: SocialPlatform.tiktok,
            deliverable: {
              action_assignment: {
                influencer_id: "influencer-2",
                action_id: "action-2",
                action: {
                  mission_id: "mission-1",
                  mission: {
                    campaign_id: "campaign-1",
                  },
                },
              },
            },
            performance_snapshots: [
              {
                captured_at: new Date("2026-03-11T12:00:00.000Z"),
                impressions: 2000,
                likes: 80,
                comments: 12,
                shares: 8,
                saves: 10,
                clicks: 30,
              },
            ],
          },
        ]),
      },
    };

    const service = new AnalyticsAggregationService(prisma as never);
    const summary = await service.computeCampaignSummary("org-1", "campaign-1", {});

    expect(prisma.post.findMany).toHaveBeenCalled();
    expect(summary).toMatchObject({
      total_impressions: 3000,
      total_engagement: 240,
      total_posts: 2,
      total_influencers: 2,
      last_snapshot_at: new Date("2026-03-11T12:00:00.000Z"),
    });
    expect(summary.engagement_rate).toBeCloseTo(240 / 3000);
  });

  it("counts linked posts and influencers even before snapshots arrive", async () => {
    const prisma = {
      campaign: {
        findFirst: jest.fn<() => Promise<unknown>>().mockResolvedValue({
          id: "campaign-1",
        }),
      },
      post: {
        findMany: jest.fn<() => Promise<unknown[]>>().mockResolvedValue([
          {
            id: "post-1",
            platform: SocialPlatform.instagram,
            deliverable: {
              action_assignment: {
                influencer_id: "influencer-1",
                action_id: "action-1",
                action: {
                  mission_id: "mission-1",
                  mission: {
                    campaign_id: "campaign-1",
                  },
                },
              },
            },
            performance_snapshots: [],
          },
          {
            id: "post-2",
            platform: SocialPlatform.tiktok,
            deliverable: {
              action_assignment: {
                influencer_id: "influencer-2",
                action_id: "action-2",
                action: {
                  mission_id: "mission-1",
                  mission: {
                    campaign_id: "campaign-1",
                  },
                },
              },
            },
            performance_snapshots: [
              {
                captured_at: new Date("2026-03-11T12:00:00.000Z"),
                impressions: 2000,
                likes: 80,
                comments: 12,
                shares: 8,
                saves: 10,
                clicks: 30,
              },
            ],
          },
        ]),
      },
    };

    const service = new AnalyticsAggregationService(prisma as never);
    const summary = await service.computeCampaignSummary("org-1", "campaign-1", {});

    expect(summary).toMatchObject({
      total_impressions: 2000,
      total_engagement: 140,
      total_posts: 2,
      total_influencers: 2,
      last_snapshot_at: new Date("2026-03-11T12:00:00.000Z"),
    });
    expect(summary.engagement_rate).toBeCloseTo(140 / 2000);
  });

  it("does not return a stored campaign summary for a deleted campaign", async () => {
    const prisma = {
      campaign: {
        findFirst: jest.fn<() => Promise<unknown>>().mockResolvedValue(null),
      },
      campaignPerformanceSummary: {
        findUnique: jest.fn<() => Promise<unknown>>(),
      },
    };

    const service = new AnalyticsAggregationService(prisma as never);

    await expect(
      service.getStoredCampaignSummary("org-1", "campaign-1"),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.campaignPerformanceSummary.findUnique).not.toHaveBeenCalled();
  });
});
