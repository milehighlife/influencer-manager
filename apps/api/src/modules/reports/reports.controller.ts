import { Controller, Get, Param, Post, Query } from "@nestjs/common";

import { CurrentOrganizationId } from "../../common/decorators/current-organization-id.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { UuidParamPipe } from "../../common/pipes/uuid-param.pipe";
import { SummaryFiltersDto } from "./dto/summary-filters.dto";
import { ReportsService } from "./reports.service";

@Controller("reports")
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get("posts/:id/summary")
  @Roles(
    "organization_admin",
    "campaign_manager",
    "campaign_editor",
    "analyst",
    "viewer",
  )
  getPostSummary(
    @CurrentOrganizationId() organizationId: string,
    @Param("id", UuidParamPipe) id: string,
    @Query() query: SummaryFiltersDto,
  ) {
    return this.reportsService.getPostSummary(organizationId, id, query);
  }

  @Get("actions/:id/summary")
  @Roles(
    "organization_admin",
    "campaign_manager",
    "campaign_editor",
    "analyst",
    "viewer",
  )
  getActionSummary(
    @CurrentOrganizationId() organizationId: string,
    @Param("id", UuidParamPipe) id: string,
    @Query() query: SummaryFiltersDto,
  ) {
    return this.reportsService.getActionSummary(organizationId, id, query);
  }

  @Get("missions/:id/summary")
  @Roles(
    "organization_admin",
    "campaign_manager",
    "campaign_editor",
    "analyst",
    "viewer",
  )
  getMissionSummary(
    @CurrentOrganizationId() organizationId: string,
    @Param("id", UuidParamPipe) id: string,
    @Query() query: SummaryFiltersDto,
  ) {
    return this.reportsService.getMissionSummary(organizationId, id, query);
  }

  @Get("campaigns/:id/summary")
  @Roles(
    "organization_admin",
    "campaign_manager",
    "campaign_editor",
    "analyst",
    "viewer",
  )
  getCampaignSummary(
    @CurrentOrganizationId() organizationId: string,
    @Param("id", UuidParamPipe) id: string,
    @Query() query: SummaryFiltersDto,
  ) {
    return this.reportsService.getCampaignSummary(organizationId, id, query);
  }

  @Get("influencers/:id/summary")
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
    @Query() query: SummaryFiltersDto,
  ) {
    return this.reportsService.getInfluencerSummary(organizationId, id, query);
  }

  @Post("campaigns/:id/refresh-summary")
  @Roles("organization_admin", "campaign_manager")
  refreshCampaignSummary(
    @CurrentOrganizationId() organizationId: string,
    @Param("id", UuidParamPipe) id: string,
  ) {
    return this.reportsService.refreshCampaignSummary(organizationId, id);
  }
}
