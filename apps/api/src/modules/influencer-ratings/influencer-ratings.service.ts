import {
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { Prisma } from "@prisma/client";

import {
  buildPaginatedResponse,
  getPagination,
} from "../../common/utils/pagination.util";
import { PrismaService } from "../../database/prisma.service";
import { CreateInfluencerRatingDto } from "./dto/create-influencer-rating.dto";
import { QueryInfluencerRatingsDto } from "./dto/query-influencer-ratings.dto";
import { UpdateInfluencerRatingDto } from "./dto/update-influencer-rating.dto";

@Injectable()
export class InfluencerRatingsService {
  constructor(private readonly prisma: PrismaService) {}

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

  private async assertCampaignExists(organizationId: string, campaignId: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id: campaignId, organization_id: organizationId },
    });

    if (!campaign) {
      throw new NotFoundException("Campaign not found.");
    }
  }

  private async assertUserExists(organizationId: string, userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, organization_id: organizationId },
    });

    if (!user) {
      throw new NotFoundException("User not found.");
    }
  }

  async create(organizationId: string, dto: CreateInfluencerRatingDto) {
    await this.assertInfluencerExists(organizationId, dto.influencer_id);
    await this.assertCampaignExists(organizationId, dto.campaign_id);
    await this.assertUserExists(organizationId, dto.rater_user_id);

    return this.prisma.influencerRating.create({
      data: {
        organization_id: organizationId,
        ...dto,
      },
    });
  }

  async findAll(organizationId: string, query: QueryInfluencerRatingsDto) {
    const { page, limit, skip, take } = getPagination(query);
    const where: Prisma.InfluencerRatingWhereInput = {
      organization_id: organizationId,
      ...(query.campaign_id ? { campaign_id: query.campaign_id } : {}),
      ...(query.influencer_id ? { influencer_id: query.influencer_id } : {}),
      ...(query.action_assignment_id
        ? { action_assignment_id: query.action_assignment_id }
        : {}),
      // Exclude ratings for auto-completed actions that had no media submitted
      NOT: {
        action_assignment: {
          assignment_status: "completed_by_cascade",
          deliverable_count_submitted: 0,
        },
      },
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.influencerRating.findMany({
        where,
        skip,
        take,
        orderBy: { created_at: "desc" },
        include: {
          rater_user: {
            select: { id: true, full_name: true, email: true },
          },
        },
      }),
      this.prisma.influencerRating.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, page, limit);
  }

  async findOne(organizationId: string, id: string) {
    const rating = await this.prisma.influencerRating.findFirst({
      where: { id, organization_id: organizationId },
    });

    if (!rating) {
      throw new NotFoundException("Influencer rating not found.");
    }

    return rating;
  }

  async update(
    organizationId: string,
    id: string,
    dto: UpdateInfluencerRatingDto,
  ) {
    await this.findOne(organizationId, id);

    if (dto.influencer_id) {
      await this.assertInfluencerExists(organizationId, dto.influencer_id);
    }

    if (dto.campaign_id) {
      await this.assertCampaignExists(organizationId, dto.campaign_id);
    }

    if (dto.rater_user_id) {
      await this.assertUserExists(organizationId, dto.rater_user_id);
    }

    return this.prisma.influencerRating.update({
      where: { id },
      data: dto,
    });
  }

  async remove(organizationId: string, id: string) {
    await this.findOne(organizationId, id);
    await this.prisma.influencerRating.delete({ where: { id } });

    return { id };
  }
}
