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
import { ActionsService } from "./actions.service";
import { CreateActionDto } from "./dto/create-action.dto";
import { CreateMissionActionDto } from "./dto/create-mission-action.dto";
import { QueryActionsDto } from "./dto/query-actions.dto";
import { UpdateActionDto } from "./dto/update-action.dto";

@Controller()
export class ActionsController {
  constructor(private readonly actionsService: ActionsService) {}

  @Get("actions")
  findAll(
    @CurrentOrganizationId() organizationId: string,
    @Query() query: QueryActionsDto,
  ) {
    return this.actionsService.findAll(organizationId, query);
  }

  @Get("missions/:id/actions")
  findByMission(
    @CurrentOrganizationId() organizationId: string,
    @Param("id", UuidParamPipe) id: string,
  ) {
    return this.actionsService.findByMission(organizationId, id);
  }

  @Get("actions/:id")
  findOne(
    @CurrentOrganizationId() organizationId: string,
    @Param("id", UuidParamPipe) id: string,
  ) {
    return this.actionsService.findOne(organizationId, id);
  }

  @Post("actions")
  @Roles("organization_admin", "campaign_manager")
  create(
    @CurrentOrganizationId() organizationId: string,
    @Body() dto: CreateActionDto,
  ) {
    return this.actionsService.create(organizationId, dto);
  }

  @Post("missions/:missionId/actions")
  @Roles("organization_admin", "campaign_manager")
  createForMission(
    @CurrentOrganizationId() organizationId: string,
    @Param("missionId", UuidParamPipe) missionId: string,
    @Body() dto: CreateMissionActionDto,
  ) {
    return this.actionsService.createForMission(organizationId, missionId, dto);
  }

  @Patch("actions/:id")
  @Roles("organization_admin", "campaign_manager")
  update(
    @CurrentOrganizationId() organizationId: string,
    @Param("id", UuidParamPipe) id: string,
    @Body() dto: UpdateActionDto,
  ) {
    return this.actionsService.update(organizationId, id, dto);
  }

  @Delete("actions/:id")
  @Roles("organization_admin", "campaign_manager")
  remove(
    @CurrentOrganizationId() organizationId: string,
    @Param("id", UuidParamPipe) id: string,
  ) {
    return this.actionsService.remove(organizationId, id);
  }
}
