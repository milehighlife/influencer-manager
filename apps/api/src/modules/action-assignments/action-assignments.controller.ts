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
import { SkipThrottle } from "@nestjs/throttler";

import { CurrentOrganizationId } from "../../common/decorators/current-organization-id.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { UuidParamPipe } from "../../common/pipes/uuid-param.pipe";
import type { AuthenticatedUser } from "../../common/utils/authenticated-user.interface";
import { ActionAssignmentsService } from "./action-assignments.service";
import { BulkCreateAssignmentsDto } from "./dto/bulk-create-assignments.dto";
import { CreateActionAssignmentDto } from "./dto/create-action-assignment.dto";
import { CreateActionInfluencerAssignmentDto } from "./dto/create-action-influencer-assignment.dto";
import { QueryActionAssignmentsDto } from "./dto/query-action-assignments.dto";
import { RequestRevisionDto } from "./dto/request-revision.dto";
import { SubmitActionAssignmentDto } from "./dto/submit-action-assignment.dto";
import { UpdateActionAssignmentDto } from "./dto/update-action-assignment.dto";

@Controller()
export class ActionAssignmentsController {
  constructor(
    private readonly actionAssignmentsService: ActionAssignmentsService,
  ) {}

  @Get("action-assignments/platform-mismatches")
  findPlatformMismatches(
    @CurrentOrganizationId() organizationId: string,
    @Query("limit") limit?: string,
  ) {
    return this.actionAssignmentsService.findPlatformMismatches(
      organizationId,
      Number(limit) || 200,
    );
  }

  @Get("action-assignments/unrated-published")
  findUnratedPublished(
    @CurrentOrganizationId() organizationId: string,
    @Query("search") search?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.actionAssignmentsService.findUnratedPublished(
      organizationId,
      search,
      Number(page) || 1,
      Number(limit) || 10,
    );
  }

  @Get("action-assignments/reviewed")
  findReviewed(
    @CurrentOrganizationId() organizationId: string,
    @Query("search") search?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.actionAssignmentsService.findReviewed(
      organizationId,
      search,
      Number(page) || 1,
      Number(limit) || 10,
    );
  }

  @Get("action-assignments/overdue")
  findOverdue(
    @CurrentOrganizationId() organizationId: string,
    @Query("search") search?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.actionAssignmentsService.findOverdue(
      organizationId,
      search,
      Number(page) || 1,
      Number(limit) || 10,
    );
  }

  @Get("action-assignments/pending-review")
  @Roles("organization_admin", "campaign_manager")
  findPendingReview(
    @CurrentOrganizationId() organizationId: string,
    @Query("campaign_id") campaignId?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.actionAssignmentsService.findPendingReview(
      organizationId,
      campaignId,
      Number(page) || 1,
      Number(limit) || 10,
    );
  }

  @Get("action-assignments")
  findAll(
    @CurrentOrganizationId() organizationId: string,
    @Query() query: QueryActionAssignmentsDto,
  ) {
    return this.actionAssignmentsService.findAll(organizationId, query);
  }

  @Get("actions/:id/assignments")
  findByAction(
    @CurrentOrganizationId() organizationId: string,
    @Param("id", UuidParamPipe) id: string,
  ) {
    return this.actionAssignmentsService.findByAction(organizationId, id);
  }

  @Get("action-assignments/:id")
  findOne(
    @CurrentOrganizationId() organizationId: string,
    @Param("id", UuidParamPipe) id: string,
  ) {
    return this.actionAssignmentsService.findOne(organizationId, id);
  }

  @Post("action-assignments/bulk")
  @SkipThrottle()
  @Roles("organization_admin", "campaign_manager")
  bulkCreate(
    @CurrentOrganizationId() organizationId: string,
    @Body() dto: BulkCreateAssignmentsDto,
  ) {
    return this.actionAssignmentsService.bulkCreate(
      organizationId,
      dto.assignments,
    );
  }

  @Post("action-assignments")
  @Roles("organization_admin", "campaign_manager")
  create(
    @CurrentOrganizationId() organizationId: string,
    @Body() dto: CreateActionAssignmentDto,
  ) {
    return this.actionAssignmentsService.create(organizationId, dto);
  }

  @Post("actions/:actionId/assignments")
  @Roles("organization_admin", "campaign_manager")
  createForAction(
    @CurrentOrganizationId() organizationId: string,
    @Param("actionId", UuidParamPipe) actionId: string,
    @Body() dto: CreateActionInfluencerAssignmentDto,
  ) {
    return this.actionAssignmentsService.createForAction(
      organizationId,
      actionId,
      dto,
    );
  }

  @Patch("action-assignments/:id")
  @Roles("organization_admin", "campaign_manager")
  update(
    @CurrentOrganizationId() organizationId: string,
    @Param("id", UuidParamPipe) id: string,
    @Body() dto: UpdateActionAssignmentDto,
  ) {
    return this.actionAssignmentsService.update(organizationId, id, dto);
  }

  @Post("action-assignments/:id/accept")
  @Roles("organization_admin", "campaign_manager")
  accept(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", UuidParamPipe) id: string,
  ) {
    return this.actionAssignmentsService.accept(organizationId, id, user);
  }

  @Post("action-assignments/:id/start")
  @Roles("organization_admin", "campaign_manager")
  start(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", UuidParamPipe) id: string,
  ) {
    return this.actionAssignmentsService.start(organizationId, id, user);
  }

  @Post("action-assignments/:id/submit")
  @Roles("organization_admin", "campaign_manager")
  submit(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", UuidParamPipe) id: string,
    @Body() dto: SubmitActionAssignmentDto,
  ) {
    return this.actionAssignmentsService.submit(organizationId, id, user, dto);
  }

  @Post("action-assignments/:id/approve")
  @Roles("organization_admin", "campaign_manager")
  approve(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", UuidParamPipe) id: string,
  ) {
    return this.actionAssignmentsService.approve(organizationId, id, user);
  }

  @Post("action-assignments/:id/request-revision")
  @Roles("organization_admin", "campaign_manager")
  requestRevision(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", UuidParamPipe) id: string,
    @Body() dto: RequestRevisionDto,
  ) {
    return this.actionAssignmentsService.requestRevision(
      organizationId,
      id,
      user,
      dto.reason,
    );
  }

  @Post("action-assignments/:id/complete")
  @Roles("organization_admin", "campaign_manager")
  complete(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", UuidParamPipe) id: string,
  ) {
    return this.actionAssignmentsService.complete(organizationId, id, user);
  }

  @Delete("action-assignments/:id")
  @Roles("organization_admin", "campaign_manager")
  remove(
    @CurrentOrganizationId() organizationId: string,
    @Param("id", UuidParamPipe) id: string,
  ) {
    return this.actionAssignmentsService.remove(organizationId, id);
  }
}
