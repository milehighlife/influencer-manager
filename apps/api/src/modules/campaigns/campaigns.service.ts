import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import type { Prisma } from "@prisma/client";

import { AuditLogService } from "../../common/services/audit-log.service";
import { assertValidStateTransition } from "../../common/utils/lifecycle.util";
import {
  buildPaginatedResponse,
  getPagination,
} from "../../common/utils/pagination.util";
import { PrismaService } from "../../database/prisma.service";
import { CreateCampaignDto } from "./dto/create-campaign.dto";
import { QueryCampaignsDto } from "./dto/query-campaigns.dto";
import { UpdateCampaignDto } from "./dto/update-campaign.dto";

export interface CascadePreview {
  missions_to_complete: number;
  actions_to_complete: number;
  assignments_to_close: number;
  influencers_to_notify: number;
  actions_with_media_in_progress: number;
  actions_without_media: number;
}

export interface CascadeResult {
  campaign_id: string;
  missions_updated: number;
  actions_updated: number;
  assignments_updated: number;
  influencers_notified: string[];
}

interface PlannerMissionStats {
  mission_count: number;
  scheduled_mission_count: number;
  partial_mission_count: number;
  unscheduled_mission_count: number;
}

type PlannerSortField = NonNullable<QueryCampaignsDto["sort_by"]>;
type PlannerSortDirection = NonNullable<QueryCampaignsDto["sort_direction"]>;
type PlannerScheduleState = NonNullable<QueryCampaignsDto["schedule_state"]>;

/** Statuses that are considered "terminal" and should not be cascade-completed. */
const TERMINAL_MISSION_STATUSES = ["completed"] as const;
const TERMINAL_ACTION_STATUSES = ["completed"] as const;
const TERMINAL_ASSIGNMENT_STATUSES = [
  "completed",
  "completed_by_cascade",
] as const;

