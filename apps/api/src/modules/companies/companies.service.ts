import {
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { Prisma } from "@prisma/client";

import { PrismaService } from "../../database/prisma.service";
import {
  buildPaginatedResponse,
  getPagination,
} from "../../common/utils/pagination.util";
import { CreateCompanyDto } from "./dto/create-company.dto";
import { QueryCompaniesDto } from "./dto/query-companies.dto";
import { UpdateCompanyDto } from "./dto/update-company.dto";

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertClientExists(organizationId: string, clientId: string) {
    const client = await this.prisma.client.findFirst({
      where: { id: clientId, organization_id: organizationId },
    });

    if (!client) {
      throw new NotFoundException("Client not found.");
    }
  }

  async create(organizationId: string, dto: CreateCompanyDto) {
    await this.assertClientExists(organizationId, dto.client_id);

    return this.prisma.company.create({
      data: {
        organization_id: organizationId,
        ...dto,
      },
    });
  }

  async findAll(organizationId: string, query: QueryCompaniesDto) {
    const { page, limit, skip, take } = getPagination(query);
    const normalizedSearch = query.search?.trim();
    const where: Prisma.CompanyWhereInput = {
      organization_id: organizationId,
      ...(query.client_id ? { client_id: query.client_id } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(normalizedSearch
        ? {
            name: {
              contains: normalizedSearch,
              mode: "insensitive",
            },
          }
        : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.company.findMany({
        where,
        skip,
        take,
        include: { client: { select: { name: true } } },
        orderBy: normalizedSearch
          ? [{ name: "asc" }, { created_at: "desc" }]
          : { created_at: "desc" },
      }),
      this.prisma.company.count({ where }),
    ]);

    const data = rows.map(({ client, ...company }) => ({
      ...company,
      client_name: client?.name ?? null,
    }));

    return buildPaginatedResponse(data, total, page, limit);
  }

  async findOne(organizationId: string, id: string) {
    const result = await this.prisma.company.findFirst({
      where: { id, organization_id: organizationId },
      include: { client: { select: { name: true } } },
    });

    if (!result) {
      throw new NotFoundException("Company not found.");
    }

    const { client, ...company } = result;
    return { ...company, client_name: client?.name ?? null };
  }

  async update(organizationId: string, id: string, dto: UpdateCompanyDto) {
    await this.findOne(organizationId, id);

    if (dto.client_id) {
      await this.assertClientExists(organizationId, dto.client_id);
    }

    return this.prisma.company.update({
      where: { id, organization_id: organizationId },
      data: dto,
    });
  }

  async remove(organizationId: string, id: string) {
    await this.findOne(organizationId, id);
    await this.prisma.company.delete({
      where: { id, organization_id: organizationId },
    });

    return { id };
  }
}
