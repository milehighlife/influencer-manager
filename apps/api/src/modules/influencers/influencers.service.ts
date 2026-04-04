import { Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma, SocialPlatform } from "@prisma/client";

import { PrismaService } from "../../database/prisma.service";
import {
  buildPaginatedResponse,
  getPagination,
} from "../../common/utils/pagination.util";
import { CreateInfluencerDto } from "./dto/create-influencer.dto";
import { QueryInfluencersDto } from "./dto/query-influencers.dto";
import { UpdateInfluencerDto } from "./dto/update-influencer.dto";

@Injectable()
export class InfluencersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(organizationId: string, dto: CreateInfluencerDto) {
    return this.prisma.influencer.create({
      data: {
        organization_id: organizationId,
        ...dto,
      },
    });
  }

  async findAll(organizationId: string, query: QueryInfluencersDto) {
    const { page, limit, skip, take } = getPagination(query);
    const normalizedSearch = query.search?.trim();
    const normalizedPlatformSearch = normalizedSearch?.toLowerCase();
    const where: Prisma.InfluencerWhereInput = {
      organization_id: organizationId,
      ...(query.primary_platform
        ? { primary_platform: query.primary_platform }
        : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(normalizedSearch
        ? {
            OR: [
              {
                name: {
                  contains: normalizedSearch,
                  mode: "insensitive",
                },
              },
              {
                audience_description: {
                  contains: normalizedSearch,
                  mode: "insensitive",
                },
              },
              {
                email: {
                  contains: normalizedSearch,
                  mode: "insensitive",
                },
              },
              {
                location: {
                  contains: normalizedSearch,
                  mode: "insensitive",
                },
              },
              ...(normalizedPlatformSearch &&
              ["instagram", "tiktok", "youtube", "x", "linkedin", "threads", "other"].includes(
                normalizedPlatformSearch,
              )
                ? [{ primary_platform: normalizedPlatformSearch as SocialPlatform }]
                : []),
            ],
          }
        : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.influencer.findMany({
        where,
        include: {
          action_assignments: {
            select: {
              action: {
                select: {
                  mission: {
                    select: {
                      campaign: {
                        select: {
                          company: {
                            select: {
                              id: true,
                              name: true,
                              client: { select: { id: true, name: true } },
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
          influencer_ratings: {
            select: {
              visual_quality_score: true,
              script_quality_score: true,
              overall_quality_score: true,
            },
          },
          influencer_clients: {
            select: {
              client: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: this.getOrderBy(
          query.sort_by,
          query.sort_direction,
          normalizedSearch,
        ),
      }),
      this.prisma.influencer.count({ where }),
    ]);

    const data = rows.map(({ action_assignments, influencer_ratings, influencer_clients, ...influencer }) => {
      const clientMap = new Map<string, string>();

      // Direct client relationships
      for (const ic of influencer_clients) {
        if (ic.client) {
          clientMap.set(ic.client.id, ic.client.name);
        }
      }
      const companyMap = new Map<string, string>();

      for (const assignment of action_assignments) {
        const company = assignment.action?.mission?.campaign?.company;
        if (company) {
          companyMap.set(company.id, company.name);
          if (company.client) {
            clientMap.set(company.client.id, company.client.name);
          }
        }
      }

      let rating_average: number | null = null;
      const ratedScores: number[] = [];
      for (const r of influencer_ratings) {
        if (
          r.visual_quality_score != null &&
          r.script_quality_score != null &&
          r.overall_quality_score != null
        ) {
          ratedScores.push(
            (r.visual_quality_score + r.script_quality_score + r.overall_quality_score) / 3,
          );
        }
      }
      if (ratedScores.length > 0) {
        rating_average =
          Math.round(
            (ratedScores.reduce((a, b) => a + b, 0) / ratedScores.length) * 10,
          ) / 10;
      }

      return {
        ...influencer,
        clients: Array.from(clientMap.values()),
        companies: Array.from(companyMap.values()),
        rating_average,
      };
    });

    // Sort all results post-query so computed fields (clients, companies, rating) are sortable
    const sortBy = query.sort_by ?? "name";
    const dir = (query.sort_direction ?? "asc") === "asc" ? 1 : -1;

    data.sort((a, b) => {
      let av: string | number;
      let bv: string | number;

      switch (sortBy) {
        case "name":
          av = a.name.toLowerCase();
          bv = b.name.toLowerCase();
          break;
        case "client":
          av = (a.clients[0] ?? "").toLowerCase();
          bv = (b.clients[0] ?? "").toLowerCase();
          break;
        case "company":
          av = (a.companies[0] ?? "").toLowerCase();
          bv = (b.companies[0] ?? "").toLowerCase();
          break;
        case "rating_average":
          av = a.rating_average ?? -1;
          bv = b.rating_average ?? -1;
          break;
        default:
          av = a.name.toLowerCase();
          bv = b.name.toLowerCase();
      }

      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });

    const paginated = data.slice(skip, skip + take);
    return buildPaginatedResponse(paginated, total, page, limit);
  }

  private getOrderBy(
    sortBy?: string,
    sortDirection?: string,
    hasSearch?: string,
  ): Prisma.InfluencerOrderByWithRelationInput | Prisma.InfluencerOrderByWithRelationInput[] {
    const dir = (sortDirection ?? "desc") as "asc" | "desc";

    if (!sortBy || sortBy === "rating_average") {
      return hasSearch
        ? [{ name: "asc" }, { created_at: "desc" }]
        : { created_at: dir };
    }

    switch (sortBy) {
      case "name":
        return [{ name: dir }, { created_at: "desc" }];
      case "primary_platform":
        return [{ primary_platform: dir }, { name: "asc" }];
      case "status":
        return [{ status: dir }, { name: "asc" }];
      case "created_at":
        return [{ created_at: dir }];
      default:
        return { created_at: "desc" };
    }
  }

  async findOne(organizationId: string, id: string) {
    const influencer = await this.prisma.influencer.findFirst({
      where: { id, organization_id: organizationId },
    });

    if (!influencer) {
      throw new NotFoundException("Influencer not found.");
    }

    return influencer;
  }

  async findAssignments(organizationId: string, influencerId: string) {
    const influencer = await this.findOne(organizationId, influencerId);

    const assignments = await this.prisma.actionAssignment.findMany({
      where: {
        organization_id: organizationId,
        influencer_id: influencerId,
      },
      orderBy: [{ assigned_at: "desc" }, { created_at: "desc" }],
      include: {
        action: {
          select: {
            id: true,
            mission_id: true,
            title: true,
            platform: true,
            content_format: true,
            status: true,
            mission: {
              select: {
                id: true,
                campaign_id: true,
                name: true,
                sequence_order: true,
                status: true,
                campaign: {
                  select: {
                    id: true,
                    company_id: true,
                    name: true,
                    campaign_type: true,
                    status: true,
                    company: {
                      select: {
                        id: true,
                        client_id: true,
                        name: true,
                        status: true,
                        client: {
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
    });

    const campaignIds = [
      ...new Set(
        assignments
          .map((a) => a.action?.mission?.campaign?.id)
          .filter((id): id is string => Boolean(id)),
      ),
    ];

    const campaignActionCounts = new Map<string, number>();
    if (campaignIds.length > 0) {
      const counts = await this.prisma.action.groupBy({
        by: ["mission_id"],
        where: {
          organization_id: organizationId,
          mission: { campaign_id: { in: campaignIds } },
        },
        _count: { id: true },
      });

      const missionToCampaign = new Map<string, string>();
      for (const a of assignments) {
        const mission = a.action?.mission;
        if (mission?.campaign?.id) {
          missionToCampaign.set(mission.id, mission.campaign.id);
        }
      }

      const missions = await this.prisma.mission.findMany({
        where: {
          organization_id: organizationId,
          campaign_id: { in: campaignIds },
        },
        select: { id: true, campaign_id: true },
      });
      for (const m of missions) {
        missionToCampaign.set(m.id, m.campaign_id);
      }

      for (const row of counts) {
        const cId = missionToCampaign.get(row.mission_id);
        if (cId) {
          campaignActionCounts.set(
            cId,
            (campaignActionCounts.get(cId) ?? 0) + row._count.id,
          );
        }
      }
    }

    return {
      influencer,
      assignments,
      campaign_action_counts: Object.fromEntries(campaignActionCounts),
    };
  }

  async update(organizationId: string, id: string, dto: UpdateInfluencerDto) {
    await this.findOne(organizationId, id);

    return this.prisma.influencer.update({
      where: { id },
      data: dto,
    });
  }

  async remove(organizationId: string, id: string) {
    await this.findOne(organizationId, id);
    await this.prisma.influencer.delete({ where: { id } });

    return { id };
  }

  async findByCompany(organizationId: string, companyId: string) {
    // Find influencers assigned to active/completed campaigns for this company
    const assignments = await this.prisma.actionAssignment.findMany({
      where: {
        organization_id: organizationId,
        action: {
          mission: {
            campaign: {
              company_id: companyId,
              status: { in: ["active", "completed"] },
            },
          },
        },
      },
      select: {
        influencer_id: true,
        influencer: {
          select: {
            id: true,
            name: true,
            city: true,
            state: true,
          },
        },
      },
    });

    // Deduplicate and collect unique influencer IDs
    const influencerMap = new Map<string, { id: string; name: string; city: string | null; state: string | null }>();
    for (const a of assignments) {
      if (!influencerMap.has(a.influencer_id)) {
        influencerMap.set(a.influencer_id, {
          id: a.influencer.id,
          name: a.influencer.name,
          city: a.influencer.city,
          state: a.influencer.state,
        });
      }
    }

    const influencerIds = [...influencerMap.keys()];

    // Get rating averages
    const ratings = await this.prisma.influencerRating.findMany({
      where: {
        organization_id: organizationId,
        influencer_id: { in: influencerIds },
        visual_quality_score: { not: null },
        script_quality_score: { not: null },
        overall_quality_score: { not: null },
        // Exclude ratings for auto-completed actions that had no media submitted
        NOT: {
          action_assignment: {
            assignment_status: "completed_by_cascade",
            deliverable_count_submitted: 0,
          },
        },
      },
      select: {
        influencer_id: true,
        visual_quality_score: true,
        script_quality_score: true,
        overall_quality_score: true,
      },
    });

    const ratingMap = new Map<string, number>();
    const ratingCounts = new Map<string, { sum: number; count: number }>();
    for (const r of ratings) {
      const existing = ratingCounts.get(r.influencer_id) ?? { sum: 0, count: 0 };
      existing.sum += (r.visual_quality_score! + r.script_quality_score! + r.overall_quality_score!) / 3;
      existing.count++;
      ratingCounts.set(r.influencer_id, existing);
    }
    for (const [id, { sum, count }] of ratingCounts) {
      ratingMap.set(id, Math.round((sum / count) * 10) / 10);
    }

    return [...influencerMap.values()].map((inf) => ({
      ...inf,
      rating_average: ratingMap.get(inf.id) ?? null,
    }));
  }

  async findByClientAndPlatform(
    organizationId: string,
    clientId: string,
    platform?: string,
  ) {
    const platformUrlField = platform
      ? {
          instagram: "url_instagram",
          tiktok: "url_tiktok",
          youtube: "url_youtube",
          facebook: "url_facebook",
          linkedin: "url_linkedin",
          x: "url_x",
          threads: "url_threads",
        }[platform] ?? null
      : null;

    const influencerIds = await this.prisma.influencerClient.findMany({
      where: { organization_id: organizationId, client_id: clientId },
      select: { influencer_id: true },
    });

    if (influencerIds.length === 0) return [];

    const ids = influencerIds.map((r) => r.influencer_id);

    const where: Prisma.InfluencerWhereInput = {
      organization_id: organizationId,
      id: { in: ids },
      ...(platformUrlField
        ? { [platformUrlField]: { not: { equals: null } } }
        : {}),
    };

    // Also filter out empty strings for the URL field
    const influencers = await this.prisma.influencer.findMany({
      where,
      orderBy: { name: "asc" },
      include: {
        influencer_ratings: {
          select: {
            visual_quality_score: true,
            script_quality_score: true,
            overall_quality_score: true,
          },
        },
        action_assignments: {
          where: { published_at: { not: null } },
          select: { id: true },
        },
      },
    });

    const filtered = platformUrlField
      ? influencers.filter((i) => {
          const val = (i as Record<string, unknown>)[platformUrlField];
          return val != null && val !== "";
        })
      : influencers;

    return filtered.map(({ influencer_ratings, action_assignments, ...inf }) => {
      let rating_average: number | null = null;
      const ratedScores: number[] = [];
      for (const r of influencer_ratings) {
        if (
          r.visual_quality_score != null &&
          r.script_quality_score != null &&
          r.overall_quality_score != null
        ) {
          ratedScores.push(
            (r.visual_quality_score + r.script_quality_score + r.overall_quality_score) / 3,
          );
        }
      }
      if (ratedScores.length > 0) {
        rating_average =
          Math.round(
            (ratedScores.reduce((a, b) => a + b, 0) / ratedScores.length) * 10,
          ) / 10;
      }

      return {
        ...inf,
        rating_average,
        published_action_count: action_assignments.length,
      };
    });
  }

  async findClients(organizationId: string, influencerId: string) {
    await this.findOne(organizationId, influencerId);

    const rows = await this.prisma.influencerClient.findMany({
      where: { organization_id: organizationId, influencer_id: influencerId },
      include: {
        client: { select: { id: true, name: true, industry: true, status: true } },
      },
      orderBy: { created_at: "desc" },
    });

    return rows.map((r) => r.client);
  }

  async addClient(organizationId: string, influencerId: string, clientId: string) {
    await this.findOne(organizationId, influencerId);

    const client = await this.prisma.client.findFirst({
      where: { id: clientId, organization_id: organizationId },
    });
    if (!client) {
      throw new NotFoundException("Client not found.");
    }

    return this.prisma.influencerClient.create({
      data: {
        organization_id: organizationId,
        influencer_id: influencerId,
        client_id: clientId,
      },
    });
  }

  async removeClient(organizationId: string, influencerId: string, clientId: string) {
    const existing = await this.prisma.influencerClient.findFirst({
      where: {
        organization_id: organizationId,
        influencer_id: influencerId,
        client_id: clientId,
      },
    });

    if (!existing) {
      throw new NotFoundException("Influencer-client relationship not found.");
    }

    await this.prisma.influencerClient.delete({ where: { id: existing.id } });
    return { id: existing.id };
  }
}
