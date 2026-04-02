import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from "@nestjs/common";

import { CurrentOrganizationId } from "../../common/decorators/current-organization-id.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { UuidParamPipe } from "../../common/pipes/uuid-param.pipe";
import { CreateOrganizationDto } from "./dto/create-organization.dto";
import { UpdateOrganizationDto } from "./dto/update-organization.dto";
import { OrganizationsService } from "./organizations.service";

@Controller("organizations")
export class OrganizationsController {
  constructor(
    private readonly organizationsService: OrganizationsService,
  ) {}

  @Get()
  findAll(@CurrentOrganizationId() organizationId: string) {
    return this.organizationsService.findAll(organizationId);
  }

  @Get(":id")
  findOne(
    @CurrentOrganizationId() organizationId: string,
    @Param("id", UuidParamPipe) id: string,
  ) {
    return this.organizationsService.findOne(organizationId, id);
  }

  @Post()
  @Roles("organization_admin")
  create(
    @CurrentOrganizationId() organizationId: string,
    @Body() dto: CreateOrganizationDto,
  ) {
    return this.organizationsService.create(organizationId, dto);
  }

  @Patch(":id")
  @Roles("organization_admin")
  update(
    @CurrentOrganizationId() organizationId: string,
    @Param("id", UuidParamPipe) id: string,
    @Body() dto: UpdateOrganizationDto,
  ) {
    return this.organizationsService.update(organizationId, id, dto);
  }

  @Delete(":id")
  @Roles("organization_admin")
  remove(
    @CurrentOrganizationId() organizationId: string,
    @Param("id", UuidParamPipe) id: string,
  ) {
    return this.organizationsService.remove(organizationId, id);
  }
}
