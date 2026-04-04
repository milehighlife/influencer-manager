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
import type { AuthenticatedUser } from "../../common/utils/authenticated-user.interface";
import { UuidParamPipe } from "../../common/pipes/uuid-param.pipe";
import { CampaignAssetsService } from "./campaign-assets.service";
import { CreateCampaignAssetDto } from "./dto/create-campaign-asset.dto";
import { LinkActionsDto } from "./dto/link-actions.dto";
import { QueryCampaignAssetsDto } from "./dto/query-campaign-assets.dto";
import { QueryClientAssetsDto } from "./dto/query-client-assets.dto";
import { ReorderAssetsDto } from "./dto/reorder-assets.dto";
import { UpdateCampaignAssetDto } from "./dto/update-campaign-asset.dto";

@Controller()
export class CampaignAssetsController {
  constructor(private readonly campaignAssetsService: CampaignAssetsService) {}

  @Post("campaigns/:campaignId/assets")
  @Roles("organization_admin", "campaign_manager")
  create(
    @CurrentOrganizationId() organizationId: string,
    @Param("campaignId", UuidParamPipe) campaignId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCampaignAssetDto,
  ) {
    return this.campaignAssetsService.create(
      organizationId,
      campaignId,
      user.id,
      dto,
    );
  }

  @Get("campaigns/:campaignId/assets")
  @Roles(
    "organization_admin",
    "campaign_manager",
    "campaign_editor",
    "analyst",
    "viewer",
  )
  findAll(
    @CurrentOrganizationId() organizationId: string,
    @Param("campaignId", UuidParamPipe) campaignId: string,
    @Query() query: QueryCampaignAssetsDto,
  ) {
    return this.campaignAssetsService.findAll(organizationId, campaignId, query);
  }

  @Patch("campaigns/:campaignId/assets/:assetId")
  @Roles("organization_admin", "campaign_manager", "campaign_editor")
  update(
    @CurrentOrganizationId() organizationId: string,
    @Param("campaignId", UuidParamPipe) campaignId: string,
    @Param("assetId", UuidParamPipe) assetId: string,
    @Body() dto: UpdateCampaignAssetDto,
  ) {
    return this.campaignAssetsService.update(
      organizationId,
      campaignId,
      assetId,
      dto,
    );
  }

  @Delete("campaigns/:campaignId/assets/:assetId")
  @Roles("organization_admin", "campaign_manager")
  remove(
    @CurrentOrganizationId() organizationId: string,
    @Param("campaignId", UuidParamPipe) campaignId: string,
    @Param("assetId", UuidParamPipe) assetId: string,
  ) {
    return this.campaignAssetsService.remove(
      organizationId,
      campaignId,
      assetId,
    );
  }

  @Post("campaigns/:campaignId/assets/:assetId/link-actions")
  @Roles("organization_admin", "campaign_manager")
  linkActions(
    @CurrentOrganizationId() organizationId: string,
    @Param("campaignId", UuidParamPipe) campaignId: string,
    @Param("assetId", UuidParamPipe) assetId: string,
    @Body() dto: LinkActionsDto,
  ) {
    return this.campaignAssetsService.linkActions(
      organizationId,
      campaignId,
      assetId,
      dto.action_ids,
    );
  }

  @Post("campaigns/:campaignId/assets/reorder")
  @Roles("organization_admin", "campaign_manager")
  reorder(
    @CurrentOrganizationId() organizationId: string,
    @Param("campaignId", UuidParamPipe) campaignId: string,
    @Body() dto: ReorderAssetsDto,
  ) {
    return this.campaignAssetsService.reorder(
      organizationId,
      campaignId,
      dto.items,
    );
  }

  @Get("clients/:clientId/assets")
  @Roles(
    "organization_admin",
    "campaign_manager",
    "campaign_editor",
    "analyst",
    "viewer",
  )
  findClientAssets(
    @CurrentOrganizationId() organizationId: string,
    @Param("clientId", UuidParamPipe) clientId: string,
    @Query() query: QueryClientAssetsDto,
  ) {
    return this.campaignAssetsService.findClientAssets(
      organizationId,
      clientId,
      query,
    );
  }
}
