import { Controller, Get, Param, Post, Query } from "@nestjs/common";

import { CurrentOrganizationId } from "../../common/decorators/current-organization-id.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { UuidParamPipe } from "../../common/pipes/uuid-param.pipe";
import type { AuthenticatedUser } from "../../common/utils/authenticated-user.interface";
import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";
import { NotificationsService } from "./notifications.service";

@Controller()
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
  ) {}

  @Get("notifications")
  @Roles(
    "organization_admin",
    "campaign_manager",
    "campaign_editor",
    "analyst",
  )
  findAll(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: PaginationQueryDto,
  ) {
    return this.notificationsService.findAll(organizationId, user.id, query);
  }

  @Get("notifications/unread-count")
  @Roles(
    "organization_admin",
    "campaign_manager",
    "campaign_editor",
    "analyst",
  )
  getUnreadCount(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.notificationsService.getUnreadCount(organizationId, user.id);
  }

  @Post("notifications/read-all")
  @Roles(
    "organization_admin",
    "campaign_manager",
    "campaign_editor",
    "analyst",
  )
  markAllAsRead(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.notificationsService.markAllAsRead(organizationId, user.id);
  }

  @Post("notifications/:id/read")
  @Roles(
    "organization_admin",
    "campaign_manager",
    "campaign_editor",
    "analyst",
  )
  markAsRead(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", UuidParamPipe) id: string,
  ) {
    return this.notificationsService.markAsRead(organizationId, user.id, id);
  }
}
