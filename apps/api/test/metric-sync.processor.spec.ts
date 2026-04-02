import { SocialPlatform } from "@prisma/client";
import { describe, expect, it, jest } from "@jest/globals";

import { MetricSyncProcessor } from "../src/jobs/processors/metric-sync.processor";

describe("MetricSyncProcessor", () => {
  it("fetches placeholder metrics, creates a snapshot, and completes the import log", async () => {
    const prisma = {
      post: {
        findFirst: jest.fn<() => Promise<unknown>>().mockResolvedValue({
          id: "post-1",
          platform: SocialPlatform.instagram,
          external_post_id: "ig_123",
          post_url: "https://instagram.com/p/abc",
        }),
      },
    };
    const platformIntegrationService = {
      fetchPostMetrics: jest.fn<() => Promise<unknown>>().mockResolvedValue({
        normalizedMetrics: {
          capturedAt: "2026-03-11T12:00:00.000Z",
          impressions: 1200,
          reach: 900,
          views: 750,
          videoViews: 700,
          likes: 110,
          comments: 9,
          shares: 4,
          saves: 12,
          clicks: 21,
          conversions: 3,
        },
        rawResponse: {
          source: "placeholder",
        },
        importMetadata: {
          adapter: "instagram",
        },
      }),
    };
    const performanceSnapshotsService = {
      create: jest.fn<() => Promise<unknown>>().mockResolvedValue({
        id: "snapshot-1",
      }),
    };
    const importLogsService = {
      markRunning: jest.fn<() => Promise<void>>().mockResolvedValue(),
      markCompleted: jest.fn<() => Promise<void>>().mockResolvedValue(),
      markFailed: jest.fn<() => Promise<void>>().mockResolvedValue(),
    };

    const processor = new MetricSyncProcessor(
      prisma as never,
      platformIntegrationService as never,
      performanceSnapshotsService as never,
      importLogsService as never,
    );

    const result = await processor.process({
      organizationId: "org-1",
      postId: "post-1",
      importLogId: "import-log-1",
    });

    expect(platformIntegrationService.fetchPostMetrics).toHaveBeenCalled();
    expect(performanceSnapshotsService.create).toHaveBeenCalled();
    expect(importLogsService.markCompleted).toHaveBeenCalled();
    expect(result).toMatchObject({
      snapshotId: "snapshot-1",
      importLogId: "import-log-1",
    });
  });
});
