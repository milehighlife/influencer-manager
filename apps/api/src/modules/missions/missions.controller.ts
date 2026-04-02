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
import { CreateCampaignMissionDto } from "./dto/create-campaign-mission.dto";
import { CreateMissionDto } from "./dto/create-mission.dto";
import { QueryMissionsDto } from "./dto/query-missions.dto";
import { UpdateMissionDto } from "./dto/update-mission.dto";
import { MissionsService } from "./missions.service";

@Controller()
export class MissionsController {
  constructor(private readonly missionsService: MissionsService) {}

  @Get("missions")
  findAll(
    @CurrentOrganizationId() organizationId: string,
    @Query() query: QueryMissionsDto,
  ) {
    return this.missionsService.findAll(organizationId, query);
  }

  @Get("missions/:id")
  findOne(
    @CurrentOrganizationId() organizationId: string,
    @Param("id", UuidParamPipe) id: string,
  ) {
    return this.missionsService.findOne(organizationId, id);
  }

  @Post("missions")
  @Roles("organization_admin", "campaign_manager")
  create(
    @CurrentOrganizationId() organizationId: string,
    @Body() dto: CreateMissionDto,
  ) {
    return this.missionsService.create(organizationId, dto);
  }

  @Post("campaigns/:campaignId/missions")
  @Roles("organization_admin", "campaign_manager")
  createForCampaign(
    @CurrentOrganizationId() organizationId: string,
    @Param("campaignId", UuidParamPipe) campaignId: string,
    @Body() dto: CreateCampaignMissionDto,
  ) {
    return this.missionsService.createForCampaign(
      organizationId,
      campaignId,
      dto,
    );
  }

  @Patch("missions/:id")
  @Roles("organization_admin", "campaign_manager")
  update(
    @CurrentOrganizationId() organizationId: string,
    @Param("id", UuidParamPipe) id: string,
    @Body() dto: UpdateMissionDto,
  ) {
    return this.missionsService.update(organizationId, id, dto);
  }

  @Delete("missions/:id")
  @Roles("organization_admin", "campaign_manager")
  remove(
    @CurrentOrganizationId() organizationId: string,
    @Param("id", UuidParamPipe) id: string,
  ) {
    return this.missionsService.remove(organizationId, id);
  }
}
