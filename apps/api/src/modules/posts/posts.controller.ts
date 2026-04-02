import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";

import { CurrentOrganizationId } from "../../common/decorators/current-organization-id.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { UuidParamPipe } from "../../common/pipes/uuid-param.pipe";
import { CreateDeliverablePostDto } from "./dto/create-deliverable-post.dto";
import { CreatePostDto } from "./dto/create-post.dto";
import { QueryPostsDto } from "./dto/query-posts.dto";
import { UpdatePostDto } from "./dto/update-post.dto";
import { PostsService } from "./posts.service";

@Controller()
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get("posts")
  findAll(
    @CurrentOrganizationId() organizationId: string,
    @Query() query: QueryPostsDto,
  ) {
    return this.postsService.findAll(organizationId, query);
  }

  @Get("deliverables/:id/posts")
  findByDeliverable(
    @CurrentOrganizationId() organizationId: string,
    @Param("id", UuidParamPipe) id: string,
  ) {
    return this.postsService.findByDeliverable(organizationId, id);
  }

  @Get("action-assignments/:id/posts")
  findByActionAssignment(
    @CurrentOrganizationId() organizationId: string,
    @Param("id", UuidParamPipe) id: string,
  ) {
    return this.postsService.findByActionAssignment(organizationId, id);
  }

  @Get("posts/:id")
  findOne(
    @CurrentOrganizationId() organizationId: string,
    @Param("id", UuidParamPipe) id: string,
  ) {
    return this.postsService.findOne(organizationId, id);
  }

  @Post("posts")
  @Roles("organization_admin", "campaign_manager")
  create(
    @CurrentOrganizationId() organizationId: string,
    @Body() dto: CreatePostDto,
  ) {
    return this.postsService.create(organizationId, dto);
  }

  @Post("deliverables/:deliverableId/posts")
  @Roles("organization_admin", "campaign_manager")
  createForDeliverable(
    @CurrentOrganizationId() organizationId: string,
    @Param("deliverableId", UuidParamPipe) deliverableId: string,
    @Body() dto: CreateDeliverablePostDto,
  ) {
    return this.postsService.createForDeliverable(
      organizationId,
      deliverableId,
      dto,
    );
  }

  @Post("posts/:id/metric-sync")
  @Roles("organization_admin", "campaign_manager")
  enqueueMetricSync(
    @CurrentOrganizationId() organizationId: string,
    @Param("id", UuidParamPipe) id: string,
  ) {
    return this.postsService.enqueueMetricSync(organizationId, id);
  }

  @Patch("posts/:id")
  @Roles("organization_admin", "campaign_manager")
  update(
    @CurrentOrganizationId() organizationId: string,
    @Param("id", UuidParamPipe) id: string,
    @Body() dto: UpdatePostDto,
  ) {
    return this.postsService.update(organizationId, id, dto);
  }

  @Delete("posts/:id")
  @Roles("organization_admin", "campaign_manager")
  remove(
    @CurrentOrganizationId() organizationId: string,
    @Param("id", UuidParamPipe) id: string,
  ) {
    return this.postsService.remove(organizationId, id);
  }
}
