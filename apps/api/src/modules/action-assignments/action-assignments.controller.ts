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
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { UuidParamPipe } from "../../common/pipes/uuid-param.pipe";
import type { AuthenticatedUser } from "../../common/utils/authenticated-user.interface";
import { ActionAssignmentsService } from "./action-assignments.service";
import { CreateActionAssignmentDto } from "./dto/create-action-assignment.dto";
import { CreateActionInfluencerAssignmentDto } from "./dto/create-action-influencer-assignment.dto";
import { QueryActionAssignmentsDto } from "./dto/query-action-assignments.dto";
import { SubmitActionAssignmentDto } from "./dto/submit-action-assignment.dto";
import { UpdateActionAssignmentDto } from "./dto/update-action-assignment.dto";

@Controller()
export class ActionAssignmentsController {
  constructor(
    private readonly actionAssignmentsService: ActionAssignmentsService,
  ) {}

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
