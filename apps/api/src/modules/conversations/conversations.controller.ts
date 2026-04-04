import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from "@nestjs/common";

import { CurrentOrganizationId } from "../../common/decorators/current-organization-id.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { UuidParamPipe } from "../../common/pipes/uuid-param.pipe";
import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";
import type { AuthenticatedUser } from "../../common/utils/authenticated-user.interface";
import { SkipThrottle } from "@nestjs/throttler";
import { BulkOutreachProcessor } from "../../jobs/processors/bulk-outreach.processor";
import { ConversationsService } from "./conversations.service";
import { BulkOutreachDto } from "./dto/bulk-outreach.dto";
import { CreateConversationDto } from "./dto/create-conversation.dto";
import { QueryByEntityDto, QueryConversationsDto } from "./dto/query-conversations.dto";
import { SendMessageDto } from "./dto/send-message.dto";

@Controller()
export class ConversationsController {
  constructor(
    private readonly conversationsService: ConversationsService,
    private readonly bulkOutreachProcessor: BulkOutreachProcessor,
  ) {}

  @Get("conversations")
  @Roles("organization_admin", "campaign_manager", "campaign_editor", "analyst")
  findAll(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryConversationsDto,
  ) {
    return this.conversationsService.findAll(organizationId, user.id, query);
  }

  @Get("conversations/by-influencer/:influencerId")
  @Roles("organization_admin", "campaign_manager", "campaign_editor", "analyst")
  findByInfluencer(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("influencerId", UuidParamPipe) influencerId: string,
  ) {
    return this.conversationsService.findByInfluencer(
      organizationId,
      user.id,
      influencerId,
    );
  }

  @Get("conversations/by-entity")
  @Roles("organization_admin", "campaign_manager", "campaign_editor", "analyst")
  findByEntity(
    @CurrentOrganizationId() organizationId: string,
    @Query() query: QueryByEntityDto,
  ) {
    return this.conversationsService.findByEntity(
      organizationId,
      query.entity_type,
      query.entity_id,
    );
  }

  @Post("conversations/bulk-archive")
  @Roles("organization_admin", "campaign_manager", "campaign_editor")
  bulkArchive(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { conversation_ids: string[] },
  ) {
    return this.conversationsService.bulkArchive(
      body.conversation_ids,
      user.id,
    );
  }

  @Get("conversations/unread-count")
  @Roles("organization_admin", "campaign_manager", "campaign_editor", "analyst")
  getUnreadCount(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.conversationsService.getUnreadCount(organizationId, user.id);
  }

  @Post("conversations/bulk-action-all")
  @Roles("organization_admin", "campaign_manager", "campaign_editor")
  bulkActionAll(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { action: "read" | "unread" | "archive"; status?: string; search?: string },
  ) {
    return this.conversationsService.bulkActionAll(
      organizationId,
      user.id,
      body.action,
      { status: body.status, search: body.search },
    );
  }

  @Post("conversations/bulk-read")
  @Roles("organization_admin", "campaign_manager", "campaign_editor")
  bulkMarkRead(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { conversation_ids: string[] },
  ) {
    return this.conversationsService.bulkMarkRead(
      body.conversation_ids,
      user.id,
    );
  }

  @Post("conversations/bulk-unread")
  @Roles("organization_admin", "campaign_manager", "campaign_editor")
  bulkMarkUnread(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { conversation_ids: string[] },
  ) {
    return this.conversationsService.bulkMarkUnread(
      body.conversation_ids,
      user.id,
    );
  }

  @Get("conversations/batch-groups")
  @Roles("organization_admin", "campaign_manager", "campaign_editor", "analyst")
  findBatchGroups(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.conversationsService.findBatchGroups(organizationId, user.id);
  }

  @Get("conversations/batch/:batchId")
  @Roles("organization_admin", "campaign_manager", "campaign_editor", "analyst")
  findBatchConversations(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("batchId", UuidParamPipe) batchId: string,
  ) {
    return this.conversationsService.findBatchConversations(
      organizationId,
      user.id,
      batchId,
    );
  }

  @Get("conversations/:id")
  @Roles("organization_admin", "campaign_manager", "campaign_editor", "analyst")
  findOne(
    @CurrentOrganizationId() organizationId: string,
    @Param("id", UuidParamPipe) id: string,
  ) {
    return this.conversationsService.findOne(organizationId, id);
  }

  @Post("conversations")
  @Roles("organization_admin", "campaign_manager")
  create(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateConversationDto,
  ) {
    return this.conversationsService.create(organizationId, user.id, dto);
  }

  @Get("conversations/:id/messages")
  @Roles("organization_admin", "campaign_manager", "campaign_editor", "analyst")
  findMessages(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", UuidParamPipe) id: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.conversationsService.findMessages(
      organizationId,
      user.id,
      id,
      query,
    );
  }

  @Post("conversations/:id/messages")
  @Roles("organization_admin", "campaign_manager", "campaign_editor")
  sendMessage(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", UuidParamPipe) id: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.conversationsService.sendMessage(
      organizationId,
      user.id,
      id,
      dto,
    );
  }

  @Post("conversations/:id/read")
  @Roles("organization_admin", "campaign_manager", "campaign_editor", "analyst")
  markAsRead(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", UuidParamPipe) id: string,
  ) {
    return this.conversationsService.markAsRead(organizationId, user.id, id);
  }

  @Post("conversations/:id/archive")
  @Roles("organization_admin", "campaign_manager", "campaign_editor")
  archive(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", UuidParamPipe) id: string,
  ) {
    return this.conversationsService.archiveConversation(id, user.id);
  }

  @Post("conversations/:id/unarchive")
  @Roles("organization_admin", "campaign_manager", "campaign_editor")
  unarchive(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", UuidParamPipe) id: string,
  ) {
    return this.conversationsService.unarchiveConversation(id, user.id);
  }

  @Post("conversations/:id/snooze")
  @Roles("organization_admin", "campaign_manager", "campaign_editor")
  snooze(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", UuidParamPipe) id: string,
    @Body() body: { until: string },
  ) {
    return this.conversationsService.snoozeConversation(
      id,
      user.id,
      new Date(body.until),
    );
  }

  @Post("bulk-outreach")
  @SkipThrottle()
  @Roles("organization_admin", "campaign_manager")
  async bulkOutreach(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: BulkOutreachDto,
  ) {
    const result = await this.bulkOutreachProcessor.process({
      organizationId,
      templateId: dto.template_id ?? "",
      customSubject: dto.subject,
      customBody: dto.body,
      influencerIds: dto.influencer_ids,
      senderId: user.id,
      relatedEntityType: dto.related_entity_type,
      relatedEntityId: dto.related_entity_id,
      sendEmail: dto.send_email ?? false,
    });

    return {
      job_id: "direct",
      total_recipients: dto.influencer_ids.length,
      sent: result.sent,
      failed: result.failed,
    };
  }
}
