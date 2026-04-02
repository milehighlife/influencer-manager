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
import { CreateInfluencerNoteDto } from "./dto/create-influencer-note.dto";
import { QueryInfluencerNotesDto } from "./dto/query-influencer-notes.dto";
import { UpdateInfluencerNoteDto } from "./dto/update-influencer-note.dto";

@Injectable()
export class InfluencerNotesService {
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

  private async assertUserExists(organizationId: string, userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, organization_id: organizationId },
    });

    if (!user) {
      throw new NotFoundException("User not found.");
    }
  }

  async create(organizationId: string, dto: CreateInfluencerNoteDto) {
    await this.assertInfluencerExists(organizationId, dto.influencer_id);
    await this.assertUserExists(organizationId, dto.author_user_id);

    return this.prisma.influencerNote.create({
      data: {
        organization_id: organizationId,
        ...dto,
      },
    });
  }

  async findAll(organizationId: string, query: QueryInfluencerNotesDto) {
    const { page, limit, skip, take } = getPagination(query);
    const where: Prisma.InfluencerNoteWhereInput = {
      organization_id: organizationId,
      ...(query.influencer_id ? { influencer_id: query.influencer_id } : {}),
      ...(query.author_user_id ? { author_user_id: query.author_user_id } : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.influencerNote.findMany({
        where,
        skip,
        take,
        orderBy: { created_at: "desc" },
      }),
      this.prisma.influencerNote.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, page, limit);
  }

  async findOne(organizationId: string, id: string) {
    const note = await this.prisma.influencerNote.findFirst({
      where: { id, organization_id: organizationId },
    });

    if (!note) {
      throw new NotFoundException("Influencer note not found.");
    }

    return note;
  }

  async update(organizationId: string, id: string, dto: UpdateInfluencerNoteDto) {
    await this.findOne(organizationId, id);

    if (dto.influencer_id) {
      await this.assertInfluencerExists(organizationId, dto.influencer_id);
    }

    if (dto.author_user_id) {
      await this.assertUserExists(organizationId, dto.author_user_id);
    }

    return this.prisma.influencerNote.update({
      where: { id },
      data: dto,
    });
  }

  async remove(organizationId: string, id: string) {
    await this.findOne(organizationId, id);
    await this.prisma.influencerNote.delete({ where: { id } });

    return { id };
  }
}
