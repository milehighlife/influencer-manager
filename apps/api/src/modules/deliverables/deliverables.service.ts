import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  AssignmentStatus,
  DeliverableStatus,
  Prisma,
} from "@prisma/client";

import { AuditLogService } from "../../common/services/audit-log.service";
import type { AuthenticatedUser } from "../../common/utils/authenticated-user.interface";
import { assertValidStateTransition } from "../../common/utils/lifecycle.util";
import {
  buildPaginatedResponse,
  getPagination,
} from "../../common/utils/pagination.util";
import { PrismaService } from "../../database/prisma.service";
import { CreateDeliverableDto } from "./dto/create-deliverable.dto";
import { QueryDeliverablesDto } from "./dto/query-deliverables.dto";
import { RejectDeliverableDto } from "./dto/reject-deliverable.dto";
import { UpdateDeliverableDto } from "./dto/update-deliverable.dto";

@Injectable()
export class DeliverablesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  private static readonly ACTIVE_DELIVERABLE_STATUSES = [
    DeliverableStatus.submitted,
    DeliverableStatus.approved,
  ] as const;

  private async assertAssignmentExists(
    organizationId: string,
    actionAssignmentId: string,
  ) {
    const assignment = await this.prisma.actionAssignment.findFirst({
      where: { id: actionAssignmentId, organization_id: organizationId },
    });

    if (!assignment) {
      throw new NotFoundException("Action assignment not found.");
    }
  }

  async create(organizationId: string, dto: CreateDeliverableDto) {
    await this.assertAssignmentExists(organizationId, dto.action_assignment_id);

    return this.prisma.deliverable.create({
      data: {
        organization_id: organizationId,
        action_assignment_id: dto.action_assignment_id,
        deliverable_type: dto.deliverable_type,
        description: dto.description,
        submission_url: dto.submission_url,
        submission_metadata_json: this.toJsonValue(
          dto.submission_metadata_json,
        ),
        rejection_reason: dto.rejection_reason,
        status: dto.status,
        submitted_at: dto.submitted_at ? new Date(dto.submitted_at) : undefined,
        approved_at: dto.approved_at ? new Date(dto.approved_at) : undefined,
      } satisfies Prisma.DeliverableUncheckedCreateInput,
    });
  }

  async findAll(organizationId: string, query: QueryDeliverablesDto) {
    const { page, limit, skip, take } = getPagination(query);
    const where: Prisma.DeliverableWhereInput = {
      organization_id: organizationId,
      ...(query.action_assignment_id
        ? { action_assignment_id: query.action_assignment_id }
        : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.deliverable.findMany({
        where,
        skip,
        take,
        orderBy: { created_at: "desc" },
      }),
      this.prisma.deliverable.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, page, limit);
  }

  async findOne(organizationId: string, id: string) {
    const deliverable = await this.prisma.deliverable.findFirst({
      where: { id, organization_id: organizationId },
    });

    if (!deliverable) {
      throw new NotFoundException("Deliverable not found.");
    }

    return deliverable;
  }

  async update(organizationId: string, id: string, dto: UpdateDeliverableDto) {
    const existing = await this.findOne(organizationId, id);

    if (dto.action_assignment_id) {
      await this.assertAssignmentExists(organizationId, dto.action_assignment_id);
    }

    if (dto.status) {
      assertValidStateTransition("deliverable", existing.status, dto.status);
    }

    return this.prisma.deliverable.update({
      where: { id },
      data: {
        ...(dto.action_assignment_id
          ? { action_assignment_id: dto.action_assignment_id }
          : {}),
        ...(dto.deliverable_type
          ? { deliverable_type: dto.deliverable_type }
          : {}),
        ...(dto.description !== undefined
          ? { description: dto.description }
          : {}),
        ...(dto.submission_url !== undefined
          ? { submission_url: dto.submission_url }
          : {}),
        ...(dto.submission_metadata_json !== undefined
          ? {
              submission_metadata_json: this.toJsonValue(
                dto.submission_metadata_json,
              ),
            }
          : {}),
        ...(dto.rejection_reason !== undefined
          ? { rejection_reason: dto.rejection_reason }
          : {}),
        ...(dto.status ? { status: dto.status } : {}),
        ...(dto.submitted_at
          ? { submitted_at: new Date(dto.submitted_at) }
          : {}),
        ...(dto.approved_at ? { approved_at: new Date(dto.approved_at) } : {}),
      } satisfies Prisma.DeliverableUncheckedUpdateInput,
    });
  }

  async remove(organizationId: string, id: string) {
    await this.findOne(organizationId, id);
    await this.prisma.deliverable.delete({ where: { id } });

    return { id };
  }

  async approve(
    organizationId: string,
    id: string,
    user: AuthenticatedUser,
  ) {
    const deliverable = await this.prisma.deliverable.findFirst({
      where: {
        id,
        organization_id: organizationId,
      },
      include: {
        action_assignment: true,
      },
    });

    if (!deliverable) {
      throw new NotFoundException("Deliverable not found.");
    }

    if (deliverable.submitted_by_user_id === user.id) {
      throw new ForbiddenException(
        "Submitter cannot approve their own deliverable.",
      );
    }

    if (deliverable.action_assignment.assignment_status !== AssignmentStatus.submitted) {
      throw new BadRequestException(
        "Deliverable review requires the assignment to be in submitted status.",
      );
    }

    assertValidStateTransition(
      "deliverable",
      deliverable.status,
      DeliverableStatus.approved,
    );

    return this.prisma.$transaction(async (tx) => {
      const approvedAt = new Date();
      const updatedDeliverable = await tx.deliverable.update({
        where: { id },
        data: {
          status: DeliverableStatus.approved,
          approved_at: approvedAt,
          rejection_reason: null,
        },
      });

      const approvedCount = await tx.deliverable.count({
        where: {
          organization_id: organizationId,
          action_assignment_id: deliverable.action_assignment_id,
          status: DeliverableStatus.approved,
        },
      });

      const activeSubmittedCount = await tx.deliverable.count({
        where: {
          organization_id: organizationId,
          action_assignment_id: deliverable.action_assignment_id,
          status: {
            in: [...DeliverablesService.ACTIVE_DELIVERABLE_STATUSES],
          },
        },
      });

      let assignment = await tx.actionAssignment.update({
        where: { id: deliverable.action_assignment_id },
        data: {
          deliverable_count_submitted: activeSubmittedCount,
        },
      });

      await this.auditLogService.logUserEvent(
        {
          organizationId,
          entityType: "deliverable",
          entityId: deliverable.id,
          parentEntityType: "action_assignment",
          parentEntityId: deliverable.action_assignment_id,
          eventType: "deliverable_approved",
          changedById: user.id,
          previousValue: {
            status: deliverable.status,
          },
          newValue: {
            status: updatedDeliverable.status,
            approved_at: updatedDeliverable.approved_at,
          },
        },
        tx,
      );

      if (
        approvedCount >= deliverable.action_assignment.deliverable_count_expected &&
        deliverable.action_assignment.assignment_status === AssignmentStatus.submitted
      ) {
        assignment = await tx.actionAssignment.update({
          where: { id: deliverable.action_assignment_id },
          data: {
            assignment_status: AssignmentStatus.approved,
          },
        });

        await this.auditLogService.logUserEvent(
          {
            organizationId,
            entityType: "action_assignment",
            entityId: assignment.id,
            parentEntityType: "action",
            parentEntityId: assignment.action_id,
            eventType: "assignment_state_changed",
            changedById: user.id,
            previousValue: {
              assignment_status: deliverable.action_assignment.assignment_status,
            },
            newValue: {
              assignment_status: assignment.assignment_status,
            },
            metadataJson: {
              workflow_action: "deliverable_approve",
              deliverable_id: deliverable.id,
            },
          },
          tx,
        );
      }

      return {
        deliverable: updatedDeliverable,
        assignment,
      };
    });
  }

  async reject(
    organizationId: string,
    id: string,
    user: AuthenticatedUser,
    dto: RejectDeliverableDto,
  ) {
    const deliverable = await this.prisma.deliverable.findFirst({
      where: {
        id,
        organization_id: organizationId,
      },
      include: {
        action_assignment: true,
      },
    });

    if (!deliverable) {
      throw new NotFoundException("Deliverable not found.");
    }

    if (deliverable.submitted_by_user_id === user.id) {
      throw new ForbiddenException(
        "Submitter cannot reject their own deliverable.",
      );
    }

    if (deliverable.action_assignment.assignment_status !== AssignmentStatus.submitted) {
      throw new BadRequestException(
        "Deliverable review requires the assignment to be in submitted status.",
      );
    }

    assertValidStateTransition(
      "deliverable",
      deliverable.status,
      DeliverableStatus.rejected,
    );
    assertValidStateTransition(
      "action_assignment",
      deliverable.action_assignment.assignment_status,
      AssignmentStatus.rejected,
    );

    return this.prisma.$transaction(async (tx) => {
      const updatedDeliverable = await tx.deliverable.update({
        where: { id },
        data: {
          status: DeliverableStatus.rejected,
          approved_at: null,
          rejection_reason: dto.reason,
        },
      });

      const activeSubmittedCount = await tx.deliverable.count({
        where: {
          organization_id: organizationId,
          action_assignment_id: deliverable.action_assignment_id,
          status: {
            in: [...DeliverablesService.ACTIVE_DELIVERABLE_STATUSES],
          },
        },
      });

      const assignment = await tx.actionAssignment.update({
        where: { id: deliverable.action_assignment_id },
        data: {
          assignment_status: AssignmentStatus.rejected,
          deliverable_count_submitted: activeSubmittedCount,
        },
      });

      await this.auditLogService.logUserEvent(
        {
          organizationId,
          entityType: "deliverable",
          entityId: deliverable.id,
          parentEntityType: "action_assignment",
          parentEntityId: deliverable.action_assignment_id,
          eventType: "deliverable_rejected",
          changedById: user.id,
          previousValue: {
            status: deliverable.status,
          },
          newValue: {
            status: updatedDeliverable.status,
          },
          reason: dto.reason,
        },
        tx,
      );

      await this.auditLogService.logUserEvent(
        {
          organizationId,
          entityType: "action_assignment",
          entityId: assignment.id,
          parentEntityType: "action",
          parentEntityId: assignment.action_id,
          eventType: "assignment_state_changed",
          changedById: user.id,
          previousValue: {
            assignment_status: deliverable.action_assignment.assignment_status,
          },
          newValue: {
            assignment_status: assignment.assignment_status,
          },
          reason: dto.reason,
          metadataJson: {
            workflow_action: "deliverable_reject",
            deliverable_id: deliverable.id,
          },
        },
        tx,
      );

      return {
        deliverable: updatedDeliverable,
        assignment,
      };
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
