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
import { CreateInfluencerRatingDto } from "./dto/create-influencer-rating.dto";
import { QueryInfluencerRatingsDto } from "./dto/query-influencer-ratings.dto";
import { UpdateInfluencerRatingDto } from "./dto/update-influencer-rating.dto";
import { InfluencerRatingsService } from "./influencer-ratings.service";

@Controller("influencer-ratings")
export class InfluencerRatingsController {
  constructor(
    private readonly influencerRatingsService: InfluencerRatingsService,
  ) {}

  @Get()
  findAll(
    @CurrentOrganizationId() organizationId: string,
    @Query() query: QueryInfluencerRatingsDto,
  ) {
    return this.influencerRatingsService.findAll(organizationId, query);
  }

  @Get(":id")
  findOne(
    @CurrentOrganizationId() organizationId: string,
    @Param("id", UuidParamPipe) id: string,
  ) {
    return this.influencerRatingsService.findOne(organizationId, id);
  }

  @Post()
  @Roles("organization_admin", "campaign_manager")
  create(
    @CurrentOrganizationId() organizationId: string,
    @Body() dto: CreateInfluencerRatingDto,
  ) {
    return this.influencerRatingsService.create(organizationId, dto);
  }

  @Patch(":id")
  @Roles("organization_admin", "campaign_manager")
  update(
    @CurrentOrganizationId() organizationId: string,
    @Param("id", UuidParamPipe) id: string,
    @Body() dto: UpdateInfluencerRatingDto,
  ) {
    return this.influencerRatingsService.update(organizationId, id, dto);
  }

  @Delete(":id")
  @Roles("organization_admin", "campaign_manager")
  remove(
    @CurrentOrganizationId() organizationId: string,
    @Param("id", UuidParamPipe) id: string,
  ) {
    return this.influencerRatingsService.remove(organizationId, id);
  }
}
