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
import { QueueService } from "../../jobs/queue.service";
import { ConversationsService } from "./conversations.service";
import { BulkOutreachDto } from "./dto/bulk-outreach.dto";
import { CreateConversationDto } from "./dto/create-conversation.dto";
import { QueryByEntityDto, QueryConversationsDto } from "./dto/query-conversations.dto";
import { SendMessageDto } from "./dto/send-message.dto";

@Controller()
export class ConversationsController {
  constructor(
    private readonly conversationsService: ConversationsService,
    private readonly queueService: QueueService,
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

  @Post("bulk-outreach")
  @SkipThrottle()
  @Roles("organization_admin", "campaign_manager")
  async bulkOutreach(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: BulkOutreachDto,
  ) {
    const result = await this.queueService.enqueueBulkOutreach({
      organizationId,
      templateId: dto.template_id,
      influencerIds: dto.influencer_ids,
      senderId: user.id,
      relatedEntityType: dto.related_entity_type,
      relatedEntityId: dto.related_entity_id,
      sendEmail: dto.send_email ?? false,
    });

    return {
      job_id: result.jobId,
      total_recipients: dto.influencer_ids.length,
    };
  }
}
