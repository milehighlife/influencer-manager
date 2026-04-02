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
import { CreateMissionDto } from "./dto/create-mission.dto";
import { QueryMissionsDto } from "./dto/query-missions.dto";
import { UpdateMissionDto } from "./dto/update-mission.dto";

@Injectable()
export class MissionsService {
  constructor(private readonly prisma: PrismaService) {}

  private parseDateInput(value: string | null | undefined) {
    if (value === undefined) {
      return undefined;
    }

    if (value === null) {
      return null;
    }

    return new Date(value);
  }

  private async getCampaignOrThrow(organizationId: string, campaignId: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id: campaignId, organization_id: organizationId },
    });

    if (!campaign) {
      throw new NotFoundException("Campaign not found.");
    }

    return campaign;
  }

  private formatDateForError(value: Date | null) {
    return value ? value.toISOString().slice(0, 10) : "Not set";
  }

  private async validateMissionSchedule(params: {
    organizationId: string;
    campaignId: string;
    missionId?: string;
    sequenceOrder: number;
    startDate: Date | null;
    endDate: Date | null;
  }) {
    const campaign = await this.getCampaignOrThrow(
      params.organizationId,
      params.campaignId,
    );

    if (params.startDate && params.endDate && params.startDate > params.endDate) {
      throw new BadRequestException(
        "Mission start date must be on or before the mission end date.",
      );
    }

    if (
      (campaign.start_date &&
        ((params.startDate && params.startDate < campaign.start_date) ||
          (params.endDate && params.endDate < campaign.start_date))) ||
      (campaign.end_date &&
        ((params.startDate && params.startDate > campaign.end_date) ||
          (params.endDate && params.endDate > campaign.end_date)))
    ) {
      throw new BadRequestException(
        "Mission dates must stay within the campaign date window.",
      );
    }

    if (!params.startDate || !params.endDate) {
      return;
    }

    const siblingMissions = await this.prisma.mission.findMany({
      where: {
        organization_id: params.organizationId,
        campaign_id: params.campaignId,
        ...(params.missionId ? { NOT: { id: params.missionId } } : {}),
      },
      orderBy: [{ sequence_order: "asc" }, { created_at: "asc" }],
    });

    for (const sibling of siblingMissions) {
      const siblingStart = sibling.start_date;
      const siblingEnd = sibling.end_date;

      if (siblingStart && siblingEnd) {
        const overlaps =
          params.startDate < siblingEnd && params.endDate > siblingStart;
        if (overlaps) {
          throw new BadRequestException(
            `Mission dates overlap with "${sibling.name}" from ${this.formatDateForError(
              siblingStart,
            )} to ${this.formatDateForError(siblingEnd)}.`,
          );
        }
      }

      if (
        sibling.sequence_order < params.sequenceOrder &&
        siblingEnd &&
        params.startDate < siblingEnd
      ) {
        throw new BadRequestException(
          `Mission sequence conflicts with "${sibling.name}". Later missions cannot start before earlier missions end.`,
        );
      }

      if (
        sibling.sequence_order > params.sequenceOrder &&
        siblingStart &&
        params.endDate > siblingStart
      ) {
        throw new BadRequestException(
          `Mission sequence conflicts with "${sibling.name}". Earlier missions must finish before later missions begin.`,
        );
      }
    }
  }

  async create(organizationId: string, dto: CreateMissionDto) {
    await this.validateMissionSchedule({
      organizationId,
      campaignId: dto.campaign_id,
      sequenceOrder: dto.sequence_order,
      startDate: dto.start_date ? new Date(dto.start_date) : null,
      endDate: dto.end_date ? new Date(dto.end_date) : null,
    });

    return this.prisma.mission.create({
      data: {
        organization_id: organizationId,
        ...dto,
        start_date: dto.start_date ? new Date(dto.start_date) : undefined,
        end_date: dto.end_date ? new Date(dto.end_date) : undefined,
      },
    });
  }

  async createForCampaign(
    organizationId: string,
    campaignId: string,
    dto: Omit<CreateMissionDto, "campaign_id">,
  ) {
    return this.create(organizationId, {
      ...dto,
      campaign_id: campaignId,
    });
  }

  async findAll(organizationId: string, query: QueryMissionsDto) {
    const { page, limit, skip, take } = getPagination(query);
    const where: Prisma.MissionWhereInput = {
      organization_id: organizationId,
      ...(query.campaign_id ? { campaign_id: query.campaign_id } : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.mission.findMany({
        where,
        skip,
        take,
        orderBy: [{ campaign_id: "asc" }, { sequence_order: "asc" }],
      }),
      this.prisma.mission.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, page, limit);
  }

  async findOne(organizationId: string, id: string) {
    const mission = await this.prisma.mission.findFirst({
      where: { id, organization_id: organizationId },
    });

    if (!mission) {
      throw new NotFoundException("Mission not found.");
    }

    return mission;
  }

  async update(organizationId: string, id: string, dto: UpdateMissionDto) {
    const existing = await this.findOne(organizationId, id);
    const campaignId = dto.campaign_id ?? existing.campaign_id;
    const sequenceOrder = dto.sequence_order ?? existing.sequence_order;
    const startDate =
      dto.start_date !== undefined
        ? dto.start_date
          ? new Date(dto.start_date)
          : null
        : existing.start_date;
    const endDate =
      dto.end_date !== undefined
        ? dto.end_date
          ? new Date(dto.end_date)
          : null
        : existing.end_date;

    if (dto.campaign_id) {
      await this.getCampaignOrThrow(organizationId, dto.campaign_id);
    }

    if (dto.status) {
      assertValidStateTransition("mission", existing.status, dto.status);
    }

    await this.validateMissionSchedule({
      organizationId,
      campaignId,
      missionId: id,
      sequenceOrder,
      startDate,
      endDate,
    });

    return this.prisma.mission.update({
      where: { id },
      data: {
        ...dto,
        start_date:
          dto.start_date !== undefined
            ? this.parseDateInput(dto.start_date) ?? null
            : undefined,
        end_date:
          dto.end_date !== undefined
            ? this.parseDateInput(dto.end_date) ?? null
            : undefined,
      },
    });
  }

  async remove(organizationId: string, id: string) {
    await this.findOne(organizationId, id);
    await this.prisma.mission.delete({ where: { id } });

    return { id };
  }
}
