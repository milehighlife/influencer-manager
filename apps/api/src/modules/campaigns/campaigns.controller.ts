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
import { CampaignsService } from "./campaigns.service";
import { CreateCampaignDto } from "./dto/create-campaign.dto";
import { CreateCompanyCampaignDto } from "./dto/create-company-campaign.dto";
import { QueryCampaignsDto } from "./dto/query-campaigns.dto";
import { UpdateCampaignDto } from "./dto/update-campaign.dto";

@Controller()
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Get("campaigns/planner-list")
  @Roles(
    "organization_admin",
    "campaign_manager",
    "campaign_editor",
    "analyst",
    "viewer",
  )
  findPlannerList(
    @CurrentOrganizationId() organizationId: string,
    @Query() query: QueryCampaignsDto,
  ) {
    return this.campaignsService.findPlannerList(organizationId, query);
  }

  @Get("campaigns")
  @Roles(
    "organization_admin",
    "campaign_manager",
    "campaign_editor",
    "analyst",
    "viewer",
  )
  findAll(
    @CurrentOrganizationId() organizationId: string,
    @Query() query: QueryCampaignsDto,
  ) {
    return this.campaignsService.findAll(organizationId, query);
  }

  @Get("campaigns/:id/planning-view")
  findPlanningView(
    @CurrentOrganizationId() organizationId: string,
    @Param("id", UuidParamPipe) id: string,
  ) {
    return this.campaignsService.getPlanningView(organizationId, id);
  }

  @Get("campaigns/:id")
  findOne(
    @CurrentOrganizationId() organizationId: string,
    @Param("id", UuidParamPipe) id: string,
  ) {
    return this.campaignsService.findOne(organizationId, id);
  }

  @Post("campaigns")
  @Roles("organization_admin", "campaign_manager")
  create(
    @CurrentOrganizationId() organizationId: string,
    @Body() dto: CreateCampaignDto,
  ) {
    return this.campaignsService.create(organizationId, dto);
  }

  @Post("companies/:companyId/campaigns")
  @Roles("organization_admin", "campaign_manager")
  createUnderCompany(
    @CurrentOrganizationId() organizationId: string,
    @Param("companyId", UuidParamPipe) companyId: string,
    @Body() dto: CreateCompanyCampaignDto,
  ) {
    return this.campaignsService.createUnderCompany(
      organizationId,
      companyId,
      dto,
    );
  }

  @Patch("campaigns/:id")
  @Roles("organization_admin", "campaign_manager")
  update(
    @CurrentOrganizationId() organizationId: string,
    @Param("id", UuidParamPipe) id: string,
    @Body() dto: UpdateCampaignDto,
  ) {
    return this.campaignsService.update(organizationId, id, dto);
  }

  @Delete("campaigns/:id")
  @Roles("organization_admin", "campaign_manager")
  remove(
    @CurrentOrganizationId() organizationId: string,
    @Param("id", UuidParamPipe) id: string,
  ) {
    return this.campaignsService.remove(organizationId, id);
  }
}
