import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  AssignmentStatus,
  DeliverableStatus,
  Prisma,
} from "@prisma/client";

import { getInfluencerPlatforms } from "@influencer-manager/shared/types/mobile";
import type { AuthenticatedUser } from "../../common/utils/authenticated-user.interface";
import { assertValidStateTransition } from "../../common/utils/lifecycle.util";
import { AuditLogService } from "../../common/services/audit-log.service";
import {
  buildPaginatedResponse,
  getPagination,
} from "../../common/utils/pagination.util";
import { PrismaService } from "../../database/prisma.service";
import { CreateActionAssignmentDto } from "./dto/create-action-assignment.dto";
import { QueryActionAssignmentsDto } from "./dto/query-action-assignments.dto";
import { SubmitActionAssignmentDto } from "./dto/submit-action-assignment.dto";
import { UpdateActionAssignmentDto } from "./dto/update-action-assignment.dto";

@Injectable()
export class ActionAssignmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  private static readonly ACTIVE_DELIVERABLE_STATUSES = [
    DeliverableStatus.submitted,
    DeliverableStatus.approved,
  ] as const;

  private async assertActionExists(organizationId: string, actionId: string) {
    const action = await this.prisma.action.findFirst({
      where: { id: actionId, organization_id: organizationId },
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
      where: { id: influencerId, organization_id: organizationId },
    });

    if (!influencer) {
      throw new NotFoundException("Influencer not found.");
    }
  }

  async create(organizationId: string, dto: CreateActionAssignmentDto) {
    await this.assertActionExists(organizationId, dto.action_id);
    await this.assertInfluencerExists(organizationId, dto.influencer_id);

    const existing = await this.prisma.actionAssignment.findFirst({
      where: {
        organization_id: organizationId,
        action_id: dto.action_id,
        influencer_id: dto.influencer_id,
      },
    });

    if (existing) {
      throw new ConflictException(
        "This influencer is already assigned to the action.",
      );
    }

    return this.prisma.actionAssignment.create({
      data: {
        organization_id: organizationId,
        ...dto,
        assigned_at: dto.assigned_at ? new Date(dto.assigned_at) : undefined,
        due_date: dto.due_date ? new Date(dto.due_date) : undefined,
        completion_date: dto.completion_date
          ? new Date(dto.completion_date)
          : undefined,
      },
    });
  }

  async createForAction(
    organizationId: string,
    actionId: string,
    dto: Omit<CreateActionAssignmentDto, "action_id">,
  ) {
    return this.create(organizationId, {
      ...dto,
      action_id: actionId,
    });
  }

  async bulkCreate(
    organizationId: string,
    items: Array<{ action_id: string; influencer_id: string }>,
  ) {
    // Validate all referenced actions exist
    const actionIds = [...new Set(items.map((i) => i.action_id))];
    const actions = await this.prisma.action.findMany({
      where: { id: { in: actionIds }, organization_id: organizationId },
      select: { id: true },
    });
    const validActionIds = new Set(actions.map((a) => a.id));
    for (const actionId of actionIds) {
      if (!validActionIds.has(actionId)) {
        throw new NotFoundException(`Action ${actionId} not found.`);
      }
    }

    // Validate all referenced influencers exist
    const influencerIds = [...new Set(items.map((i) => i.influencer_id))];
    const influencers = await this.prisma.influencer.findMany({
      where: { id: { in: influencerIds }, organization_id: organizationId },
      select: { id: true },
    });
    const validInfluencerIds = new Set(influencers.map((i) => i.id));
    for (const influencerId of influencerIds) {
      if (!validInfluencerIds.has(influencerId)) {
        throw new NotFoundException(`Influencer ${influencerId} not found.`);
      }
    }

    // Find existing assignments to skip duplicates
    const existing = await this.prisma.actionAssignment.findMany({
      where: {
        organization_id: organizationId,
        OR: items.map((i) => ({
          action_id: i.action_id,
          influencer_id: i.influencer_id,
        })),
      },
      select: { action_id: true, influencer_id: true },
    });
    const existingKeys = new Set(
      existing.map((e) => `${e.action_id}:${e.influencer_id}`),
    );

    const toCreate = items.filter(
      (i) => !existingKeys.has(`${i.action_id}:${i.influencer_id}`),
    );

    if (toCreate.length === 0) {
      return { created: 0, skipped: items.length };
    }

    const result = await this.prisma.actionAssignment.createMany({
      data: toCreate.map((i) => ({
        organization_id: organizationId,
        action_id: i.action_id,
        influencer_id: i.influencer_id,
      })),
      skipDuplicates: true,
    });

    return {
      created: result.count,
      skipped: items.length - toCreate.length,
    };
  }

  async findAll(organizationId: string, query: QueryActionAssignmentsDto) {
    const { page, limit, skip, take } = getPagination(query);
    const campaignFilter: Prisma.CampaignWhereInput = {
      ...(query.company_id ? { company_id: query.company_id } : {}),
    };
    const missionFilter: Prisma.MissionWhereInput = {
      ...(query.campaign_id ? { campaign_id: query.campaign_id } : {}),
      ...(Object.keys(campaignFilter).length > 0 ? { campaign: campaignFilter } : {}),
    };
    const actionFilter: Prisma.ActionWhereInput = {
      ...(query.mission_id ? { mission_id: query.mission_id } : {}),
      ...(Object.keys(missionFilter).length > 0 ? { mission: missionFilter } : {}),
    };

    const where: Prisma.ActionAssignmentWhereInput = {
      organization_id: organizationId,
      ...(query.action_id ? { action_id: query.action_id } : {}),
      ...(Object.keys(actionFilter).length > 0 ? { action: actionFilter } : {}),
      ...(query.influencer_id ? { influencer_id: query.influencer_id } : {}),
      ...(query.assignment_status
        ? { assignment_status: query.assignment_status }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.actionAssignment.findMany({
        where,
        skip,
        take,
        orderBy: { created_at: "desc" },
      }),
      this.prisma.actionAssignment.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, page, limit);
  }

  async findOne(organizationId: string, id: string) {
    const assignment = await this.prisma.actionAssignment.findFirst({
      where: { id, organization_id: organizationId },
    });

    if (!assignment) {
      throw new NotFoundException("Action assignment not found.");
    }

    return assignment;
  }

  async findByAction(organizationId: string, actionId: string) {
    await this.assertActionExists(organizationId, actionId);

    const action = await this.prisma.action.findFirst({
      where: {
        id: actionId,
        organization_id: organizationId,
      },
      include: {
        mission: {
          select: {
            id: true,
            campaign_id: true,
            name: true,
            sequence_order: true,
            status: true,
          },
        },
      },
    });

    const assignments = await this.prisma.actionAssignment.findMany({
      where: {
        organization_id: organizationId,
        action_id: actionId,
      },
      orderBy: [{ assigned_at: "asc" }, { created_at: "asc" }],
      include: {
        influencer: {
          select: {
            id: true,
            name: true,
            email: true,
            primary_platform: true,
            location: true,
            status: true,
          },
        },
      },
    });

    return {
      action,
      assignments,
    };
  }

  async update(
    organizationId: string,
    id: string,
    dto: UpdateActionAssignmentDto,
  ) {
    const existing = await this.findOne(organizationId, id);

    if (dto.action_id) {
      await this.assertActionExists(organizationId, dto.action_id);
    }

    if (dto.influencer_id) {
      await this.assertInfluencerExists(organizationId, dto.influencer_id);
    }

    // Admin PATCH bypasses lifecycle validation — workflow endpoints
    // (accept, start, submit, complete) enforce transitions for influencers.

    if (dto.action_id || dto.influencer_id) {
      const duplicate = await this.prisma.actionAssignment.findFirst({
        where: {
          organization_id: organizationId,
          action_id: dto.action_id ?? existing.action_id,
          influencer_id: dto.influencer_id ?? existing.influencer_id,
          NOT: { id },
        },
      });

      if (duplicate) {
        throw new ConflictException(
          "This influencer is already assigned to the action.",
        );
      }
    }

    return this.prisma.actionAssignment.update({
      where: { id },
      data: {
        ...dto,
        assigned_at: dto.assigned_at ? new Date(dto.assigned_at) : undefined,
        due_date: dto.due_date ? new Date(dto.due_date) : undefined,
        completion_date: dto.completion_date
          ? new Date(dto.completion_date)
          : undefined,
      },
    });
  }

  async remove(organizationId: string, id: string) {
    await this.findOne(organizationId, id);
    await this.prisma.actionAssignment.delete({ where: { id } });

    return { id };
  }

  async accept(
    organizationId: string,
    id: string,
    user: AuthenticatedUser,
  ) {
    return this.transitionAssignmentStatus(
      organizationId,
      id,
      AssignmentStatus.accepted,
      user,
      "assignment_accept",
      { accepted_at: new Date() },
    );
  }

  async start(
    organizationId: string,
    id: string,
    user: AuthenticatedUser,
  ) {
    return this.transitionAssignmentStatus(
      organizationId,
      id,
      AssignmentStatus.in_progress,
      user,
      "assignment_start",
    );
  }

  async submit(
    organizationId: string,
    id: string,
    user: AuthenticatedUser,
    dto: SubmitActionAssignmentDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const assignment = await tx.actionAssignment.findFirst({
        where: { id, organization_id: organizationId },
      });

      if (!assignment) {
        throw new NotFoundException("Action assignment not found.");
      }

      assertValidStateTransition(
        "action_assignment",
        assignment.assignment_status,
        AssignmentStatus.submitted,
      );

      const activeDeliverableCount = await tx.deliverable.count({
        where: {
          organization_id: organizationId,
          action_assignment_id: id,
          status: {
            in: [...ActionAssignmentsService.ACTIVE_DELIVERABLE_STATUSES],
          },
        },
      });

      const nextSubmittedCount =
        activeDeliverableCount + dto.deliverables.length;

      if (nextSubmittedCount !== assignment.deliverable_count_expected) {
        throw new BadRequestException(
          `Assignment requires exactly ${assignment.deliverable_count_expected} submitted deliverables before review.`,
        );
      }

      const submittedAt = new Date();
      const deliverables = [];

      for (const deliverable of dto.deliverables) {
        const createdDeliverable = await tx.deliverable.create({
          data: {
            organization_id: organizationId,
            action_assignment_id: id,
            deliverable_type: deliverable.deliverable_type,
            description: deliverable.description,
            submission_url: deliverable.submission_url,
            submission_metadata_json: this.toJsonValue(
              deliverable.submission_metadata_json,
            ),
            status: DeliverableStatus.submitted,
            submitted_at: submittedAt,
            submitted_by_user_id: user.id,
          } satisfies Prisma.DeliverableUncheckedCreateInput,
        });

        deliverables.push(createdDeliverable);

        await this.auditLogService.logUserEvent(
          {
            organizationId,
            entityType: "deliverable",
            entityId: createdDeliverable.id,
            parentEntityType: "action_assignment",
            parentEntityId: id,
            eventType: "deliverable_submitted",
            changedById: user.id,
            newValue: {
              status: createdDeliverable.status,
              submitted_at: createdDeliverable.submitted_at,
              submission_url: createdDeliverable.submission_url,
            },
            metadataJson: createdDeliverable.submission_metadata_json ?? undefined,
          },
          tx,
        );
      }

      // Save the first deliverable URL to the assignment for easy access
      const firstUrl = deliverables.find((d) => d.submission_url)?.submission_url ?? null;

      const updatedAssignment = await tx.actionAssignment.update({
        where: { id },
        data: {
          assignment_status: AssignmentStatus.submitted,
          deliverable_count_submitted: nextSubmittedCount,
          submitted_at: submittedAt,
          ...(firstUrl ? { submission_url: firstUrl } : {}),
        },
      });

      await this.auditLogService.logUserEvent(
        {
          organizationId,
          entityType: "action_assignment",
          entityId: id,
          parentEntityType: "action",
          parentEntityId: assignment.action_id,
          eventType: "assignment_state_changed",
          changedById: user.id,
          previousValue: {
            assignment_status: assignment.assignment_status,
          },
          newValue: {
            assignment_status: updatedAssignment.assignment_status,
            deliverable_count_submitted:
              updatedAssignment.deliverable_count_submitted,
          },
          metadataJson: {
            workflow_action: "submit",
            submitted_deliverable_ids: deliverables.map(
              (deliverable) => deliverable.id,
            ),
          },
        },
        tx,
      );

      return {
        assignment: updatedAssignment,
        deliverables,
      };
    });
  }

  async complete(
    organizationId: string,
    id: string,
    user: AuthenticatedUser,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const assignment = await tx.actionAssignment.findFirst({
        where: { id, organization_id: organizationId },
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

      if (!assignment) {
        throw new NotFoundException("Action assignment not found.");
      }

      const approvedDeliverables = assignment.deliverables.filter(
        (deliverable) => deliverable.status === DeliverableStatus.approved,
      );

      if (
        approvedDeliverables.length < assignment.deliverable_count_expected
      ) {
        throw new BadRequestException(
          "Assignment cannot complete until all expected deliverables are approved.",
        );
      }

      const approvedPostCount = approvedDeliverables.reduce(
        (total, deliverable) => total + deliverable.posts.length,
        0,
      );

      if (approvedPostCount < assignment.deliverable_count_expected) {
        throw new BadRequestException(
          "Assignment cannot complete until required posts have been recorded.",
        );
      }

      assertValidStateTransition(
        "action_assignment",
        assignment.assignment_status,
        AssignmentStatus.completed,
      );

      const updatedAssignment = await tx.actionAssignment.update({
        where: { id: assignment.id },
        data: {
          assignment_status: AssignmentStatus.completed,
          completion_date: new Date(),
        },
      });

      await this.auditLogService.logUserEvent(
        {
          organizationId: assignment.organization_id,
          entityType: "action_assignment",
          entityId: assignment.id,
          parentEntityType: "action",
          parentEntityId: assignment.action_id,
          eventType: "assignment_state_changed",
          changedById: user.id,
          previousValue: {
            assignment_status: assignment.assignment_status,
          },
          newValue: {
            assignment_status: updatedAssignment.assignment_status,
            completion_date: updatedAssignment.completion_date,
          },
          metadataJson: {
            workflow_action: "assignment_complete",
          },
        },
        tx,
      );

      return updatedAssignment;
    });
  }

  async approve(
    organizationId: string,
    id: string,
    user: AuthenticatedUser,
  ) {
    return this.transitionAssignmentStatus(
      organizationId,
      id,
      AssignmentStatus.completed,
      user,
      "assignment_approve",
      { completed_at: new Date(), completion_date: new Date() },
    );
  }

  async requestRevision(
    organizationId: string,
    id: string,
    user: AuthenticatedUser,
    reason: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const assignment = await tx.actionAssignment.findFirst({
        where: { id, organization_id: organizationId },
      });

      if (!assignment) {
        throw new NotFoundException("Action assignment not found.");
      }

      assertValidStateTransition(
        "action_assignment",
        assignment.assignment_status,
        AssignmentStatus.revision,
      );

      const updatedAssignment = await tx.actionAssignment.update({
        where: { id },
        data: {
          assignment_status: AssignmentStatus.revision,
          revision_reason: reason,
          revision_count: { increment: 1 },
        },
      });

      await this.auditLogService.logUserEvent(
        {
          organizationId,
          entityType: "action_assignment",
          entityId: id,
          parentEntityType: "action",
          parentEntityId: assignment.action_id,
          eventType: "assignment_state_changed",
          changedById: user.id,
          previousValue: {
            assignment_status: assignment.assignment_status,
          },
          newValue: {
            assignment_status: updatedAssignment.assignment_status,
            revision_count: updatedAssignment.revision_count,
            revision_reason: updatedAssignment.revision_reason,
          },
          metadataJson: {
            workflow_action: "request_revision",
            reason,
          },
        },
        tx,
      );

      return updatedAssignment;
    });
  }

  async findPendingReview(
    organizationId: string,
    campaignId?: string,
    page = 1,
    limit = 10,
  ) {
    const skip = (page - 1) * limit;

    const where: Prisma.ActionAssignmentWhereInput = {
      organization_id: organizationId,
      assignment_status: AssignmentStatus.submitted,
      ...(campaignId
        ? {
            action: {
              mission: {
                campaign_id: campaignId,
              },
            },
          }
        : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.actionAssignment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { submitted_at: "desc" },
        include: {
          action: {
            select: {
              id: true,
              title: true,
              mission: {
                select: {
                  campaign: {
                    select: { id: true, name: true },
                  },
                },
              },
            },
          },
          influencer: {
            select: { id: true, name: true },
          },
        },
      }),
      this.prisma.actionAssignment.count({ where }),
    ]);

    const data = rows.map((a) => ({
      id: a.id,
      action_id: a.action_id,
      action_title: a.action.title,
      campaign_id: a.action.mission?.campaign?.id ?? null,
      campaign_name: a.action.mission?.campaign?.name ?? null,
      influencer_id: a.influencer.id,
      influencer_name: a.influencer.name,
      submitted_at: a.submitted_at?.toISOString() ?? null,
    }));

    return buildPaginatedResponse(data, total, page, limit);
  }

  async decline(
    organizationId: string,
    id: string,
    influencerId: string,
  ) {
    const assignment = await this.prisma.actionAssignment.findFirst({
      where: {
        id,
        organization_id: organizationId,
        influencer_id: influencerId,
      },
    });

    if (!assignment) {
      throw new NotFoundException("Action assignment not found.");
    }

    assertValidStateTransition(
      "action_assignment",
      assignment.assignment_status,
      AssignmentStatus.declined,
    );

    return this.prisma.actionAssignment.update({
      where: { id },
      data: {
        assignment_status: AssignmentStatus.declined,
      },
    });
  }

  private async transitionAssignmentStatus(
    organizationId: string,
    id: string,
    nextStatus: AssignmentStatus,
    user: AuthenticatedUser,
    workflowAction: string,
    extraData?: Prisma.ActionAssignmentUpdateInput,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const assignment = await tx.actionAssignment.findFirst({
        where: { id, organization_id: organizationId },
      });

      if (!assignment) {
        throw new NotFoundException("Action assignment not found.");
      }

      assertValidStateTransition(
        "action_assignment",
        assignment.assignment_status,
        nextStatus,
      );

      const updatedAssignment = await tx.actionAssignment.update({
        where: { id: assignment.id },
        data: {
          assignment_status: nextStatus,
          ...extraData,
        },
      });

      await this.auditLogService.logUserEvent(
        {
          organizationId: assignment.organization_id,
          entityType: "action_assignment",
          entityId: assignment.id,
          parentEntityType: "action",
          parentEntityId: assignment.action_id,
          eventType: "assignment_state_changed",
          changedById: user.id,
          previousValue: {
            assignment_status: assignment.assignment_status,
          },
          newValue: {
            assignment_status: updatedAssignment.assignment_status,
            completion_date: updatedAssignment.completion_date,
          },
          metadataJson: {
            workflow_action: workflowAction,
          },
        },
        tx,
      );

      return updatedAssignment;
    });
  }

  private toJsonValue(value: unknown) {
    if (value === undefined) {
      return undefined;
    }

    if (value === null) {
      return Prisma.JsonNull;
    }

    return value as Prisma.InputJsonValue;
  }

  private buildActionSearchFilter(
    search?: string,
  ): Prisma.ActionAssignmentWhereInput {
    const normalizedSearch = search?.trim();
    if (!normalizedSearch) return {};

    return {
      OR: [
        { action: { title: { contains: normalizedSearch, mode: "insensitive" } } },
        { influencer: { name: { contains: normalizedSearch, mode: "insensitive" } } },
        { action: { mission: { campaign: { name: { contains: normalizedSearch, mode: "insensitive" } } } } },
        { action: { mission: { campaign: { company: { name: { contains: normalizedSearch, mode: "insensitive" } } } } } },
        { action: { mission: { campaign: { company: { client: { name: { contains: normalizedSearch, mode: "insensitive" } } } } } } },
      ],
    };
  }

  private readonly actionListInclude = {
    action: {
      select: {
        id: true,
        title: true,
        mission: {
          select: {
            campaign: {
              select: {
                id: true,
                name: true,
                company: {
                  select: {
                    name: true,
                    client: { select: { name: true } },
                  },
                },
              },
            },
          },
        },
      },
    },
    influencer: {
      select: { id: true, name: true },
    },
  } as const;

  private mapActionRow(a: {
    id: string;
    action_id: string;
    action: {
      title: string;
      mission?: { campaign?: { id?: string; name?: string; company?: { name?: string; client?: { name?: string } | null } | null } | null } | null;
    };
    influencer: { id: string; name: string };
    due_date?: Date | null;
  }) {
    return {
      id: a.id,
      action_id: a.action_id,
      action_title: a.action.title,
      campaign_id: a.action.mission?.campaign?.id ?? null,
      campaign_name: a.action.mission?.campaign?.name ?? null,
      client_name: a.action.mission?.campaign?.company?.client?.name ?? null,
      company_name: a.action.mission?.campaign?.company?.name ?? null,
      influencer_id: a.influencer.id,
      influencer_name: a.influencer.name,
      due_date: a.due_date?.toISOString() ?? null,
    };
  }

  async findUnratedPublished(
    organizationId: string,
    search?: string,
    page = 1,
    limit = 10,
  ) {
    const where: Prisma.ActionAssignmentWhereInput = {
      organization_id: organizationId,
      assignment_status: { in: ["submitted", "approved", "completed"] },
      influencer_ratings: { none: {} },
      ...this.buildActionSearchFilter(search),
    };

    const skip = (page - 1) * limit;

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.actionAssignment.findMany({
        where,
        include: this.actionListInclude,
        orderBy: { assigned_at: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.actionAssignment.count({ where }),
    ]);

    return {
      data: rows.map((a) => this.mapActionRow(a)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async findReviewed(
    organizationId: string,
    search?: string,
    page = 1,
    limit = 10,
  ) {
    const where: Prisma.ActionAssignmentWhereInput = {
      organization_id: organizationId,
      influencer_ratings: { some: {} },
      ...this.buildActionSearchFilter(search),
    };

    const skip = (page - 1) * limit;

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.actionAssignment.findMany({
        where,
        include: {
          ...this.actionListInclude,
          influencer_ratings: {
            select: {
              visual_quality_score: true,
              script_quality_score: true,
              overall_quality_score: true,
            },
          },
        },
        orderBy: { updated_at: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.actionAssignment.count({ where }),
    ]);

    const data = rows.map((a) => {
      const base = this.mapActionRow(a);
      let rating_average: number | null = null;

      for (const r of a.influencer_ratings) {
        if (
          r.visual_quality_score != null &&
          r.script_quality_score != null &&
          r.overall_quality_score != null
        ) {
          rating_average =
            Math.round(
              ((r.visual_quality_score +
                r.script_quality_score +
                r.overall_quality_score) /
                3) *
                10,
            ) / 10;
          break;
        }
      }

      return {
        ...base,
        rating_average,
        submission_url: (a as { submission_url?: string | null }).submission_url ?? null,
      };
    });

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async findOverdue(
    organizationId: string,
    search?: string,
    page = 1,
    limit = 10,
  ) {
    const now = new Date();
    const where: Prisma.ActionAssignmentWhereInput = {
      organization_id: organizationId,
      assignment_status: {
        in: ["assigned", "accepted", "in_progress"],
      },
      due_date: { lt: now },
      ...this.buildActionSearchFilter(search),
    };

    const skip = (page - 1) * limit;

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.actionAssignment.findMany({
        where,
        include: this.actionListInclude,
        orderBy: { due_date: "asc" },
        skip,
        take: limit,
      }),
      this.prisma.actionAssignment.count({ where }),
    ]);

    return {
      data: rows.map((a) => this.mapActionRow(a)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async findPlatformMismatches(organizationId: string, limit = 200) {
    const take = Math.min(Math.max(1, limit), 500);
    const assignments = await this.prisma.actionAssignment.findMany({
      where: { organization_id: organizationId },
      take,
      orderBy: { created_at: "desc" },
      include: {
        action: {
          select: {
            id: true,
            title: true,
            required_platforms: true,
            mission: {
              select: {
                campaign: {
                  select: { id: true, name: true },
                },
              },
            },
          },
        },
        influencer: {
          select: {
            id: true,
            name: true,
            url_instagram: true,
            url_tiktok: true,
            url_youtube: true,
            url_facebook: true,
            url_linkedin: true,
            url_x: true,
            url_threads: true,
          },
        },
      },
    });

    const mismatches: {
      assignment_id: string;
      influencer_id: string;
      influencer_name: string;
      action_id: string;
      action_title: string;
      campaign_name: string | null;
      required_platforms: string[];
      influencer_platforms: string[];
      missing_platforms: string[];
    }[] = [];

    for (const a of assignments) {
      const required = a.action.required_platforms ?? [];
      if (required.length === 0) continue;

      const infPlatforms = getInfluencerPlatforms(a.influencer);
      const hasMatch = required.some((p) => infPlatforms.includes(p));

      if (!hasMatch) {
        mismatches.push({
          assignment_id: a.id,
          influencer_id: a.influencer.id,
          influencer_name: a.influencer.name,
          action_id: a.action.id,
          action_title: a.action.title,
          campaign_name: a.action.mission?.campaign?.name ?? null,
          required_platforms: required,
          influencer_platforms: infPlatforms,
          missing_platforms: required.filter((p) => !infPlatforms.includes(p)),
        });
      }
    }

    return mismatches;
  }
}
