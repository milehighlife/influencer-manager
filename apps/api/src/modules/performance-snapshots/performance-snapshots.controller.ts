import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from "@nestjs/common";

import { CurrentOrganizationId } from "../../common/decorators/current-organization-id.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { UuidParamPipe } from "../../common/pipes/uuid-param.pipe";
import { CreatePostPerformanceSnapshotDto } from "./dto/create-post-performance-snapshot.dto";
import { CreatePerformanceSnapshotDto } from "./dto/create-performance-snapshot.dto";
import { QueryPerformanceSnapshotsDto } from "./dto/query-performance-snapshots.dto";
import { PerformanceSnapshotsService } from "./performance-snapshots.service";

@Controller()
export class PerformanceSnapshotsController {
  constructor(
    private readonly performanceSnapshotsService: PerformanceSnapshotsService,
  ) {}

  @Get("performance-snapshots")
  findAll(
    @CurrentOrganizationId() organizationId: string,
    @Query() query: QueryPerformanceSnapshotsDto,
  ) {
    return this.performanceSnapshotsService.findAll(organizationId, query);
  }

  @Get("posts/:id/snapshots")
  findByPost(
    @CurrentOrganizationId() organizationId: string,
    @Param("id", UuidParamPipe) id: string,
  ) {
    return this.performanceSnapshotsService.findByPost(organizationId, id);
  }

  @Get("posts/:id/latest-snapshot")
  findLatestForPost(
    @CurrentOrganizationId() organizationId: string,
    @Param("id", UuidParamPipe) id: string,
  ) {
    return this.performanceSnapshotsService.findLatestForPost(
      organizationId,
      id,
    );
  }

  @Get("performance-snapshots/:id")
  findOne(
    @CurrentOrganizationId() organizationId: string,
    @Param("id", UuidParamPipe) id: string,
  ) {
    return this.performanceSnapshotsService.findOne(organizationId, id);
  }

  @Post("performance-snapshots")
  @Roles("organization_admin", "campaign_manager")
  create(
    @CurrentOrganizationId() organizationId: string,
    @Body() dto: CreatePerformanceSnapshotDto,
  ) {
    return this.performanceSnapshotsService.create(organizationId, dto);
  }

  @Post("posts/:postId/snapshots")
  @Roles("organization_admin", "campaign_manager")
  createForPost(
    @CurrentOrganizationId() organizationId: string,
    @Param("postId", UuidParamPipe) postId: string,
    @Body() dto: CreatePostPerformanceSnapshotDto,
  ) {
    return this.performanceSnapshotsService.createForPost(
      organizationId,
      postId,
      dto,
    );
  }
}
