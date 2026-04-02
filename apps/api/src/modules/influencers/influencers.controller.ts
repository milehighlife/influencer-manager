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
import { CreateInfluencerDto } from "./dto/create-influencer.dto";
import { QueryInfluencersDto } from "./dto/query-influencers.dto";
import { UpdateInfluencerDto } from "./dto/update-influencer.dto";
import { InfluencersService } from "./influencers.service";

@Controller()
export class InfluencersController {
  constructor(private readonly influencersService: InfluencersService) {}

  @Get("influencers")
  findAll(
    @CurrentOrganizationId() organizationId: string,
    @Query() query: QueryInfluencersDto,
  ) {
    return this.influencersService.findAll(organizationId, query);
  }

  @Get("influencers/:id/assignments")
  findAssignments(
    @CurrentOrganizationId() organizationId: string,
    @Param("id", UuidParamPipe) id: string,
  ) {
    return this.influencersService.findAssignments(organizationId, id);
  }

  @Get("influencers/:id")
  findOne(
    @CurrentOrganizationId() organizationId: string,
    @Param("id", UuidParamPipe) id: string,
  ) {
    return this.influencersService.findOne(organizationId, id);
  }

  @Post("influencers")
  @Roles("organization_admin", "campaign_manager")
  create(
    @CurrentOrganizationId() organizationId: string,
    @Body() dto: CreateInfluencerDto,
  ) {
    return this.influencersService.create(organizationId, dto);
  }

  @Patch("influencers/:id")
  @Roles("organization_admin", "campaign_manager")
  update(
    @CurrentOrganizationId() organizationId: string,
    @Param("id", UuidParamPipe) id: string,
    @Body() dto: UpdateInfluencerDto,
  ) {
    return this.influencersService.update(organizationId, id, dto);
  }

  @Delete("influencers/:id")
  @Roles("organization_admin", "campaign_manager")
  remove(
    @CurrentOrganizationId() organizationId: string,
    @Param("id", UuidParamPipe) id: string,
  ) {
    return this.influencersService.remove(organizationId, id);
  }
}
