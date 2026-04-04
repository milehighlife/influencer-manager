import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { Prisma } from "@prisma/client";

import { assertValidStateTransition } from "../../common/utils/lifecycle.util";
import {
  buildPaginatedResponse,
  getPagination,
} from "../../common/utils/pagination.util";
import { PrismaService } from "../../database/prisma.service";
import { CreateActionDto } from "./dto/create-action.dto";
import { QueryActionsDto } from "./dto/query-actions.dto";
import { UpdateActionDto } from "./dto/update-action.dto";

@Injectable()
export class ActionsService {
  constructor(private readonly prisma: PrismaService) {}

  private async getMissionOrThrow(organizationId: string, missionId: string) {
    const mission = await this.prisma.mission.findFirst({
      where: { id: missionId, organization_id: organizationId },
    });

    if (!mission) {
      throw new NotFoundException("Mission not found.");
    }

    return mission;
  }

  private formatDateForError(value: Date | null) {
    return value ? value.toISOString().slice(0, 10) : "Not set";
  }

  private async validateActionWindow(params: {
    organizationId: string;
    missionId: string;
    actionId?: string;
    startWindow: Date | null;
    endWindow: Date | null;
  }) {
    const mission = await this.getMissionOrThrow(
      params.organizationId,
      params.missionId,
    );

    if (
      params.startWindow &&
      params.endWindow &&
      params.startWindow > params.endWindow
    ) {
      throw new BadRequestException(
        "Action start window must be on or before the action end window.",
      );
    }

    const missionStart = mission.start_date
      ? mission.start_date.toISOString().slice(0, 10)
      : null;
    const missionEnd = mission.end_date
      ? mission.end_date.toISOString().slice(0, 10)
      : null;
    const actionStart = params.startWindow
      ? params.startWindow.toISOString().slice(0, 10)
      : null;
    const actionEnd = params.endWindow
      ? params.endWindow.toISOString().slice(0, 10)
      : null;

    if (
      (missionStart && actionStart && actionStart < missionStart) ||
      (missionStart && actionEnd && actionEnd < missionStart) ||
      (missionEnd && actionStart && actionStart > missionEnd) ||
      (missionEnd && actionEnd && actionEnd > missionEnd)
    ) {
      throw new BadRequestException(
        `Action dates must stay within the parent mission window: ${this.formatDateForError(
          mission.start_date,
        )} to ${this.formatDateForError(mission.end_date)}.`,
      );
    }

  }

  async create(organizationId: string, dto: CreateActionDto) {
    const startWindow = dto.start_window ? new Date(dto.start_window) : null;
    const endWindow = dto.end_window ? new Date(dto.end_window) : null;

    await this.validateActionWindow({
      organizationId,
      missionId: dto.mission_id,
      startWindow,
      endWindow,
    });

    return this.prisma.action.create({
      data: {
        organization_id: organizationId,
        ...dto,
        start_window: startWindow ?? undefined,
        end_window: endWindow ?? undefined,
      },
    });
  }

  async createForMission(
    organizationId: string,
    missionId: string,
    dto: Omit<CreateActionDto, "mission_id">,
  ) {
    return this.create(organizationId, {
      ...dto,
      mission_id: missionId,
    });
  }

  async findAll(organizationId: string, query: QueryActionsDto) {
    const { page, limit, skip, take } = getPagination(query);
    const missionFilter: Prisma.MissionWhereInput = {
      ...(query.campaign_id ? { campaign_id: query.campaign_id } : {}),
      ...(query.company_id
        ? {
            campaign: {
              company_id: query.company_id,
            },
          }
        : {}),
    };

    const where: Prisma.ActionWhereInput = {
      organization_id: organizationId,
      ...(query.mission_id ? { mission_id: query.mission_id } : {}),
      ...(Object.keys(missionFilter).length > 0 ? { mission: missionFilter } : {}),
      ...(query.influencer_id
        ? {
            action_assignments: {
              some: {
                influencer_id: query.influencer_id,
              },
            },
          }
        : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.action.findMany({
        where,
        skip,
        take,
        orderBy: { created_at: "desc" },
      }),
      this.prisma.action.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, page, limit);
  }

  async findOne(organizationId: string, id: string) {
    const action = await this.prisma.action.findFirst({
      where: { id, organization_id: organizationId },
    });

    if (!action) {
      throw new NotFoundException("Action not found.");
    }

    return action;
  }

  async findByMission(organizationId: string, missionId: string) {
    await this.getMissionOrThrow(organizationId, missionId);

    return this.prisma.action.findMany({
      where: {
        organization_id: organizationId,
        mission_id: missionId,
      },
      orderBy: [{ start_window: "asc" }, { created_at: "asc" }],
      include: {
        _count: {
          select: {
            action_assignments: true,
          },
        },
      },
    });
  }

  async update(organizationId: string, id: string, dto: UpdateActionDto) {
    const existing = await this.findOne(organizationId, id);
    const missionId = dto.mission_id ?? existing.mission_id;
    const startWindow =
      dto.start_window !== undefined
        ? dto.start_window
          ? new Date(dto.start_window)
          : null
        : existing.start_window;
    const endWindow =
      dto.end_window !== undefined
        ? dto.end_window
          ? new Date(dto.end_window)
          : null
        : existing.end_window;

    if (dto.mission_id) {
      await this.getMissionOrThrow(organizationId, dto.mission_id);
    }

    if (dto.status) {
      assertValidStateTransition("action", existing.status, dto.status);
    }

    await this.validateActionWindow({
      organizationId,
      missionId,
      actionId: id,
      startWindow,
      endWindow,
    });

    return this.prisma.action.update({
      where: { id },
      data: {
        ...dto,
        start_window:
          dto.start_window !== undefined ? startWindow ?? null : undefined,
        end_window: dto.end_window !== undefined ? endWindow ?? null : undefined,
      },
    });
  }

  async remove(organizationId: string, id: string) {
    await this.findOne(organizationId, id);
    await this.prisma.action.delete({ where: { id } });

    return { id };
  }
}
