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
import { CreateCampaignDto } from "./dto/create-campaign.dto";
import { QueryCampaignsDto } from "./dto/query-campaigns.dto";
import { UpdateCampaignDto } from "./dto/update-campaign.dto";

interface PlannerMissionStats {
  mission_count: number;
  scheduled_mission_count: number;
  partial_mission_count: number;
  unscheduled_mission_count: number;
}

type PlannerSortField = NonNullable<QueryCampaignsDto["sort_by"]>;
type PlannerSortDirection = NonNullable<QueryCampaignsDto["sort_direction"]>;
type PlannerScheduleState = NonNullable<QueryCampaignsDto["schedule_state"]>;

@Injectable()
export class CampaignsService {
  constructor(private readonly prisma: PrismaService) {}

  private formatDateForError(value: Date | null) {
    return value ? value.toISOString().slice(0, 10) : "Not set";
  }

  private parseDateInput(value: string | null | undefined) {
    if (value === undefined) {
      return undefined;
    }

    if (value === null) {
      return null;
    }

    return new Date(value);
  }

  private async validateCampaignSchedule(params: {
    organizationId: string;
    campaignId?: string;
    startDate: Date | null;
    endDate: Date | null;
  }) {
    if (params.startDate && params.endDate && params.startDate > params.endDate) {
      throw new BadRequestException(
        "Campaign start date must be on or before the campaign end date.",
      );
    }

    if (!params.campaignId) {
      return;
    }

    const missions = await this.prisma.mission.findMany({
      where: {
        organization_id: params.organizationId,
        campaign_id: params.campaignId,
      },
      select: {
        id: true,
        name: true,
        start_date: true,
        end_date: true,
      },
    });

    for (const mission of missions) {
      const startsBeforeCampaign =
        params.startDate &&
        ((mission.start_date && mission.start_date < params.startDate) ||
          (mission.end_date && mission.end_date < params.startDate));
      const endsAfterCampaign =
        params.endDate &&
        ((mission.start_date && mission.start_date > params.endDate) ||
          (mission.end_date && mission.end_date > params.endDate));

      if (startsBeforeCampaign || endsAfterCampaign) {
        throw new BadRequestException(
          `Campaign dates must include mission "${mission.name}" from ${this.formatDateForError(
            mission.start_date,
          )} to ${this.formatDateForError(mission.end_date)}.`,
        );
      }
    }
  }

  private buildCampaignWhere(
    organizationId: string,
    query: QueryCampaignsDto,
    options?: { includeSearch?: boolean; includeScheduleState?: boolean },
  ): Prisma.CampaignWhereInput {
    const filters: Prisma.CampaignWhereInput[] = [];
    const normalizedSearch = options?.includeSearch ? query.search?.trim() : undefined;
    const scheduleState = options?.includeScheduleState
      ? query.schedule_state
      : undefined;

    if (query.company_id) {
      filters.push({ company_id: query.company_id });
    }

    if (query.client_id) {
      filters.push({
        company: {
          is: {
            client_id: query.client_id,
          },
        },
      });
    }

    if (query.status) {
      filters.push({ status: query.status });
    }

    if (scheduleState) {
      filters.push(this.getPlannerScheduleStateWhere(scheduleState));
    }

    if (normalizedSearch) {
      filters.push({
        OR: [
          {
            name: {
              contains: normalizedSearch,
              mode: "insensitive",
            },
          },
          {
            company: {
              is: {
                name: {
                  contains: normalizedSearch,
                  mode: "insensitive",
                },
              },
            },
          },
          {
            company: {
              is: {
                client: {
                  is: {
                    name: {
                      contains: normalizedSearch,
                      mode: "insensitive",
                    },
                  },
                },
              },
            },
          },
        ],
      });
    }

    return {
      organization_id: organizationId,
      ...(filters.length > 0 ? { AND: filters } : {}),
    };
  }

