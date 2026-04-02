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
import { UuidParamPipe } from "../../common/pipes/uuid-param.pipe";
import type { AuthenticatedUser } from "../../common/utils/authenticated-user.interface";
import { CreateDeliverableDto } from "./dto/create-deliverable.dto";
import { QueryDeliverablesDto } from "./dto/query-deliverables.dto";
import { RejectDeliverableDto } from "./dto/reject-deliverable.dto";
import { UpdateDeliverableDto } from "./dto/update-deliverable.dto";
import { DeliverablesService } from "./deliverables.service";

@Controller("deliverables")
export class DeliverablesController {
  constructor(private readonly deliverablesService: DeliverablesService) {}

  @Get()
  findAll(
    @CurrentOrganizationId() organizationId: string,
    @Query() query: QueryDeliverablesDto,
  ) {
    return this.deliverablesService.findAll(organizationId, query);
  }

  @Get(":id")
  findOne(
    @CurrentOrganizationId() organizationId: string,
    @Param("id", UuidParamPipe) id: string,
  ) {
    return this.deliverablesService.findOne(organizationId, id);
  }

  @Post()
  @Roles("organization_admin", "campaign_manager")
  create(
    @CurrentOrganizationId() organizationId: string,
    @Body() dto: CreateDeliverableDto,
  ) {
    return this.deliverablesService.create(organizationId, dto);
  }

  @Patch(":id")
  @Roles("organization_admin", "campaign_manager")
  update(
    @CurrentOrganizationId() organizationId: string,
    @Param("id", UuidParamPipe) id: string,
    @Body() dto: UpdateDeliverableDto,
  ) {
    return this.deliverablesService.update(organizationId, id, dto);
  }

  @Post(":id/approve")
  @Roles("organization_admin", "campaign_manager")
  approve(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", UuidParamPipe) id: string,
  ) {
    return this.deliverablesService.approve(organizationId, id, user);
  }

  @Post(":id/reject")
  @Roles("organization_admin", "campaign_manager")
  reject(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", UuidParamPipe) id: string,
    @Body() dto: RejectDeliverableDto,
  ) {
    return this.deliverablesService.reject(organizationId, id, user, dto);
  }

  @Delete(":id")
  @Roles("organization_admin", "campaign_manager")
  remove(
    @CurrentOrganizationId() organizationId: string,
    @Param("id", UuidParamPipe) id: string,
  ) {
    return this.deliverablesService.remove(organizationId, id);
  }
}
