import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  AssignmentStatus,
  DeliverableStatus,
  Prisma,
  type SocialPlatform,
} from "@prisma/client";

import type { AuthenticatedUser } from "../../common/utils/authenticated-user.interface";
import {
  buildPaginatedResponse,
  getPagination,
} from "../../common/utils/pagination.util";
import { PrismaService } from "../../database/prisma.service";
import { QueueService } from "../../jobs/queue.service";
import { ActionAssignmentsService } from "../action-assignments/action-assignments.service";
import { SubmitActionAssignmentDto } from "../action-assignments/dto/submit-action-assignment.dto";
import { CreateDeliverablePostDto } from "../posts/dto/create-deliverable-post.dto";
import { PostsService } from "../posts/posts.service";
import { ReportsService } from "../reports/reports.service";
import { QueryInfluencerAssignmentsDto } from "./dto/query-influencer-assignments.dto";
import { QueryInfluencerPostsDto } from "./dto/query-influencer-posts.dto";
import { QueryInfluencerStatusDigestDto } from "./dto/query-influencer-status-digest.dto";

type StatusDigestItem = {
  id: string;
  type:
    | "assignment_awaiting_acceptance"
    | "submission_in_review"
    | "assignment_approved"
    | "assignment_revision_required"
    | "assignment_completed"
    | "post_linked"
    | "post_metrics_available";
  title: string;
  description: string;
  updated_at: string;
  badge_status: string;
  badge_label: string;
  attention: boolean;
  destination:
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
};

