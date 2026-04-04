import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";

import { CurrentOrganizationId } from "../../common/decorators/current-organization-id.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { UuidParamPipe } from "../../common/pipes/uuid-param.pipe";
import type { AuthenticatedUser } from "../../common/utils/authenticated-user.interface";
import { SubmitActionAssignmentDto } from "../action-assignments/dto/submit-action-assignment.dto";
import { CreateDeliverablePostDto } from "../posts/dto/create-deliverable-post.dto";
import { QueryInfluencerAssignmentsDto } from "./dto/query-influencer-assignments.dto";
import { QueryInfluencerPostsDto } from "./dto/query-influencer-posts.dto";
import { QueryInfluencerStatusDigestDto } from "./dto/query-influencer-status-digest.dto";
import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";
import { InfluencerWorkspaceService } from "./influencer-workspace.service";
import { InfluencerMessagingService } from "./influencer-messaging.service";

@Controller("influencer")
@Roles("influencer")
export class InfluencerWorkspaceController {
  constructor(
    private readonly influencerWorkspaceService: InfluencerWorkspaceService,
    private readonly influencerMessagingService: InfluencerMessagingService,
  ) {}

  @Get("assignments")
  listAssignments(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryInfluencerAssignmentsDto,
  ) {
    return this.influencerWorkspaceService.listAssignments(
      organizationId,
      user,
      query,
    );
  }

  @Get("assignments/:id")
  getAssignment(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", UuidParamPipe) id: string,
  ) {
    return this.influencerWorkspaceService.getAssignment(
      organizationId,
      user,
      id,
    );
  }

  @Post("assignments/:id/accept")
  acceptAssignment(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", UuidParamPipe) id: string,
  ) {
    return this.influencerWorkspaceService.acceptAssignment(
      organizationId,
      user,
      id,
    );
  }

  @Post("assignments/:id/start")
  startAssignment(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", UuidParamPipe) id: string,
  ) {
    return this.influencerWorkspaceService.startAssignment(
      organizationId,
      user,
      id,
    );
  }

  @Post("assignments/:id/deliverables")
  submitDeliverables(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", UuidParamPipe) id: string,
    @Body() dto: SubmitActionAssignmentDto,
  ) {
    return this.influencerWorkspaceService.submitDeliverables(
      organizationId,
      user,
      id,
      dto,
    );
  }

  @Post("deliverables/:id/posts")
  linkPost(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", UuidParamPipe) id: string,
    @Body() dto: CreateDeliverablePostDto,
  ) {
    return this.influencerWorkspaceService.linkPost(
      organizationId,
      user,
      id,
      dto,
    );
  }

  @Get("posts")
  listPosts(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryInfluencerPostsDto,
  ) {
    return this.influencerWorkspaceService.listPosts(
      organizationId,
      user,
      query,
    );
  }

  @Get("status-digest")
  getStatusDigest(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryInfluencerStatusDigestDto,
  ) {
    return this.influencerWorkspaceService.getStatusDigest(
      organizationId,
      user,
      query,
    );
  }

  @Get("posts/:id/performance")
  getPostPerformance(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", UuidParamPipe) id: string,
  ) {
    return this.influencerWorkspaceService.getPostPerformance(
      organizationId,
      user,
      id,
    );
  }

  @Get("conversations")
  listConversations(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: PaginationQueryDto,
  ) {
    return this.influencerMessagingService.listConversations(
      organizationId,
      user,
      query,
    );
  }

  @Get("conversations/:id/messages")
  getConversationMessages(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", UuidParamPipe) id: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.influencerMessagingService.getMessages(
      organizationId,
      user,
      id,
      query,
    );
  }

  @Post("conversations/:id/messages")
  sendConversationMessage(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", UuidParamPipe) id: string,
    @Body() dto: { body: string },
  ) {
    return this.influencerMessagingService.sendMessage(
      organizationId,
      user,
      id,
      dto.body,
    );
  }

  @Post("conversations/:id/read")
  markConversationRead(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", UuidParamPipe) id: string,
  ) {
    return this.influencerMessagingService.markAsRead(
      organizationId,
      user,
      id,
    );
  }

  @Get("notifications")
  listNotifications(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: PaginationQueryDto,
  ) {
    return this.influencerMessagingService.listNotifications(
      organizationId,
      user,
      query,
    );
  }

  @Get("notifications/unread-count")
  getUnreadNotificationCount(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.influencerMessagingService.getUnreadCount(
      organizationId,
      user,
    );
  }

  @Post("notifications/read-all")
  markAllNotificationsRead(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.influencerMessagingService.markAllNotificationsRead(
      organizationId,
      user,
    );
  }
}
