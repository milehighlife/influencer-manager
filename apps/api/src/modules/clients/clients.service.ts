import { Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";

import { PrismaService } from "../../database/prisma.service";
import {
  buildPaginatedResponse,
  getPagination,
} from "../../common/utils/pagination.util";
import { CreateClientDto } from "./dto/create-client.dto";
import { QueryClientsDto } from "./dto/query-clients.dto";
import { UpdateClientDto } from "./dto/update-client.dto";

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(organizationId: string, dto: CreateClientDto) {
    return this.prisma.client.create({
      data: {
        organization_id: organizationId,
        ...dto,
      },
    });
  }

  async findAll(organizationId: string, query: QueryClientsDto) {
    const { page, limit, skip, take } = getPagination(query);
    const normalizedSearch = query.search?.trim();
    const where: Prisma.ClientWhereInput = {
      organization_id: organizationId,
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

    const [data, total] = await this.prisma.$transaction([
      this.prisma.client.findMany({
        where,
        skip,
        take,
        orderBy: normalizedSearch
          ? [{ name: "asc" }, { created_at: "desc" }]
          : { created_at: "desc" },
      }),
      this.prisma.client.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, page, limit);
  }

  async findOne(organizationId: string, id: string) {
    const client = await this.prisma.client.findFirst({
      where: {
        id,
        organization_id: organizationId,
      },
    });

    if (!client) {
      throw new NotFoundException("Client not found.");
    }

    return client;
  }

  async update(organizationId: string, id: string, dto: UpdateClientDto) {
    await this.findOne(organizationId, id);

    return this.prisma.client.update({
      where: { id },
      data: dto,
    });
  }

  async remove(organizationId: string, id: string) {
    await this.findOne(organizationId, id);
    await this.prisma.client.delete({ where: { id } });

    return { id };
  }
}
