import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { Prisma, User } from "@prisma/client";

import {
  buildPaginatedResponse,
  getPagination,
} from "../../common/utils/pagination.util";
import { hashPassword } from "../../common/utils/password.util";
import { PrismaService } from "../../database/prisma.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { QueryUsersDto } from "./dto/query-users.dto";
import { UpdateUserDto } from "./dto/update-user.dto";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  private sanitizeUser<T extends User>(user: T) {
    const { password_hash: _passwordHash, ...safeUser } = user;
    return safeUser;
  }

  async create(organizationId: string, dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({
      where: {
        email: dto.email,
      },
    });

    if (existing) {
      throw new ConflictException("User email already exists.");
    }

    const { password, ...userData } = dto;
    const user = await this.prisma.user.create({
      data: {
        organization_id: organizationId,
        ...userData,
        ...(password ? { password_hash: await hashPassword(password) } : {}),
      },
    });

    return this.sanitizeUser(user);
  }

  async findAll(organizationId: string, query: QueryUsersDto) {
    const { page, limit, skip, take } = getPagination(query);
    const where: Prisma.UserWhereInput = {
      organization_id: organizationId,
      ...(query.role ? { role: query.role } : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { created_at: "desc" },
      }),
      this.prisma.user.count({ where }),
    ]);

    return buildPaginatedResponse(
      data.map((user) => this.sanitizeUser(user)),
      total,
      page,
      limit,
    );
  }

  async findOne(organizationId: string, id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, organization_id: organizationId },
    });

    if (!user) {
      throw new NotFoundException("User not found.");
    }

    return this.sanitizeUser(user);
  }

  async update(organizationId: string, id: string, dto: UpdateUserDto) {
    await this.findOne(organizationId, id);

    if (dto.email) {
      const duplicate = await this.prisma.user.findUnique({
        where: {
          email: dto.email,
        },
      });

      if (duplicate && duplicate.id !== id) {
        throw new ConflictException(
          "User email already exists.",
        );
      }
    }

    const { password, ...userData } = dto;
    const user = await this.prisma.user.update({
      where: { id },
      data: {
        ...userData,
        ...(password ? { password_hash: await hashPassword(password) } : {}),
      },
    });

    return this.sanitizeUser(user);
  }

  async remove(organizationId: string, id: string) {
    await this.findOne(organizationId, id);
    await this.prisma.user.delete({ where: { id } });

    return { id };
  }
}
