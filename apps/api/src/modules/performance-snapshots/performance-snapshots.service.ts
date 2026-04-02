import { Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";

import { AuditLogService } from "../../common/services/audit-log.service";
import {
  buildPaginatedResponse,
  getPagination,
} from "../../common/utils/pagination.util";
import { PrismaService } from "../../database/prisma.service";
import { AnalyticsAggregationService } from "../reports/analytics-aggregation.service";
import { CreatePerformanceSnapshotDto } from "./dto/create-performance-snapshot.dto";
import { QueryPerformanceSnapshotsDto } from "./dto/query-performance-snapshots.dto";

@Injectable()
export class PerformanceSnapshotsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly analyticsAggregationService: AnalyticsAggregationService,
  ) {}

  private async assertPostExists(organizationId: string, postId: string) {
    const post = await this.prisma.post.findFirst({
      where: { id: postId, organization_id: organizationId },
    });

    if (!post) {
      throw new NotFoundException("Post not found.");
    }
  }

  async create(organizationId: string, dto: CreatePerformanceSnapshotDto) {
    await this.assertPostExists(organizationId, dto.post_id);

    const snapshot = await this.prisma.$transaction(async (tx) => {
      const snapshot = await tx.performanceSnapshot.create({
        data: {
          organization_id: organizationId,
          ...dto,
          captured_at: new Date(dto.captured_at),
        },
      });

      await this.auditLogService.logUserEvent(
        {
          organizationId,
          entityType: "performance_snapshot",
          entityId: snapshot.id,
          parentEntityType: "post",
          parentEntityId: snapshot.post_id,
          eventType: "performance_snapshot_created",
          newValue: {
            captured_at: snapshot.captured_at,
            impressions: snapshot.impressions,
            reach: snapshot.reach,
            views: snapshot.views,
            video_views: snapshot.video_views,
            likes: snapshot.likes,
            comments: snapshot.comments,
            shares: snapshot.shares,
            saves: snapshot.saves,
            clicks: snapshot.clicks,
            conversions: snapshot.conversions,
          },
        },
        tx,
      );

      return snapshot;
    });

    await this.analyticsAggregationService.refreshForPost(
      organizationId,
      snapshot.post_id,
    );

    return snapshot;
  }

  async createForPost(
    organizationId: string,
    postId: string,
    dto: Omit<CreatePerformanceSnapshotDto, "post_id">,
  ) {
    return this.create(organizationId, {
      ...dto,
      post_id: postId,
    });
  }

  async findAll(organizationId: string, query: QueryPerformanceSnapshotsDto) {
    const { page, limit, skip, take } = getPagination(query);
    const where: Prisma.PerformanceSnapshotWhereInput = {
      organization_id: organizationId,
      ...(query.post_id ? { post_id: query.post_id } : {}),
      ...(query.captured_after || query.captured_before
        ? {
            captured_at: {
              ...(query.captured_after
                ? { gte: new Date(query.captured_after) }
                : {}),
              ...(query.captured_before
                ? { lte: new Date(query.captured_before) }
                : {}),
            },
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.performanceSnapshot.findMany({
        where,
        skip,
        take,
        orderBy: { captured_at: "desc" },
      }),
      this.prisma.performanceSnapshot.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, page, limit);
  }

  async findOne(organizationId: string, id: string) {
    const snapshot = await this.prisma.performanceSnapshot.findFirst({
      where: { id, organization_id: organizationId },
    });

    if (!snapshot) {
      throw new NotFoundException("Performance snapshot not found.");
    }

    return snapshot;
  }

  async findByPost(organizationId: string, postId: string) {
    await this.assertPostExists(organizationId, postId);

    return this.prisma.performanceSnapshot.findMany({
      where: {
        organization_id: organizationId,
        post_id: postId,
      },
      orderBy: { captured_at: "desc" },
    });
  }

  async findLatestForPost(organizationId: string, postId: string) {
    await this.assertPostExists(organizationId, postId);

    const snapshot = await this.prisma.performanceSnapshot.findFirst({
      where: {
        organization_id: organizationId,
        post_id: postId,
      },
      orderBy: { captured_at: "desc" },
    });

    if (!snapshot) {
      throw new NotFoundException("Performance snapshot not found.");
    }

    return snapshot;
  }
}