@Injectable()
export class InfluencerWorkspaceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly actionAssignmentsService: ActionAssignmentsService,
    private readonly postsService: PostsService,
    private readonly reportsService: ReportsService,
    private readonly queueService: QueueService,
  ) {}

  private getRequiredInfluencerId(user: AuthenticatedUser) {
    if (!user.influencerId) {
      throw new ForbiddenException(
        "Authenticated user is not linked to an influencer profile.",
      );
    }

    return user.influencerId;
  }

  private async findOwnedAssignment(
    organizationId: string,
    assignmentId: string,
    influencerId: string,
  ) {
    const assignment = await this.prisma.actionAssignment.findFirst({
      where: {
        id: assignmentId,
        organization_id: organizationId,
        influencer_id: influencerId,
      },
      include: {
        action: {
          include: {
            mission: {
              include: {
                campaign: {
                  include: {
                    company: {
                      select: {
                        id: true,
                        name: true,
                        client_id: true,
                        status: true,
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

    if (!assignment) {
      throw new NotFoundException("Influencer assignment not found.");
    }

    return assignment;
  }

  private async findOwnedDeliverable(
    organizationId: string,
    deliverableId: string,
    influencerId: string,
  ) {
    const deliverable = await this.prisma.deliverable.findFirst({
      where: {
        id: deliverableId,
        organization_id: organizationId,
        action_assignment: {
          influencer_id: influencerId,
        },
      },
      include: {
        action_assignment: true,
        posts: {
          include: {
            performance_snapshots: {
              orderBy: { captured_at: "desc" },
              take: 1,
            },
          },
        },
      },
    });

    if (!deliverable) {
      throw new NotFoundException("Influencer deliverable not found.");
    }

    return deliverable;
  }

  private async findOwnedPost(
    organizationId: string,
    postId: string,
    influencerId: string,
  ) {
    const post = await this.prisma.post.findFirst({
      where: {
        id: postId,
        organization_id: organizationId,
        deliverable: {
          action_assignment: {
            influencer_id: influencerId,
          },
        },
      },
      include: {
        deliverable: {
          include: {
            action_assignment: {
              include: {
                action: {
                  include: {
                    mission: {
                      include: {
                        campaign: {
                          include: {
                            company: {
                              select: {
                                id: true,
                                name: true,
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        performance_snapshots: {
          orderBy: { captured_at: "desc" },
          take: 1,
        },
      },
    });

    if (!post) {
      throw new NotFoundException("Influencer post not found.");
    }

    return post;
  }

  private buildAssignmentSummaryWhere(
    organizationId: string,
    influencerId: string,
  ): Prisma.ActionAssignmentWhereInput {
    return {
      organization_id: organizationId,
      influencer_id: influencerId,
    };
  }

  private buildPostSummaryWhere(
    organizationId: string,
    influencerId: string,
    platform?: SocialPlatform,
  ): Prisma.PostWhereInput {
    return {
      organization_id: organizationId,
      ...(platform ? { platform } : {}),
      deliverable: {
        action_assignment: {
          influencer_id: influencerId,
        },
      },
    };
  }

  private buildAssignmentSearchWhere(
    organizationId: string,
    influencerId: string,
    query: QueryInfluencerAssignmentsDto,
  ): Prisma.ActionAssignmentWhereInput {
    const search = query.search?.trim();
    const normalizedSearch = search?.toLowerCase() ?? "";
    const platformMatches = [
      "instagram",
      "tiktok",
      "youtube",
      "x",
      "linkedin",
      "threads",
      "other",
    ].filter((platform) => platform.includes(normalizedSearch)) as SocialPlatform[];
    const assignmentStatusMatches = [
      AssignmentStatus.assigned,
      AssignmentStatus.accepted,
      AssignmentStatus.in_progress,
      AssignmentStatus.submitted,
      AssignmentStatus.approved,
      AssignmentStatus.rejected,
      AssignmentStatus.completed,
    ].filter((status) => status.includes(normalizedSearch));

    return {
      ...this.buildAssignmentSummaryWhere(organizationId, influencerId),
      ...(query.assignment_status
        ? { assignment_status: query.assignment_status }
        : {}),
      ...(search
        ? {
            OR: [
              {
                action: {
                  title: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
              },
              {
                action: {
                  mission: {
                    name: {
                      contains: search,
                      mode: "insensitive",
                    },
                  },
                },
              },
              {
                action: {
                  mission: {
                    campaign: {
                      name: {
                        contains: search,
                        mode: "insensitive",
                      },
                    },
                  },
                },
              },
              ...(platformMatches.length > 0
                ? [
                    {
                      action: {
                        platform: {
                          in: platformMatches,
                        },
                      },
                    } satisfies Prisma.ActionAssignmentWhereInput,
                  ]
                : []),
              ...(assignmentStatusMatches.length > 0
                ? [
                    {
                      assignment_status: {
                        in: assignmentStatusMatches,
                      },
                    } satisfies Prisma.ActionAssignmentWhereInput,
                  ]
                : []),
            ],
          }
        : {}),
    };
  }

  private async buildAssignmentSummary(
    where: Prisma.ActionAssignmentWhereInput,
  ) {
    const [totalAssignments, groupedCounts] = await this.prisma.$transaction([
      this.prisma.actionAssignment.count({ where }),
      this.prisma.actionAssignment.groupBy({
        by: ["assignment_status"],
        where,
        orderBy: {
          assignment_status: "asc",
        },
        _count: {
          assignment_status: true,
        },
      }),
    ]) as [
      number,
      Array<{
        assignment_status: AssignmentStatus;
        _count: {
          assignment_status: number;
        };
      }>,
    ];

    const statusCounts: Record<AssignmentStatus, number> = {
      assigned: 0,
      accepted: 0,
      in_progress: 0,
      submitted: 0,
      approved: 0,
      rejected: 0,
      completed: 0,
      completed_by_cascade: 0,
    };

    for (const row of groupedCounts) {
      statusCounts[row.assignment_status] = row._count.assignment_status;
    }

    return {
      total_assignments: totalAssignments,
      status_counts: statusCounts,
    };
  }

  private async buildPostSummary(where: Prisma.PostWhereInput) {
    const [totalPosts, trackedPosts, latestSnapshot] = await this.prisma.$transaction([
      this.prisma.post.count({ where }),
      this.prisma.post.count({
        where: {
          ...where,
          performance_snapshots: {
            some: {},
          },
        },
      }),
      this.prisma.performanceSnapshot.findFirst({
        where: {
          post: where,
        },
        orderBy: {
          captured_at: "desc",
        },
        select: {
          captured_at: true,
        },
      }),
    ]);

    return {
      total_posts: totalPosts,
      tracked_posts: trackedPosts,
      pending_sync_posts: totalPosts - trackedPosts,
      latest_snapshot_at: latestSnapshot?.captured_at ?? null,
    };
  }

  private sortStatusDigestItems(items: StatusDigestItem[]) {
    return [...items].sort((left, right) => {
      const timeDiff =
        new Date(right.updated_at).getTime() -
        new Date(left.updated_at).getTime();

      if (timeDiff !== 0) {
        return timeDiff;
      }

      return left.id.localeCompare(right.id);
    });
  }

  private async buildStatusDigestAssignmentItems(
    organizationId: string,
    influencerId: string,
    limit: number,
  ) {
    const assignments = await this.prisma.actionAssignment.findMany({
      where: {
        organization_id: organizationId,
        influencer_id: influencerId,
        assignment_status: {
          in: [
            AssignmentStatus.assigned,
            AssignmentStatus.submitted,
            AssignmentStatus.approved,
            AssignmentStatus.rejected,
            AssignmentStatus.completed,
          ],
        },
      },
      orderBy: [{ updated_at: "desc" }, { id: "asc" }],
      take: limit,
      include: {
        action: {
          include: {
            mission: {
              include: {
                campaign: {
                  include: {
                    company: {
                      select: {
                        id: true,
                        client_id: true,
                        name: true,
                        status: true,
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

    const approvedAssignmentIds = assignments
      .filter((assignment) => assignment.assignment_status === AssignmentStatus.approved)
      .map((assignment) => assignment.id);

    const linkedApprovedAssignments =
      approvedAssignmentIds.length > 0
        ? await this.prisma.post.findMany({
            where: {
              organization_id: organizationId,
              deliverable: {
                action_assignment: {
                  influencer_id: influencerId,
                },
                action_assignment_id: {
                  in: approvedAssignmentIds,
                },
              },
            },
            select: {
              deliverable: {
                select: {
                  action_assignment_id: true,
                },
              },
            },
          })
        : [];

    const assignmentIdsWithPosts = new Set(
      linkedApprovedAssignments.map(
        (post) => post.deliverable.action_assignment_id,
      ),
    );

    return assignments.flatMap<StatusDigestItem>((assignment) => {
      const campaignName = assignment.action.mission.campaign.name;
      const actionTitle = assignment.action.title;
      const platform = assignment.action.platform;

      switch (assignment.assignment_status) {
        case AssignmentStatus.assigned:
          return [
            {
              id: `assignment-awaiting-${assignment.id}`,
              type: "assignment_awaiting_acceptance",
              title: "Assignment awaiting acceptance",
              description: `${actionTitle} for ${campaignName} is currently waiting for your review and acceptance.`,
              updated_at: (assignment.assigned_at ?? assignment.updated_at).toISOString(),
              badge_status: "assigned",
              badge_label: "Awaiting Acceptance",
              attention: true,
              destination: {
                type: "assignment",
                assignment_id: assignment.id,
                assignment_title: actionTitle,
              },
            },
          ];
        case AssignmentStatus.submitted:
          return [
            {
              id: `assignment-review-${assignment.id}`,
              type: "submission_in_review",
              title: "Submission currently in review",
              description: `Your ${platform} submission for ${actionTitle} is still with the reviewer.`,
              updated_at: assignment.updated_at.toISOString(),
              badge_status: "submitted",
              badge_label: "Awaiting Review",
              attention: false,
              destination: {
                type: "assignment",
                assignment_id: assignment.id,
                assignment_title: actionTitle,
              },
            },
          ];
        case AssignmentStatus.approved:
          return [
            {
              id: `assignment-approved-${assignment.id}`,
              type: "assignment_approved",
              title: "Approved and ready to post",
              description: assignmentIdsWithPosts.has(assignment.id)
                ? `${actionTitle} is approved, and your linked post is already being tracked.`
                : `${actionTitle} is approved and ready for post linkage when it goes live.`,
              updated_at: assignment.updated_at.toISOString(),
              badge_status: "approved",
              badge_label: "Approved",
              attention: !assignmentIdsWithPosts.has(assignment.id),
              destination: {
                type: "assignment",
                assignment_id: assignment.id,
                assignment_title: actionTitle,
              },
            },
          ];
        case AssignmentStatus.rejected:
          return [
            {
              id: `assignment-rejected-${assignment.id}`,
              type: "assignment_revision_required",
              title: "Revision currently required",
              description: `Open ${actionTitle} to review the requested changes and prepare your resubmission.`,
              updated_at: assignment.updated_at.toISOString(),
              badge_status: "rejected",
              badge_label: "Needs Revision",
              attention: true,
              destination: {
                type: "assignment",
                assignment_id: assignment.id,
                assignment_title: actionTitle,
              },
            },
          ];
        case AssignmentStatus.completed:
          return [
            {
              id: `assignment-completed-${assignment.id}`,
              type: "assignment_completed",
              title: "Assignment currently complete",
              description: `${actionTitle} for ${campaignName} is complete. Performance tracking remains available below.`,
              updated_at: assignment.updated_at.toISOString(),
              badge_status: "completed",
              badge_label: "Completed",
              attention: false,
              destination: {
                type: "assignment",
                assignment_id: assignment.id,
                assignment_title: actionTitle,
              },
            },
          ];
        default:
          return [];
      }
    });
  }

  private async buildStatusDigestPostLinkedItems(
    organizationId: string,
    influencerId: string,
    limit: number,
  ) {
    const posts = await this.prisma.post.findMany({
      where: this.buildPostSummaryWhere(organizationId, influencerId),
      orderBy: [{ posted_at: "desc" }, { updated_at: "desc" }, { created_at: "desc" }, { id: "asc" }],
      take: limit,
      select: {
        id: true,
        post_url: true,
        platform: true,
        posted_at: true,
        created_at: true,
        updated_at: true,
      },
    });

    return posts.map<StatusDigestItem>((post) => ({
      id: `post-linked-${post.id}`,
      type: "post_linked",
      title: "Post currently linked",
      description: `Your ${post.platform} post is connected and ready for performance tracking.`,
      updated_at: (post.posted_at ?? post.updated_at ?? post.created_at).toISOString(),
      badge_status: "active",
      badge_label: "Linked",
      attention: false,
      destination: {
        type: "post",
        post_id: post.id,
        post_url: post.post_url,
      },
    }));
  }

  private async buildStatusDigestMetricItems(
    organizationId: string,
    influencerId: string,
    limit: number,
  ) {
    const latestMetricSnapshots = await this.prisma.performanceSnapshot.findMany({
      where: {
        organization_id: organizationId,
        post: {
          deliverable: {
            action_assignment: {
              influencer_id: influencerId,
            },
          },
        },
      },
      orderBy: [{ captured_at: "desc" }, { post_id: "asc" }],
      distinct: ["post_id"],
      take: limit,
      select: {
        post_id: true,
        captured_at: true,
      },
    });

    const posts = latestMetricSnapshots.length
      ? await this.prisma.post.findMany({
          where: {
            organization_id: organizationId,
            id: {
              in: latestMetricSnapshots.map((snapshot) => snapshot.post_id),
            },
            deliverable: {
              action_assignment: {
                influencer_id: influencerId,
              },
            },
          },
          select: {
            id: true,
            post_url: true,
            platform: true,
          },
        })
      : [];

    const postById = new Map(posts.map((post) => [post.id, post]));

    return latestMetricSnapshots.flatMap<StatusDigestItem>((snapshot) => {
      const post = postById.get(snapshot.post_id);

      if (!post) {
        return [];
      }

      return [
        {
          id: `post-metrics-${post.id}`,
          type: "post_metrics_available",
          title: "Metrics currently available",
          description: `Current ${post.platform} performance counts are available for your linked post.`,
          updated_at: snapshot.captured_at.toISOString(),
          badge_status: "active",
          badge_label: "Tracked",
          attention: false,
          destination: {
            type: "post",
            post_id: post.id,
            post_url: post.post_url,
          },
        },
      ];
    });
  }

  private async buildStatusDigestAttentionCount(
    organizationId: string,
    influencerId: string,
  ) {
    return this.prisma.actionAssignment.count({
      where: {
        organization_id: organizationId,
        influencer_id: influencerId,
        OR: [
          {
            assignment_status: AssignmentStatus.assigned,
          },
          {
            assignment_status: AssignmentStatus.rejected,
          },
          {
            assignment_status: AssignmentStatus.approved,
            deliverables: {
              none: {
                posts: {
                  some: {},
                },
              },
            },
          },
        ],
      },
    });
  }

  async listAssignments(
    organizationId: string,
    user: AuthenticatedUser,
    query: QueryInfluencerAssignmentsDto,
  ) {
    const influencerId = this.getRequiredInfluencerId(user);
    const { page, limit, skip, take } = getPagination(query);
    const where = this.buildAssignmentSearchWhere(
      organizationId,
      influencerId,
      query,
    );
    const orderBy =
      query.sort_by === "updated_at"
        ? [{ updated_at: "desc" as const }]
        : [{ due_date: "asc" as const }, { created_at: "desc" as const }];

    const [data, total, summary] = await Promise.all([
      this.prisma.actionAssignment.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          action: {
            include: {
              mission: {
                include: {
                  campaign: {
                    include: {
                      company: {
                        select: {
                          id: true,
                          client_id: true,
                          name: true,
                          status: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      }),
      this.prisma.actionAssignment.count({ where }),
      this.buildAssignmentSummary(
        this.buildAssignmentSummaryWhere(organizationId, influencerId),
      ),
    ]);

    return {
      ...buildPaginatedResponse(data, total, page, limit),
      summary,
    };
  }

  async getStatusDigest(
    organizationId: string,
    user: AuthenticatedUser,
    query: QueryInfluencerStatusDigestDto,
  ) {
    const influencerId = this.getRequiredInfluencerId(user);
    const limit = query.limit ?? 20;

    const [assignmentItems, postLinkedItems, metricItems, attentionCount] =
      await Promise.all([
        this.buildStatusDigestAssignmentItems(organizationId, influencerId, limit),
        this.buildStatusDigestPostLinkedItems(organizationId, influencerId, limit),
        this.buildStatusDigestMetricItems(organizationId, influencerId, limit),
        this.buildStatusDigestAttentionCount(organizationId, influencerId),
      ]);

    return {
      items: this.sortStatusDigestItems([
        ...assignmentItems,
        ...postLinkedItems,
        ...metricItems,
      ]).slice(0, limit),
      limit,
      attention_count: attentionCount,
    };
  }

  async getAssignment(organizationId: string, user: AuthenticatedUser, assignmentId: string) {
    const influencerId = this.getRequiredInfluencerId(user);

    const assignment = await this.findOwnedAssignment(
      organizationId,
      assignmentId,
      influencerId,
    );

    const [deliverables, posts] = await this.prisma.$transaction([
      this.prisma.deliverable.findMany({
        where: {
          organization_id: organizationId,
          action_assignment_id: assignmentId,
        },
        orderBy: [{ created_at: "asc" }],
        include: {
          posts: {
            orderBy: [{ posted_at: "desc" }, { created_at: "desc" }],
            include: {
              performance_snapshots: {
                orderBy: { captured_at: "desc" },
                take: 1,
              },
            },
          },
        },
      }),
      this.prisma.post.findMany({
        where: {
          organization_id: organizationId,
          deliverable: {
            action_assignment_id: assignmentId,
          },
        },
        orderBy: [{ posted_at: "desc" }, { created_at: "desc" }],
        include: {
          deliverable: {
            select: {
              id: true,
              deliverable_type: true,
              status: true,
            },
          },
          performance_snapshots: {
            orderBy: { captured_at: "desc" },
            take: 1,
          },
        },
      }),
    ]);

    return {
      assignment,
      deliverables,
      posts,
    };
  }

  async acceptAssignment(
    organizationId: string,
    user: AuthenticatedUser,
    assignmentId: string,
  ) {
    const influencerId = this.getRequiredInfluencerId(user);
    await this.findOwnedAssignment(organizationId, assignmentId, influencerId);

    return this.actionAssignmentsService.accept(organizationId, assignmentId, user);
  }

  async startAssignment(
    organizationId: string,
    user: AuthenticatedUser,
    assignmentId: string,
  ) {
    const influencerId = this.getRequiredInfluencerId(user);
    await this.findOwnedAssignment(organizationId, assignmentId, influencerId);

    return this.actionAssignmentsService.start(organizationId, assignmentId, user);
  }

  async submitDeliverables(
    organizationId: string,
    user: AuthenticatedUser,
    assignmentId: string,
    dto: SubmitActionAssignmentDto,
  ) {
    const influencerId = this.getRequiredInfluencerId(user);
    await this.findOwnedAssignment(organizationId, assignmentId, influencerId);

    return this.actionAssignmentsService.submit(
      organizationId,
      assignmentId,
      user,
      dto,
    );
  }

  async linkPost(
    organizationId: string,
    user: AuthenticatedUser,
    deliverableId: string,
    dto: CreateDeliverablePostDto,
  ) {
    const influencerId = this.getRequiredInfluencerId(user);
    const deliverable = await this.findOwnedDeliverable(
      organizationId,
      deliverableId,
      influencerId,
    );

    if (deliverable.status !== DeliverableStatus.approved) {
      throw new ForbiddenException(
        "Published posts can only be linked from approved deliverables.",
      );
    }

    const assignmentStatus = deliverable.action_assignment.assignment_status;

    if (
      assignmentStatus !== AssignmentStatus.approved &&
      assignmentStatus !== AssignmentStatus.completed
    ) {
      throw new ForbiddenException(
        "Posts can only be linked after the assignment reaches approved status.",
      );
    }

    const result = await this.postsService.createForDeliverable(
      organizationId,
      deliverableId,
      dto,
    );

    let metricSyncEnqueued = false;

    try {
      await this.queueService.enqueueMetricSyncForPost(
        organizationId,
        result.post.id,
      );
      metricSyncEnqueued = true;
    } catch {
      metricSyncEnqueued = false;
    }

    return {
      ...result,
      metric_sync_enqueued: metricSyncEnqueued,
    };
  }

  async listPosts(
    organizationId: string,
    user: AuthenticatedUser,
    query: QueryInfluencerPostsDto,
  ) {
    const influencerId = this.getRequiredInfluencerId(user);
    const { page, limit, skip, take } = getPagination(query);
    const where = this.buildPostSummaryWhere(
      organizationId,
      influencerId,
      query.platform,
    );

    const [data, total, summary] = await Promise.all([
      this.prisma.post.findMany({
        where,
        skip,
        take,
        orderBy: [{ posted_at: "desc" }, { created_at: "desc" }],
        include: {
          deliverable: {
            select: {
              id: true,
              deliverable_type: true,
              status: true,
              action_assignment_id: true,
            },
          },
          performance_snapshots: {
            orderBy: { captured_at: "desc" },
            take: 1,
          },
        },
      }),
      this.prisma.post.count({ where }),
      this.buildPostSummary(where),
    ]);

    return {
      ...buildPaginatedResponse(data, total, page, limit),
      summary,
    };
  }

  async getPostPerformance(
    organizationId: string,
    user: AuthenticatedUser,
    postId: string,
  ) {
    const influencerId = this.getRequiredInfluencerId(user);
    const post = await this.findOwnedPost(organizationId, postId, influencerId);
    const summary = await this.reportsService.getPostSummary(
      organizationId,
      postId,
      {},
    );

    return {
      post,
      latest_snapshot: post.performance_snapshots[0] ?? null,
      summary,
    };
  }

  async getAssignmentCampaignAssets(
    organizationId: string,
    user: AuthenticatedUser,
    assignmentId: string,
  ) {
    const influencerId = this.getRequiredInfluencerId(user);

    const assignment = await this.prisma.actionAssignment.findFirst({
      where: {
        id: assignmentId,
        organization_id: organizationId,
        influencer_id: influencerId,
      },
      select: {
        action_id: true,
        action: {
          select: {
            mission: {
              select: { campaign_id: true },
            },
          },
        },
      },
    });

    if (!assignment) {
      throw new NotFoundException("Assignment not found.");
    }

    const campaignId = assignment.action.mission.campaign_id;

    const allAssets = await this.prisma.campaignAsset.findMany({
      where: {
        organization_id: organizationId,
        campaign_id: campaignId,
      },
      include: {
        action_links: { select: { action_id: true } },
        uploaded_by: { select: { full_name: true } },
      },
      orderBy: [{ sort_order: "asc" }, { created_at: "desc" }],
    });

    const actionSpecific = allAssets.filter((a) =>
      a.action_links.some((l) => l.action_id === assignment.action_id),
    );
    const campaignLevel = allAssets.filter(
      (a) =>
        a.action_links.length === 0 ||
        !a.action_links.some((l) => l.action_id === assignment.action_id),
    );

    const mapAsset = (a: typeof allAssets[number]) => ({
      id: a.id,
      name: a.name,
      description: a.description,
      source_type: a.source_type,
      file_url: a.file_url,
      file_name: a.file_name,
      file_size_bytes: a.file_size_bytes,
      mime_type: a.mime_type,
      thumbnail_url: a.thumbnail_url,
      category: a.category,
      tags: a.tags,
      created_at: a.created_at.toISOString(),
    });

    return {
      action_assets: actionSpecific.map(mapAsset),
      campaign_assets: campaignLevel.map(mapAsset),
    };
  }
}
