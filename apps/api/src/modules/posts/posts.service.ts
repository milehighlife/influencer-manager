import { Injectable, NotFoundException } from "@nestjs/common";
import {
  AssignmentStatus,
  Prisma,
} from "@prisma/client";

import { AuditLogService } from "../../common/services/audit-log.service";
import {
  buildPaginatedResponse,
  getPagination,
} from "../../common/utils/pagination.util";
import { assertValidStateTransition } from "../../common/utils/lifecycle.util";
import { PrismaService } from "../../database/prisma.service";
import { QueueService } from "../../jobs/queue.service";
import { AnalyticsAggregationService } from "../reports/analytics-aggregation.service";
import { CreatePostDto } from "./dto/create-post.dto";
import { QueryPostsDto } from "./dto/query-posts.dto";
import { UpdatePostDto } from "./dto/update-post.dto";

@Injectable()
export class PostsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly queueService: QueueService,
    private readonly analyticsAggregationService: AnalyticsAggregationService,
  ) {}

  private async assertDeliverableExists(
    organizationId: string,
    deliverableId: string,
  ) {
    const deliverable = await this.prisma.deliverable.findFirst({
      where: { id: deliverableId, organization_id: organizationId },
    });

    if (!deliverable) {
      throw new NotFoundException("Deliverable not found.");
    }
  }

  async create(organizationId: string, dto: CreatePostDto) {
    const deliverable = await this.prisma.deliverable.findFirst({
      where: {
        id: dto.deliverable_id,
        organization_id: organizationId,
      },
      include: {
        action_assignment: {
          include: {
            deliverables: {
              include: {
                posts: {
                  select: {
                    id: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!deliverable) {
      throw new NotFoundException("Deliverable not found.");
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const post = await tx.post.create({
        data: {
          organization_id: organizationId,
          ...dto,
          posted_at: dto.posted_at ? new Date(dto.posted_at) : undefined,
        },
      });

      await this.auditLogService.logUserEvent(
        {
          organizationId,
          entityType: "post",
          entityId: post.id,
          parentEntityType: "deliverable",
          parentEntityId: deliverable.id,
          eventType: "post_created",
          newValue: {
            platform: post.platform,
            external_post_id: post.external_post_id,
            post_url: post.post_url,
            media_type: post.media_type,
            posted_at: post.posted_at,
          },
          metadataJson: {
            action_assignment_id: deliverable.action_assignment_id,
          },
        },
        tx,
      );

      const assignment = await this.maybeAutoCompleteAssignment(
        tx,
        organizationId,
        deliverable.action_assignment,
        deliverable.id,
      );

      return {
        post,
        assignment,
      };
    });

    await this.analyticsAggregationService.refreshForPost(
      organizationId,
      result.post.id,
    );

    return result;
  }

  async createForDeliverable(
    organizationId: string,
    deliverableId: string,
    dto: Omit<CreatePostDto, "deliverable_id">,
  ) {
    return this.create(organizationId, {
      ...dto,
      deliverable_id: deliverableId,
    });
  }

  async findAll(organizationId: string, query: QueryPostsDto) {
    const { page, limit, skip, take } = getPagination(query);
    const where: Prisma.PostWhereInput = {
      organization_id: organizationId,
      ...(query.deliverable_id ? { deliverable_id: query.deliverable_id } : {}),
      ...(query.action_assignment_id
        ? {
            deliverable: {
              action_assignment_id: query.action_assignment_id,
            },
          }
        : {}),
      ...(query.platform ? { platform: query.platform } : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.post.findMany({
        where,
        skip,
        take,
        orderBy: { created_at: "desc" },
      }),
      this.prisma.post.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, page, limit);
  }

  async findOne(organizationId: string, id: string) {
    const post = await this.prisma.post.findFirst({
      where: { id, organization_id: organizationId },
      include: {
        deliverable: {
          select: {
            id: true,
            action_assignment_id: true,
            deliverable_type: true,
            status: true,
          },
        },
        performance_snapshots: {
          orderBy: { captured_at: "desc" },
          take: 1,
        },
      },
    });

    if (!post) {
      throw new NotFoundException("Post not found.");
    }

    return post;
  }

  async findByDeliverable(organizationId: string, deliverableId: string) {
    await this.assertDeliverableExists(organizationId, deliverableId);

    return this.prisma.post.findMany({
      where: {
        organization_id: organizationId,
        deliverable_id: deliverableId,
      },
      orderBy: [{ posted_at: "desc" }, { created_at: "desc" }],
      include: {
        performance_snapshots: {
          orderBy: { captured_at: "desc" },
          take: 1,
        },
      },
    });
  }

  async findByActionAssignment(
    organizationId: string,
    actionAssignmentId: string,
  ) {
    const assignment = await this.prisma.actionAssignment.findFirst({
      where: {
        id: actionAssignmentId,
        organization_id: organizationId,
      },
      include: {
        action: {
          select: {
            id: true,
            title: true,
            mission_id: true,
            status: true,
          },
        },
      },
    });

    if (!assignment) {
      throw new NotFoundException("Action assignment not found.");
    }

    const posts = await this.prisma.post.findMany({
      where: {
        organization_id: organizationId,
        deliverable: {
          action_assignment_id: actionAssignmentId,
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
    });

    return {
      assignment,
      posts,
    };
  }

  async update(organizationId: string, id: string, dto: UpdatePostDto) {
    const previousScope = await this.analyticsAggregationService.getPostScope(
      organizationId,
      id,
    );

    if (dto.deliverable_id) {
      await this.assertDeliverableExists(organizationId, dto.deliverable_id);
    }

    const updatedPost = await this.prisma.post.update({
      where: { id },
      data: {
        ...dto,
        posted_at: dto.posted_at ? new Date(dto.posted_at) : undefined,
      },
    });

    const nextScope = await this.analyticsAggregationService.getPostScope(
      organizationId,
      id,
    );

    if (!this.isSameScope(previousScope, nextScope)) {
      await this.analyticsAggregationService.refreshScope(
        organizationId,
        previousScope,
      );
    }

    await this.analyticsAggregationService.refreshForPost(organizationId, id);

    return updatedPost;
  }

  async remove(organizationId: string, id: string) {
    const previousScope = await this.analyticsAggregationService.getPostScope(
      organizationId,
      id,
    );

    await this.prisma.post.delete({ where: { id } });
    await this.analyticsAggregationService.deletePostSummary(organizationId, id);
    await this.analyticsAggregationService.refreshScope(
      organizationId,
      previousScope,
    );

    return { id };
  }

  async enqueueMetricSync(organizationId: string, id: string) {
    await this.findOne(organizationId, id);
    return this.queueService.enqueueMetricSyncForPost(organizationId, id);
  }

  private isSameScope(
    previousScope: {
      actionId: string;
      missionId: string;
      campaignId: string;
      influencerId: string;
    },
    nextScope: {
      actionId: string;
      missionId: string;
      campaignId: string;
      influencerId: string;
    },
  ) {
    return (
      previousScope.actionId === nextScope.actionId &&
      previousScope.missionId === nextScope.missionId &&
      previousScope.campaignId === nextScope.campaignId &&
      previousScope.influencerId === nextScope.influencerId
    );
  }

  private async maybeAutoCompleteAssignment(
    tx: Prisma.TransactionClient,
    organizationId: string,
    assignment: {
      id: string;
      action_id: string;
      assignment_status: AssignmentStatus;
      deliverable_count_expected: number;
      deliverables: Array<{
        id: string;
        status: string;
        posts: Array<{ id: string }>;
      }>;
    },
    deliverableId: string,
  ) {
    if (assignment.assignment_status !== AssignmentStatus.approved) {
      return null;
    }

    const refreshedAssignment = await tx.actionAssignment.findFirst({
      where: {
        id: assignment.id,
        organization_id: organizationId,
      },
      include: {
        deliverables: {
          include: {
            posts: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });

    if (!refreshedAssignment) {
      return null;
    }

    const approvedDeliverables = refreshedAssignment.deliverables.filter(
      (deliverable) => deliverable.status === "approved",
    );

    if (
      approvedDeliverables.length < refreshedAssignment.deliverable_count_expected
    ) {
      return null;
    }

    const everyApprovedDeliverablePosted = approvedDeliverables.every(
      (deliverable) => deliverable.posts.length > 0,
    );

    if (!everyApprovedDeliverablePosted) {
      return null;
    }

    assertValidStateTransition(
      "action_assignment",
      refreshedAssignment.assignment_status,
      AssignmentStatus.completed,
    );

    const updatedAssignment = await tx.actionAssignment.update({
      where: { id: refreshedAssignment.id },
      data: {
        assignment_status: AssignmentStatus.completed,
        completion_date: new Date(),
      },
    });

    await this.auditLogService.logUserEvent(
      {
        organizationId,
        entityType: "action_assignment",
        entityId: refreshedAssignment.id,
        parentEntityType: "action",
        parentEntityId: refreshedAssignment.action_id,
        eventType: "assignment_state_changed",
        previousValue: {
          assignment_status: refreshedAssignment.assignment_status,
        },
        newValue: {
          assignment_status: updatedAssignment.assignment_status,
          completion_date: updatedAssignment.completion_date,
        },
        metadataJson: {
          workflow_action: "post_linkage_complete",
          deliverable_id: deliverableId,
        },
      },
      tx,
    );

    return updatedAssignment;
  }
}
