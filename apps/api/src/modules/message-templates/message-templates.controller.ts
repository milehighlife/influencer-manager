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
import { MessageTemplatesService } from "./message-templates.service";
import { CreateMessageTemplateDto } from "./dto/create-message-template.dto";
import { QueryMessageTemplatesDto } from "./dto/query-message-templates.dto";
import { UpdateMessageTemplateDto } from "./dto/update-message-template.dto";

@Controller()
export class MessageTemplatesController {
  constructor(
    private readonly messageTemplatesService: MessageTemplatesService,
  ) {}

  @Get("message-templates")
  @Roles(
    "organization_admin",
    "campaign_manager",
    "campaign_editor",
  )
  findAll(
    @CurrentOrganizationId() organizationId: string,
    @Query() query: QueryMessageTemplatesDto,
  ) {
    return this.messageTemplatesService.findAll(organizationId, query);
  }

  @Get("message-templates/:id")
  @Roles(
    "organization_admin",
    "campaign_manager",
    "campaign_editor",
  )
  findOne(
    @CurrentOrganizationId() organizationId: string,
    @Param("id", UuidParamPipe) id: string,
  ) {
    return this.messageTemplatesService.findOne(organizationId, id);
  }

  @Post("message-templates")
  @Roles("organization_admin", "campaign_manager")
  create(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateMessageTemplateDto,
  ) {
    return this.messageTemplatesService.create(organizationId, user.id, dto);
  }

  @Post("message-templates/:id/clone")
  @Roles("organization_admin", "campaign_manager")
  clone(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", UuidParamPipe) id: string,
  ) {
    return this.messageTemplatesService.clone(organizationId, id, user.id);
  }

  @Patch("message-templates/:id")
  @Roles("organization_admin", "campaign_manager")
  update(
    @CurrentOrganizationId() organizationId: string,
    @Param("id", UuidParamPipe) id: string,
    @Body() dto: UpdateMessageTemplateDto,
  ) {
    return this.messageTemplatesService.update(organizationId, id, dto);
  }

  @Delete("message-templates/:id")
  @Roles("organization_admin", "campaign_manager")
  remove(
    @CurrentOrganizationId() organizationId: string,
    @Param("id", UuidParamPipe) id: string,
  ) {
    return this.messageTemplatesService.remove(organizationId, id);
  }
}
