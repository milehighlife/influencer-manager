import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { PrismaService } from "../../database/prisma.service";
import { CreateOrganizationDto } from "./dto/create-organization.dto";
import { UpdateOrganizationDto } from "./dto/update-organization.dto";

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(currentOrganizationId: string, dto: CreateOrganizationDto) {
    const existing = await this.prisma.organization.findUnique({
      where: { id: currentOrganizationId },
    });

    if (existing) {
      throw new ConflictException("Organization already exists in context.");
    }

    return this.prisma.organization.create({
      data: {
        id: currentOrganizationId,
        ...dto,
      },
    });
  }

  async findAll(currentOrganizationId: string) {
    return {
      data: [await this.findOne(currentOrganizationId, currentOrganizationId)],
      meta: {
        page: 1,
        limit: 1,
        total: 1,
        totalPages: 1,
      },
    };
  }

  async findOne(currentOrganizationId: string, id: string) {
    if (currentOrganizationId !== id) {
      throw new NotFoundException("Organization not found.");
    }

    const organization = await this.prisma.organization.findUnique({
      where: { id },
    });

    if (!organization) {
      throw new NotFoundException("Organization not found.");
    }

    return organization;
  }

  async update(
    currentOrganizationId: string,
    id: string,
    dto: UpdateOrganizationDto,
  ) {
    await this.findOne(currentOrganizationId, id);

    return this.prisma.organization.update({
      where: { id },
      data: dto,
    });
  }

  async remove(currentOrganizationId: string, id: string) {
    await this.findOne(currentOrganizationId, id);
    await this.prisma.organization.delete({ where: { id } });

    return { id };
  }
}
