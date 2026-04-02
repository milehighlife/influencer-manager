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

    if (dto.assignment_status) {
      assertValidStateTransition(
        "action_assignment",
        existing.assignment_status,
        dto.assignment_status,
      );
    }

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
    const assignment = await this.findOne(organizationId, id);

    return this.transitionAssignmentStatus(
      assignment,
      AssignmentStatus.accepted,
      user,
      "assignment_accept",
    );
  }

  async start(
    organizationId: string,
    id: string,
    user: AuthenticatedUser,
  ) {
    const assignment = await this.findOne(organizationId, id);

    return this.transitionAssignmentStatus(
      assignment,
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
    const assignment = await this.findOne(organizationId, id);
    assertValidStateTransition(
      "action_assignment",
      assignment.assignment_status,
      AssignmentStatus.submitted,
    );

    return this.prisma.$transaction(async (tx) => {
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

      const updatedAssignment = await tx.actionAssignment.update({
        where: { id },
        data: {
          assignment_status: AssignmentStatus.submitted,
          deliverable_count_submitted: nextSubmittedCount,
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
    const assignment = await this.prisma.actionAssignment.findFirst({
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

    return this.transitionAssignmentStatus(
      assignment,
      AssignmentStatus.completed,
      user,
      "assignment_complete",
      {
        completion_date: new Date(),
      },
    );
  }

  private async transitionAssignmentStatus(
    assignment: {
      id: string;
      organization_id: string;
      action_id: string;
      assignment_status: AssignmentStatus;
    },
    nextStatus: AssignmentStatus,
    user: AuthenticatedUser,
    workflowAction: string,
    extraData?: Prisma.ActionAssignmentUpdateInput,
  ) {
    assertValidStateTransition(
      "action_assignment",
      assignment.assignment_status,
      nextStatus,
    );

    return this.prisma.$transaction(async (tx) => {
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
}
