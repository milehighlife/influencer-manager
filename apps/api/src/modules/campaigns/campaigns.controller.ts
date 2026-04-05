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
import type { AuthenticatedUser } from "../../common/utils/authenticated-user.interface";
import { UuidParamPipe } from "../../common/pipes/uuid-param.pipe";
import { CampaignsService } from "./campaigns.service";
import { CompleteCampaignCascadeDto } from "./dto/complete-campaign-cascade.dto";
import { CreateCampaignDto } from "./dto/create-campaign.dto";
import { CreateCompanyCampaignDto } from "./dto/create-company-campaign.dto";
import { InviteInfluencersDto } from "./dto/invite-influencers.dto";
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

  @Get("campaigns/status-counts")
  @Roles(
    "organization_admin",
    "campaign_manager",
    "campaign_editor",
    "analyst",
    "viewer",
  )
  getStatusCounts(@CurrentOrganizationId() organizationId: string) {
    return this.campaignsService.getStatusCounts(organizationId);
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

  @Post("campaigns/:id/invite")
  @SkipThrottle()
  @Roles("organization_admin", "campaign_manager")
  invite(
    @CurrentOrganizationId() organizationId: string,
    @Param("id", UuidParamPipe) id: string,
    @Body() dto: InviteInfluencersDto,
  ) {
    return this.campaignsService.inviteInfluencers(
      organizationId,
      id,
      dto.influencer_ids,
    );
  }

  @Get("campaigns/:id/influencer-summary")
  @Roles(
    "organization_admin",
    "campaign_manager",
    "campaign_editor",
    "analyst",
    "viewer",
  )
  getInfluencerSummary(
    @CurrentOrganizationId() organizationId: string,
    @Param("id", UuidParamPipe) id: string,
  ) {
    return this.campaignsService.getInfluencerSummary(organizationId, id);
  }

  @Get("campaigns/:id/cascade-preview")
  @Roles("organization_admin", "campaign_manager")
  getCascadePreview(
    @CurrentOrganizationId() organizationId: string,
    @Param("id", UuidParamPipe) id: string,
  ) {
    return this.campaignsService.getCascadePreview(organizationId, id);
  }

  @Post("campaigns/:id/cascade-complete")
  @Roles("organization_admin", "campaign_manager")
  cascadeComplete(
    @CurrentOrganizationId() organizationId: string,
    @Param("id", UuidParamPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CompleteCampaignCascadeDto,
  ) {
    return this.campaignsService.completeCampaignWithCascade(
      organizationId,
      id,
      user.id,
      dto.expected_version,
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
