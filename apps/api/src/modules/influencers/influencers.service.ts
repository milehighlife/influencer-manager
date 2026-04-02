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

    const [data, total] = await this.prisma.$transaction([
      this.prisma.influencer.findMany({
        where,
        skip,
        take,
        orderBy: normalizedSearch
          ? [{ name: "asc" }, { created_at: "desc" }]
          : { created_at: "desc" },
      }),
      this.prisma.influencer.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, page, limit);
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

    return {
      influencer,
      assignments,
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
}
