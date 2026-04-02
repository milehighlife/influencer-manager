import { describe, expect, it, jest } from "@jest/globals";

import { PerformanceSnapshotsService } from "../src/modules/performance-snapshots/performance-snapshots.service";

describe("PerformanceSnapshotsService", () => {
  it("creates append-only performance snapshots and writes an audit event", async () => {
    const tx = {
      performanceSnapshot: {
        create: jest.fn<() => Promise<unknown>>().mockResolvedValue({
          id: "snapshot-1",
          post_id: "post-1",
          captured_at: new Date("2026-03-11T12:00:00.000Z"),
          impressions: 1200,
          reach: 950,
          views: 800,
          video_views: 750,
          likes: 110,
          comments: 9,
          shares: 4,
          saves: 13,
          clicks: 21,
          conversions: 2,
        }),
      },
    };
    const prisma = {
      post: {
        findFirst: jest.fn<() => Promise<unknown>>().mockResolvedValue({
          id: "post-1",
        }),
      },
      $transaction: jest
        .fn<
          (callback: (transactionClient: typeof tx) => Promise<unknown>) => Promise<unknown>
        >()
        .mockImplementation(async (callback) => callback(tx)),
      performanceSnapshot: {
        findFirst: jest.fn<() => Promise<unknown>>().mockResolvedValue({
          id: "snapshot-2",
          post_id: "post-1",
          captured_at: new Date("2026-03-12T12:00:00.000Z"),
        }),
      },
    };
    const auditLogService = {
      logUserEvent: jest.fn<() => Promise<void>>().mockResolvedValue(),
    };
    const analyticsAggregationService = {
      refreshForPost: jest.fn<() => Promise<void>>().mockResolvedValue(),
    };

    const service = new PerformanceSnapshotsService(
      prisma as never,
      auditLogService as never,
      analyticsAggregationService as never,
    );

    const snapshot = await service.create("org-1", {
      post_id: "post-1",
      captured_at: "2026-03-11T12:00:00.000Z",
      impressions: 1200,
    });
    const latest = await service.findLatestForPost("org-1", "post-1");

    expect(tx.performanceSnapshot.create).toHaveBeenCalled();
    expect(auditLogService.logUserEvent).toHaveBeenCalledTimes(1);
    expect(analyticsAggregationService.refreshForPost).toHaveBeenCalledWith(
      "org-1",
      "post-1",
    );
    expect(snapshot).toMatchObject({
      id: "snapshot-1",
      post_id: "post-1",
    });
    expect(latest).toMatchObject({
      id: "snapshot-2",
      post_id: "post-1",
    });
  });
});
