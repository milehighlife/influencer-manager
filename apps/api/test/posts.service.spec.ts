import { AssignmentStatus } from "@prisma/client";
import { describe, expect, it, jest } from "@jest/globals";

import { PostsService } from "../src/modules/posts/posts.service";

describe("PostsService", () => {
  it("creates a post and auto-completes an approved assignment once posting requirements are satisfied", async () => {
    const tx = {
      post: {
        create: jest.fn<() => Promise<unknown>>().mockResolvedValue({
          id: "post-1",
          deliverable_id: "deliverable-1",
          platform: "instagram",
          external_post_id: "ig_123",
          post_url: "https://instagram.com/p/abc",
          media_type: "short_video",
          posted_at: new Date("2026-03-11T10:00:00.000Z"),
        }),
      },
      actionAssignment: {
        findFirst: jest.fn<() => Promise<unknown>>().mockResolvedValue({
          id: "assignment-1",
          action_id: "action-1",
          organization_id: "org-1",
          assignment_status: AssignmentStatus.approved,
          deliverable_count_expected: 1,
          deliverables: [
            {
              id: "deliverable-1",
              status: "approved",
              posts: [{ id: "post-1" }],
            },
          ],
        }),
        update: jest.fn<() => Promise<unknown>>().mockResolvedValue({
          id: "assignment-1",
          action_id: "action-1",
          assignment_status: AssignmentStatus.completed,
          completion_date: new Date("2026-03-11T10:05:00.000Z"),
        }),
      },
    };
    const prisma = {
      deliverable: {
        findFirst: jest.fn<() => Promise<unknown>>().mockResolvedValue({
          id: "deliverable-1",
          action_assignment_id: "assignment-1",
          action_assignment: {
            id: "assignment-1",
            action_id: "action-1",
            assignment_status: AssignmentStatus.approved,
            deliverable_count_expected: 1,
            deliverables: [],
          },
        }),
      },
      $transaction: jest
        .fn<
          (callback: (transactionClient: typeof tx) => Promise<unknown>) => Promise<unknown>
        >()
        .mockImplementation(async (callback) => callback(tx)),
    };
    const auditLogService = {
      logUserEvent: jest.fn<() => Promise<void>>().mockResolvedValue(),
    };
    const queueService = {
      enqueueMetricSyncForPost: jest.fn<() => Promise<unknown>>(),
    };
    const analyticsAggregationService = {
      getPostScope: jest.fn<() => Promise<unknown>>(),
      refreshScope: jest.fn<() => Promise<void>>().mockResolvedValue(),
      deletePostSummary: jest.fn<() => Promise<void>>().mockResolvedValue(),
      refreshForPost: jest.fn<() => Promise<void>>().mockResolvedValue(),
    };

    const service = new PostsService(
      prisma as never,
      auditLogService as never,
      queueService as never,
      analyticsAggregationService as never,
    );

    const result = await service.create("org-1", {
      deliverable_id: "deliverable-1",
      platform: "instagram",
      external_post_id: "ig_123",
      post_url: "https://instagram.com/p/abc",
      media_type: "short_video",
      posted_at: "2026-03-11T10:00:00.000Z",
    });

    expect(tx.post.create).toHaveBeenCalled();
    expect(tx.actionAssignment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          assignment_status: AssignmentStatus.completed,
        }),
      }),
    );
    expect(auditLogService.logUserEvent).toHaveBeenCalledTimes(2);
    expect(analyticsAggregationService.refreshForPost).toHaveBeenCalledWith(
      "org-1",
      "post-1",
    );
    expect(result).toMatchObject({
      post: {
        id: "post-1",
      },
      assignment: {
        id: "assignment-1",
        assignment_status: AssignmentStatus.completed,
      },
    });
  });

  it("refreshes both prior and current analytics lineage when a post moves assignments", async () => {
    const prisma = {
      deliverable: {
        findFirst: jest.fn<() => Promise<unknown>>().mockResolvedValue({
          id: "deliverable-2",
        }),
      },
      post: {
        update: jest.fn<() => Promise<unknown>>().mockResolvedValue({
          id: "post-1",
          deliverable_id: "deliverable-2",
        }),
      },
    };
    const analyticsAggregationService = {
      getPostScope: jest
        .fn<() => Promise<unknown>>()
        .mockResolvedValueOnce({
          postId: "post-1",
          actionId: "action-1",
          missionId: "mission-1",
          campaignId: "campaign-1",
          influencerId: "influencer-1",
        })
        .mockResolvedValueOnce({
          postId: "post-1",
          actionId: "action-2",
          missionId: "mission-2",
          campaignId: "campaign-2",
          influencerId: "influencer-2",
        }),
      refreshScope: jest.fn<() => Promise<void>>().mockResolvedValue(),
      refreshForPost: jest.fn<() => Promise<void>>().mockResolvedValue(),
      deletePostSummary: jest.fn<() => Promise<void>>().mockResolvedValue(),
    };

    const service = new PostsService(
      prisma as never,
      { logUserEvent: jest.fn<() => Promise<void>>().mockResolvedValue() } as never,
      { enqueueMetricSyncForPost: jest.fn<() => Promise<unknown>>() } as never,
      analyticsAggregationService as never,
    );

    await service.update("org-1", "post-1", {
      deliverable_id: "deliverable-2",
    });

    expect(prisma.post.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "post-1" },
      }),
    );
    expect(analyticsAggregationService.refreshScope).toHaveBeenCalledWith(
      "org-1",
      {
        postId: "post-1",
        actionId: "action-1",
        missionId: "mission-1",
        campaignId: "campaign-1",
        influencerId: "influencer-1",
      },
    );
    expect(analyticsAggregationService.refreshForPost).toHaveBeenCalledWith(
      "org-1",
      "post-1",
    );
  });

  it("removes post summaries and refreshes parent summaries when a post is deleted", async () => {
    const prisma = {
      post: {
        delete: jest.fn<() => Promise<unknown>>().mockResolvedValue({
          id: "post-1",
        }),
      },
    };
    const analyticsAggregationService = {
      getPostScope: jest.fn<() => Promise<unknown>>().mockResolvedValue({
        postId: "post-1",
        actionId: "action-1",
        missionId: "mission-1",
        campaignId: "campaign-1",
        influencerId: "influencer-1",
      }),
      refreshScope: jest.fn<() => Promise<void>>().mockResolvedValue(),
      refreshForPost: jest.fn<() => Promise<void>>().mockResolvedValue(),
      deletePostSummary: jest.fn<() => Promise<void>>().mockResolvedValue(),
    };

    const service = new PostsService(
      prisma as never,
      { logUserEvent: jest.fn<() => Promise<void>>().mockResolvedValue() } as never,
      { enqueueMetricSyncForPost: jest.fn<() => Promise<unknown>>() } as never,
      analyticsAggregationService as never,
    );

    await service.remove("org-1", "post-1");

    expect(prisma.post.delete).toHaveBeenCalledWith({
      where: { id: "post-1" },
    });
    expect(analyticsAggregationService.deletePostSummary).toHaveBeenCalledWith(
      "org-1",
      "post-1",
    );
    expect(analyticsAggregationService.refreshScope).toHaveBeenCalledWith(
      "org-1",
      {
        postId: "post-1",
        actionId: "action-1",
        missionId: "mission-1",
        campaignId: "campaign-1",
        influencerId: "influencer-1",
      },
    );
  });
});