@Injectable()
export class CampaignsService {
  private readonly logger = new Logger(CampaignsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

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

    if (query.statuses) {
      const statusList = query.statuses
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s) as Array<typeof query.status & string>;
      if (statusList.length > 0) {
        filters.push({ status: { in: statusList } });
      }
    } else if (query.status) {
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
      case "company_name":
        return [
          { company: { name: sortDirection } },
          { updated_at: "desc" },
          { id: "asc" },
        ];
      case "client_name":
        return [
          { company: { client: { name: sortDirection } } },
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

  async getStatusCounts(organizationId: string) {
    const groups = await this.prisma.campaign.groupBy({
      by: ["status"],
      where: { organization_id: organizationId },
      _count: { status: true },
    });

    const counts: Record<string, number> = {};
    for (const group of groups) {
      counts[group.status] = group._count.status;
    }

    return counts;
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

      // Warn if reverting from completed — cascade is NOT automatically undone
      if (existing.status === "completed" && dto.status !== "completed") {
        this.logger.warn(
          `Campaign ${id} moved from "completed" back to "${dto.status}". ` +
            `Cascade-completed missions/actions/assignments were NOT reverted.`,
        );
      }
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

  // ---------------------------------------------------------------------------
  // Cascade completion
  // ---------------------------------------------------------------------------

  /**
   * Builds the set of records that would be affected by a cascade completion.
   * Shared between preview (read-only) and execute (write) paths.
   */
  private async buildCascadeScope(
    organizationId: string,
    campaignId: string,
  ) {
    // Missions that are not yet completed
    const incompleteMissions = await this.prisma.mission.findMany({
      where: {
        organization_id: organizationId,
        campaign_id: campaignId,
        status: { notIn: [...TERMINAL_MISSION_STATUSES] },
      },
      select: {
        id: true,
        status: true,
        actions: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    // All actions for the campaign (including already-completed missions)
    // to determine which missions completed naturally
    const allMissions = await this.prisma.mission.findMany({
      where: {
        organization_id: organizationId,
        campaign_id: campaignId,
      },
      select: {
        id: true,
        status: true,
        actions: {
          select: { id: true, status: true },
        },
      },
    });

    // Actions that need cascade-completing
    const incompleteActionIds: string[] = [];
    for (const mission of incompleteMissions) {
      for (const action of mission.actions) {
        if (!TERMINAL_ACTION_STATUSES.includes(action.status as typeof TERMINAL_ACTION_STATUSES[number])) {
          incompleteActionIds.push(action.id);
        }
      }
    }

    // Missions where ALL actions were already completed before the cascade
    const naturallyCompletedMissionIds = new Set<string>();
    for (const mission of incompleteMissions) {
      const allActionsAlreadyCompleted = mission.actions.length > 0 &&
        mission.actions.every((a) =>
          TERMINAL_ACTION_STATUSES.includes(a.status as typeof TERMINAL_ACTION_STATUSES[number]),
        );
      if (allActionsAlreadyCompleted) {
        naturallyCompletedMissionIds.add(mission.id);
      }
    }

    // All action IDs in the campaign (for assignment lookup)
    const allCampaignActionIds = allMissions.flatMap((m) =>
      m.actions.map((a) => a.id),
    );

    // Assignments that need closing
    const incompleteAssignments = await this.prisma.actionAssignment.findMany({
      where: {
        organization_id: organizationId,
        action_id: { in: allCampaignActionIds.length > 0 ? allCampaignActionIds : ["__none__"] },
        assignment_status: { notIn: [...TERMINAL_ASSIGNMENT_STATUSES] },
      },
      select: {
        id: true,
        influencer_id: true,
        action_id: true,
        assignment_status: true,
        deliverables: {
          where: { status: "submitted" },
          select: { id: true },
        },
      },
    });

    // Actions with media = assignments that have at least one submitted deliverable
    const actionIdsWithMedia = new Set<string>();
    for (const assignment of incompleteAssignments) {
      if (assignment.deliverables.length > 0) {
        actionIdsWithMedia.add(assignment.action_id);
      }
    }

    // Count actions with submitted media that are being cascade-completed
    const actionsWithMediaInProgress = incompleteActionIds.filter((id) =>
      actionIdsWithMedia.has(id),
    ).length;

    // Actions without any media submission
    const actionsWithoutMedia = incompleteActionIds.length - actionsWithMediaInProgress;

    // Unique influencers to notify
    const uniqueInfluencerIds = [
      ...new Set(incompleteAssignments.map((a) => a.influencer_id)),
    ];

    return {
      incompleteMissions,
      incompleteActionIds,
      naturallyCompletedMissionIds,
      incompleteAssignments,
      actionsWithMediaInProgress,
      actionsWithoutMedia,
      uniqueInfluencerIds,
    };
  }

  async getCascadePreview(
    organizationId: string,
    campaignId: string,
  ): Promise<CascadePreview> {
    await this.findOne(organizationId, campaignId);

    const scope = await this.buildCascadeScope(organizationId, campaignId);

    return {
      missions_to_complete: scope.incompleteMissions.length,
      actions_to_complete: scope.incompleteActionIds.length,
      assignments_to_close: scope.incompleteAssignments.length,
      influencers_to_notify: scope.uniqueInfluencerIds.length,
      actions_with_media_in_progress: scope.actionsWithMediaInProgress,
      actions_without_media: scope.actionsWithoutMedia,
    };
  }

  async completeCampaignWithCascade(
    organizationId: string,
    campaignId: string,
    userId: string,
    expectedVersion: number,
  ): Promise<CascadeResult> {
    const existing = await this.findOne(organizationId, campaignId);
    assertValidStateTransition("campaign", existing.status, "completed");

    // Optimistic locking: check version matches
    if (existing.version !== expectedVersion) {
      throw new ConflictException(
        "This campaign was modified by another user. Please refresh and try again.",
      );
    }

    const scope = await this.buildCascadeScope(organizationId, campaignId);

    // If nothing to cascade, just update the campaign status directly
    if (
      scope.incompleteMissions.length === 0 &&
      scope.incompleteActionIds.length === 0 &&
      scope.incompleteAssignments.length === 0
    ) {
      await this.prisma.campaign.update({
        where: { id: campaignId },
        data: {
          status: "completed",
          version: { increment: 1 },
        },
      });

      this.logger.log(
        `Campaign ${campaignId}: nothing to cascade, status updated to completed.`,
      );

      return {
        campaign_id: campaignId,
        missions_updated: 0,
        actions_updated: 0,
        assignments_updated: 0,
        influencers_notified: [],
      };
    }

    const now = new Date();

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Update campaign status with optimistic lock
      const updatedCampaign = await tx.campaign.updateMany({
        where: { id: campaignId, version: expectedVersion },
        data: {
          status: "completed",
          version: { increment: 1 },
        },
      });

      if (updatedCampaign.count === 0) {
        throw new ConflictException(
          "This campaign was modified by another user. Please refresh and try again.",
        );
      }

      // 2. Cascade-complete missions
      const missionIdsToAutoComplete = scope.incompleteMissions
        .filter((m) => !scope.naturallyCompletedMissionIds.has(m.id))
        .map((m) => m.id);

      const naturalMissionIds = scope.incompleteMissions
        .filter((m) => scope.naturallyCompletedMissionIds.has(m.id))
        .map((m) => m.id);

      // Auto-completed missions
      if (missionIdsToAutoComplete.length > 0) {
        await tx.mission.updateMany({
          where: { id: { in: missionIdsToAutoComplete } },
          data: {
            status: "completed",
            auto_completed: true,
            auto_completed_at: now,
          },
        });
      }

      // Naturally completed missions (all actions were already done)
      if (naturalMissionIds.length > 0) {
        await tx.mission.updateMany({
          where: { id: { in: naturalMissionIds } },
          data: {
            status: "completed",
            auto_completed: false,
          },
        });
      }

      // 3. Cascade-complete actions
      if (scope.incompleteActionIds.length > 0) {
        await tx.action.updateMany({
          where: { id: { in: scope.incompleteActionIds } },
          data: {
            status: "completed",
            auto_completed: true,
            auto_completed_at: now,
          },
        });
      }

      // 4. Cascade-close assignments
      if (scope.incompleteAssignments.length > 0) {
        const assignmentIds = scope.incompleteAssignments.map((a) => a.id);

        await tx.actionAssignment.updateMany({
          where: { id: { in: assignmentIds } },
          data: {
            assignment_status: "completed_by_cascade",
            cascade_reason: "campaign_completed",
            completion_date: now,
          },
        });
      }

      // 5. Audit log
      await this.auditLogService.logUserEvent(
        {
          organizationId,
          entityType: "campaign",
          entityId: campaignId,
          eventType: "cascade_completion",
          changedById: userId,
          previousValue: { status: existing.status },
          newValue: { status: "completed" },
          metadataJson: {
            missions_updated:
              missionIdsToAutoComplete.length + naturalMissionIds.length,
            actions_updated: scope.incompleteActionIds.length,
            assignments_updated: scope.incompleteAssignments.length,
            influencers_affected: scope.uniqueInfluencerIds.length,
          },
        },
        tx,
      );

      return {
        campaign_id: campaignId,
        missions_updated:
          missionIdsToAutoComplete.length + naturalMissionIds.length,
        actions_updated: scope.incompleteActionIds.length,
        assignments_updated: scope.incompleteAssignments.length,
        influencers_notified: scope.uniqueInfluencerIds,
      };
    });

    this.logger.log(
      `Campaign ${campaignId} cascade completed: ` +
        `${result.missions_updated} missions, ` +
        `${result.actions_updated} actions, ` +
        `${result.assignments_updated} assignments updated.`,
    );

    // Notifications would go here (outside transaction so failures don't roll back).
    // Currently no notification system exists — log the intent for future implementation.
    if (result.influencers_notified.length > 0) {
      this.logger.log(
        `Campaign ${campaignId}: ${result.influencers_notified.length} influencer(s) ` +
          `should be notified. Notification system not yet implemented.`,
      );
    }

    return result;
  }
}
