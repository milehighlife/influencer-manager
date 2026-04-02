import {
  ForbiddenException,
} from "@nestjs/common";
import {
  AssignmentStatus,
  DeliverableStatus,
} from "@prisma/client";
import { describe, expect, it, jest } from "@jest/globals";

import { InfluencerWorkspaceService } from "../src/modules/influencer-workspace/influencer-workspace.service";

describe("InfluencerWorkspaceService", () => {
  it("blocks influencer workspace access when the user is not linked to an influencer record", async () => {
    const service = new InfluencerWorkspaceService(
      {
        $transaction: jest.fn(),
      } as never,
      {
        accept: jest.fn(),
        start: jest.fn(),
        submit: jest.fn(),
      } as never,
      {
        createForDeliverable: jest.fn(),
      } as never,
      {
        getPostSummary: jest.fn(),
      } as never,
      {
        enqueueMetricSyncForPost: jest.fn(),
      } as never,
    );

    await expect(
      service.listAssignments(
        "org-1",
        {
          id: "user-1",
          email: "viewer@example.com",
          fullName: "Viewer",
          organizationId: "org-1",
          role: "influencer",
          status: "active",
        },
        { page: 1, limit: 20 },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("requires approved deliverables before an influencer can link a post", async () => {
    const prisma = {
      deliverable: {
        findFirst: jest.fn(async () => ({
          id: "deliverable-1",
          organization_id: "org-1",
          status: DeliverableStatus.submitted,
          action_assignment: {
            id: "assignment-1",
            assignment_status: AssignmentStatus.submitted,
          },
          posts: [],
        })),
      },
    };

    const service = new InfluencerWorkspaceService(
      prisma as never,
      {
        accept: jest.fn(),
        start: jest.fn(),
        submit: jest.fn(),
      } as never,
      {
        createForDeliverable: jest.fn(),
      } as never,
      {
        getPostSummary: jest.fn(),
      } as never,
      {
        enqueueMetricSyncForPost: jest.fn(),
      } as never,
    );

    await expect(
      service.linkPost(
        "org-1",
        {
          id: "user-1",
          email: "nina@creatormail.example",
          fullName: "Nina Alvarez",
          influencerId: "influencer-1",
          organizationId: "org-1",
          role: "influencer",
          status: "active",
        },
        "deliverable-1",
        {
          platform: "instagram",
          post_url: "https://instagram.com/p/demo",
          media_type: "video",
        },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("creates a post for an owned approved deliverable and best-effort enqueues metric sync", async () => {
    const prisma = {
      deliverable: {
        findFirst: jest.fn(async () => ({
          id: "deliverable-1",
          organization_id: "org-1",
          status: DeliverableStatus.approved,
          action_assignment: {
            id: "assignment-1",
            assignment_status: AssignmentStatus.approved,
          },
          posts: [],
        })),
      },
    };
    const postsService = {
      createForDeliverable: jest.fn(async () => ({
        post: {
          id: "post-1",
          deliverable_id: "deliverable-1",
          post_url: "https://instagram.com/p/demo",
        },
      })),
    };
    const queueService = {
      enqueueMetricSyncForPost: jest.fn(async () => {
        throw new Error("redis down");
      }),
    };

    const service = new InfluencerWorkspaceService(
      prisma as never,
      {
        accept: jest.fn(),
        start: jest.fn(),
        submit: jest.fn(),
      } as never,
      postsService as never,
      {
        getPostSummary: jest.fn(),
      } as never,
      queueService as never,
    );

    await expect(
      service.linkPost(
        "org-1",
        {
          id: "user-1",
          email: "nina@creatormail.example",
          fullName: "Nina Alvarez",
          influencerId: "influencer-1",
          organizationId: "org-1",
          role: "influencer",
          status: "active",
        },
        "deliverable-1",
        {
          platform: "instagram",
          post_url: "https://instagram.com/p/demo",
          media_type: "video",
        },
      ),
    ).resolves.toMatchObject({
      post: {
        id: "post-1",
      },
      metric_sync_enqueued: false,
    });
  });

  it("returns a truthful posts summary that is independent from the current page size", async () => {
    const prisma = {
      $transaction: jest.fn(async (operations: Promise<unknown>[]) =>
        Promise.all(operations),
      ),
      post: {
        findMany: jest.fn(async () => [
          {
            id: "post-1",
            post_url: "https://instagram.com/p/demo",
            performance_snapshots: [],
          },
        ]),
        count: jest
          .fn<() => Promise<number>>()
          .mockImplementationOnce(async () => 4)
          .mockImplementationOnce(async () => 4)
          .mockImplementationOnce(async () => 1),
      },
      performanceSnapshot: {
        findFirst: jest.fn(async () => ({
          captured_at: "2026-03-14T18:00:00.000Z",
        })),
      },
    };

    const service = new InfluencerWorkspaceService(
      prisma as never,
      {
        accept: jest.fn(),
        start: jest.fn(),
        submit: jest.fn(),
      } as never,
      {
        createForDeliverable: jest.fn(),
      } as never,
      {
        getPostSummary: jest.fn(),
      } as never,
      {
        enqueueMetricSyncForPost: jest.fn(),
      } as never,
    );

    await expect(
      service.listPosts(
        "org-1",
        {
          id: "user-1",
          email: "nina@creatormail.example",
          fullName: "Nina Alvarez",
          influencerId: "influencer-1",
          organizationId: "org-1",
          role: "influencer",
          status: "active",
        },
        { page: 1, limit: 1, platform: "instagram" },
      ),
    ).resolves.toMatchObject({
      data: [
        {
          id: "post-1",
        },
      ],
      meta: {
        page: 1,
        limit: 1,
        total: 4,
      },
      summary: {
        total_posts: 4,
        tracked_posts: 1,
        pending_sync_posts: 3,
        latest_snapshot_at: "2026-03-14T18:00:00.000Z",
      },
    });
  });

  it("applies assignment search and returns a shared status summary for creator queues", async () => {
    const prisma = {
      $transaction: jest.fn(async (operations: Promise<unknown>[]) =>
        Promise.all(operations),
      ),
      actionAssignment: {
        findMany: jest.fn(async () => [
          {
            id: "assignment-1",
            assignment_status: AssignmentStatus.rejected,
            action: {
              title: "Instagram Reel demo",
              mission: {
                name: "Launch wave",
                campaign: {
                  name: "Glow Launch",
                  company: {
                    id: "company-1",
                    name: "Glow Labs",
                    status: "active",
                  },
                },
              },
            },
          },
        ]),
        count: jest
          .fn<() => Promise<number>>()
          .mockImplementationOnce(async () => 1)
          .mockImplementationOnce(async () => 6),
        groupBy: jest.fn(async () => [
          {
            assignment_status: AssignmentStatus.submitted,
            _count: { assignment_status: 2 },
          },
          {
            assignment_status: AssignmentStatus.approved,
            _count: { assignment_status: 1 },
          },
          {
            assignment_status: AssignmentStatus.rejected,
            _count: { assignment_status: 1 },
          },
          {
            assignment_status: AssignmentStatus.completed,
            _count: { assignment_status: 2 },
          },
        ]),
      },
    };

    const service = new InfluencerWorkspaceService(
      prisma as never,
      {
        accept: jest.fn(),
        start: jest.fn(),
        submit: jest.fn(),
      } as never,
      {
        createForDeliverable: jest.fn(),
      } as never,
      {
        getPostSummary: jest.fn(),
      } as never,
      {
        enqueueMetricSyncForPost: jest.fn(),
      } as never,
    );

    const response = await service.listAssignments(
      "org-1",
      {
        id: "user-1",
        email: "nina@creatormail.example",
        fullName: "Nina Alvarez",
        influencerId: "influencer-1",
        organizationId: "org-1",
        role: "influencer",
        status: "active",
      },
      {
        page: 1,
        limit: 25,
        search: "glow",
        sort_by: "updated_at",
      },
    );

    expect(prisma.actionAssignment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ updated_at: "desc" }],
        where: expect.objectContaining({
          organization_id: "org-1",
          influencer_id: "influencer-1",
          OR: expect.arrayContaining([
            expect.objectContaining({
              action: expect.objectContaining({
                mission: expect.objectContaining({
                  campaign: expect.objectContaining({
                    name: expect.objectContaining({
                      contains: "glow",
                      mode: "insensitive",
                    }),
                  }),
                }),
              }),
            }),
          ]),
        }),
      }),
    );
    expect(response.summary).toEqual({
      total_assignments: 6,
      status_counts: {
        assigned: 0,
        accepted: 0,
        in_progress: 0,
        submitted: 2,
        approved: 1,
        rejected: 1,
        completed: 2,
      },
    });
  });

  it("returns a bounded latest-signals digest ordered by updated time and scoped to the creator org", async () => {
    const actionAssignmentFindMany = jest.fn(async () => [
      {
        id: "assignment-1",
        assignment_status: AssignmentStatus.rejected,
        assigned_at: new Date("2026-03-10T10:00:00.000Z"),
        created_at: new Date("2026-03-10T10:00:00.000Z"),
        updated_at: new Date("2026-03-13T12:00:00.000Z"),
        action: {
          platform: "instagram",
          title: "Instagram Reel demo",
          mission: {
            name: "Launch wave",
            campaign: {
              name: "Glow Launch",
              company: {
                id: "company-1",
                client_id: "client-1",
                name: "Glow Labs",
                status: "active",
              },
            },
          },
        },
      },
      {
        id: "assignment-2",
        assignment_status: AssignmentStatus.approved,
        assigned_at: new Date("2026-03-09T10:00:00.000Z"),
        created_at: new Date("2026-03-09T10:00:00.000Z"),
        updated_at: new Date("2026-03-12T10:00:00.000Z"),
        action: {
          platform: "tiktok",
          title: "Approved creator short",
          mission: {
            name: "Launch wave",
            campaign: {
              name: "Glow Launch",
              company: {
                id: "company-1",
                client_id: "client-1",
                name: "Glow Labs",
                status: "active",
              },
            },
          },
        },
      },
    ]);
    const postFindMany = jest.fn(async (args?: { where?: { id?: { in?: string[] }; deliverable?: { action_assignment_id?: { in?: string[] } } }; select?: unknown }) => {
      if (args?.where?.deliverable?.action_assignment_id?.in) {
        return [
          {
            deliverable: {
              action_assignment_id: "assignment-2",
            },
          },
        ];
      }

      if (args?.where?.id?.in) {
        return [
          {
            id: "post-1",
            post_url: "https://instagram.com/p/demo",
            platform: "instagram",
          },
        ];
      }

      return [
        {
          id: "post-1",
          post_url: "https://instagram.com/p/demo",
          platform: "instagram",
          posted_at: new Date("2026-03-13T09:00:00.000Z"),
          created_at: new Date("2026-03-13T09:00:00.000Z"),
          updated_at: new Date("2026-03-13T09:00:00.000Z"),
        },
      ];
    });
    const actionAssignmentCount = jest.fn(async () => 2);
    const performanceSnapshotFindMany = jest.fn(async () => [
      {
        post_id: "post-1",
        captured_at: new Date("2026-03-13T14:00:00.000Z"),
      },
    ]);

    const prisma = {
      actionAssignment: {
        findMany: actionAssignmentFindMany,
        count: actionAssignmentCount,
      },
      post: {
        findMany: postFindMany,
      },
      performanceSnapshot: {
        findMany: performanceSnapshotFindMany,
      },
    };

    const service = new InfluencerWorkspaceService(
      prisma as never,
      {
        accept: jest.fn(),
        start: jest.fn(),
        submit: jest.fn(),
      } as never,
      {
        createForDeliverable: jest.fn(),
      } as never,
      {
        getPostSummary: jest.fn(),
      } as never,
      {
        enqueueMetricSyncForPost: jest.fn(),
      } as never,
    );

    const response = await service.getStatusDigest(
      "org-1",
      {
        id: "user-1",
        email: "nina@creatormail.example",
        fullName: "Nina Alvarez",
        influencerId: "influencer-1",
        organizationId: "org-1",
        role: "influencer",
        status: "active",
      },
      {
        limit: 2,
      },
    );

    expect(actionAssignmentFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organization_id: "org-1",
          influencer_id: "influencer-1",
        }),
        take: 2,
      }),
    );
    expect(postFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organization_id: "org-1",
        }),
        take: 2,
      }),
    );
    expect(performanceSnapshotFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organization_id: "org-1",
        }),
        distinct: ["post_id"],
        take: 2,
      }),
    );
    expect(response.limit).toBe(2);
    expect(response.attention_count).toBe(2);
    expect(response.items).toHaveLength(2);
    expect(response.items[0]?.type).toBe("post_metrics_available");
    expect(response.items[1]?.type).toBe("assignment_revision_required");
  });
});