  private getPlannerScheduleStateWhere(
    scheduleState: PlannerScheduleState,
  ): Prisma.CampaignWhereInput {
    const fullyScheduledMissionWhere: Prisma.MissionWhereInput = {
      start_date: { not: null },
      end_date: { not: null },
    };
    const fullyUnscheduledMissionWhere: Prisma.MissionWhereInput = {
      start_date: null,
      end_date: null,
    };

    switch (scheduleState) {
      case "scheduled":
        return {
          missions: {
            some: {},
            every: fullyScheduledMissionWhere,
          },
        };
      case "unscheduled":
        return {
          OR: [
            {
              missions: {
                none: {},
              },
            },
            {
              missions: {
                some: {},
                every: fullyUnscheduledMissionWhere,
              },
            },
          ],
        };
      case "partial":
      default:
        return {
          AND: [
            {
              missions: {
                some: {},
              },
            },
            {
              NOT: {
                missions: {
                  some: {},
                  every: fullyScheduledMissionWhere,
                },
              },
            },
            {
              NOT: {
                missions: {
                  some: {},
                  every: fullyUnscheduledMissionWhere,
                },
              },
            },
          ],
        };
    }
  }

  private getPlannerOrderBy(
    sortBy: PlannerSortField = "updated_at",
    sortDirection: PlannerSortDirection = "desc",
  ): Prisma.CampaignOrderByWithRelationInput[] {
    switch (sortBy) {
      case "name":
        return [
          { name: sortDirection },
          { updated_at: "desc" },
          { id: "asc" },
        ];
      case "status":
        return [
          { status: sortDirection },
          { updated_at: "desc" },
          { id: "asc" },
        ];
      case "created_at":
        return [
          { created_at: sortDirection },
          { id: "asc" },
        ];
      case "start_date":
        return [
          { start_date: sortDirection },
          { updated_at: "desc" },
          { id: "asc" },
        ];
      case "end_date":
        return [
          { end_date: sortDirection },
          { updated_at: "desc" },
          { id: "asc" },
        ];
      case "updated_at":
      default:
        return [
          { updated_at: sortDirection },
          { id: "asc" },
        ];
    }
  }

  private async assertCompanyExists(organizationId: string, companyId: string) {
    const company = await this.prisma.company.findFirst({
      where: { id: companyId, organization_id: organizationId },
    });

    if (!company) {
      throw new NotFoundException("Company not found.");
    }
  }

  async create(organizationId: string, dto: CreateCampaignDto) {
    await this.assertCompanyExists(organizationId, dto.company_id);
    const startDate = dto.start_date ? new Date(dto.start_date) : null;
    const endDate = dto.end_date ? new Date(dto.end_date) : null;

    await this.validateCampaignSchedule({
      organizationId,
      startDate,
      endDate,
    });

    return this.prisma.campaign.create({
      data: {
        organization_id: organizationId,
        ...dto,
        start_date: startDate ?? undefined,
        end_date: endDate ?? undefined,
      },
    });
  }

  async createUnderCompany(
    organizationId: string,
    companyId: string,
    dto: Omit<CreateCampaignDto, "company_id">,
  ) {
    return this.create(organizationId, {
      ...dto,
      company_id: companyId,
    });
  }

