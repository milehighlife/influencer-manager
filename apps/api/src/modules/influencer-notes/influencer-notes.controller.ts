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
import { CreateInfluencerNoteDto } from "./dto/create-influencer-note.dto";
import { QueryInfluencerNotesDto } from "./dto/query-influencer-notes.dto";
import { UpdateInfluencerNoteDto } from "./dto/update-influencer-note.dto";
import { InfluencerNotesService } from "./influencer-notes.service";

@Controller("influencer-notes")
export class InfluencerNotesController {
  constructor(
    private readonly influencerNotesService: InfluencerNotesService,
  ) {}

  @Get()
  findAll(
    @CurrentOrganizationId() organizationId: string,
    @Query() query: QueryInfluencerNotesDto,
  ) {
    return this.influencerNotesService.findAll(organizationId, query);
  }

  @Get(":id")
  findOne(
    @CurrentOrganizationId() organizationId: string,
    @Param("id", UuidParamPipe) id: string,
  ) {
    return this.influencerNotesService.findOne(organizationId, id);
  }

  @Post()
  @Roles("organization_admin", "campaign_manager")
  create(
    @CurrentOrganizationId() organizationId: string,
    @Body() dto: CreateInfluencerNoteDto,
  ) {
    return this.influencerNotesService.create(organizationId, dto);
  }

  @Patch(":id")
  @Roles("organization_admin", "campaign_manager")
  update(
    @CurrentOrganizationId() organizationId: string,
    @Param("id", UuidParamPipe) id: string,
    @Body() dto: UpdateInfluencerNoteDto,
  ) {
    return this.influencerNotesService.update(organizationId, id, dto);
  }

  @Delete(":id")
  @Roles("organization_admin", "campaign_manager")
  remove(
    @CurrentOrganizationId() organizationId: string,
    @Param("id", UuidParamPipe) id: string,
  ) {
    return this.influencerNotesService.remove(organizationId, id);
  }
}