  async findAll(organizationId: string, query: QueryCampaignsDto) {
    const { page, limit, skip, take } = getPagination(query);
    const where = this.buildCampaignWhere(organizationId, query);

    const [data, total] = await this.prisma.$transaction([
      this.prisma.campaign.findMany({
        where,
        skip,
        take,
        orderBy: { created_at: "desc" },
      }),
      this.prisma.campaign.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, page, limit);
  }

  async findPlannerList(organizationId: string, query: QueryCampaignsDto) {
    const { page, limit, skip, take } = getPagination(query);
    const where = this.buildCampaignWhere(organizationId, query, {
      includeSearch: true,
      includeScheduleState: true,
    });
    const orderBy = this.getPlannerOrderBy(
      query.sort_by ?? "updated_at",
      query.sort_direction ?? "desc",
    );

    const [campaigns, total] = await this.prisma.$transaction([
      this.prisma.campaign.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          company: {
            select: {
              id: true,
              name: true,
              client_id: true,
              client: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.campaign.count({ where }),
    ]);

    const campaignIds = campaigns.map((campaign) => campaign.id);
    const missionStats = new Map<string, PlannerMissionStats>();

    if (campaignIds.length > 0) {
      const missions = await this.prisma.mission.findMany({
        where: {
          organization_id: organizationId,
          campaign_id: {
            in: campaignIds,
          },
        },
        select: {
          campaign_id: true,
          start_date: true,
          end_date: true,
        },
      });

      for (const mission of missions) {
        const current = missionStats.get(mission.campaign_id) ?? {
          mission_count: 0,
          scheduled_mission_count: 0,
          partial_mission_count: 0,
          unscheduled_mission_count: 0,
        };

        current.mission_count += 1;

        if (mission.start_date && mission.end_date) {
          current.scheduled_mission_count += 1;
        } else if (mission.start_date || mission.end_date) {
          current.partial_mission_count += 1;
        } else {
          current.unscheduled_mission_count += 1;
        }

        missionStats.set(mission.campaign_id, current);
      }
    }

    const data = campaigns.map((campaign) => {
      const stats = missionStats.get(campaign.id) ?? {
        mission_count: 0,
        scheduled_mission_count: 0,
        partial_mission_count: 0,
        unscheduled_mission_count: 0,
      };

      return {
        id: campaign.id,
        company_id: campaign.company_id,
        name: campaign.name,
        start_date: campaign.start_date,
        end_date: campaign.end_date,
        status: campaign.status,
        created_at: campaign.created_at,
        updated_at: campaign.updated_at,
        company: {
          id: campaign.company.id,
          name: campaign.company.name,
          client_id: campaign.company.client_id,
          client_name: campaign.company.client?.name ?? null,
        },
        ...stats,
      };
    });

    return buildPaginatedResponse(data, total, page, limit);
  }

  async findOne(organizationId: string, id: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, organization_id: organizationId },
    });

    if (!campaign) {
      throw new NotFoundException("Campaign not found.");
    }

    return campaign;
  }

  async getPlanningView(organizationId: string, id: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: {
        id,
        organization_id: organizationId,
      },
      include: {
        company: {
          select: {
            id: true,
            client_id: true,
            name: true,
            description: true,
            status: true,
            created_at: true,
            updated_at: true,
          },
        },
        missions: {
          orderBy: [{ sequence_order: "asc" }, { created_at: "asc" }],
          include: {
            actions: {
              orderBy: [{ start_window: "asc" }, { created_at: "asc" }],
              include: {
                action_assignments: {
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
                },
              },
            },
          },
        },
      },
    });

    if (!campaign) {
      throw new NotFoundException("Campaign not found.");
    }

    return {
      ...campaign,
      missions: campaign.missions.map((mission) => ({
        ...mission,
        actions: mission.actions.map((action) => {
          const { action_assignments, ...actionData } = action;

          return {
            ...actionData,
            assignments: action_assignments.map((assignment) => {
              const { influencer, ...assignmentData } = assignment;

              return {
                ...assignmentData,
                influencer_summary: influencer,
              };
            }),
          };
        }),
      })),
    };
  }

  async update(organizationId: string, id: string, dto: UpdateCampaignDto) {
    const existing = await this.findOne(organizationId, id);
    const startDate =
      dto.start_date !== undefined
        ? this.parseDateInput(dto.start_date)
        : existing.start_date;
    const endDate =
      dto.end_date !== undefined
        ? this.parseDateInput(dto.end_date)
        : existing.end_date;

    if (dto.company_id) {
      await this.assertCompanyExists(organizationId, dto.company_id);
    }

    if (dto.status) {
      assertValidStateTransition("campaign", existing.status, dto.status);
    }

    await this.validateCampaignSchedule({
      organizationId,
      campaignId: id,
      startDate: startDate ?? null,
      endDate: endDate ?? null,
    });

    return this.prisma.campaign.update({
      where: { id },
      data: {
        ...dto,
        start_date:
          dto.start_date !== undefined ? startDate ?? null : undefined,
        end_date: dto.end_date !== undefined ? endDate ?? null : undefined,
      },
    });
  }

  async remove(organizationId: string, id: string) {
    await this.findOne(organizationId, id);
    await this.prisma.campaign.delete({ where: { id } });

    return { id };
  }
}
