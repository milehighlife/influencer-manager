import { Injectable } from "@nestjs/common";
import type {
  NotificationRecipientType,
  NotificationType,
} from "@prisma/client";

import {
  buildPaginatedResponse,
  getPagination,
} from "../../common/utils/pagination.util";
import type { PaginationQueryDto } from "../../common/dto/pagination-query.dto";
import { PrismaService } from "../../database/prisma.service";

interface CreateNotificationParams {
  organizationId: string;
  recipientId: string;
  recipientType: NotificationRecipientType;
  type: NotificationType;
  title: string;
  body: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
}

interface NotifyConversationParticipantsParams {
  organizationId: string;
  conversationId: string;
  excludeUserId: string;
  title: string;
  body: string;
}

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    organizationId: string,
    userId: string,
    query: PaginationQueryDto,
  ) {
    const { page, limit, skip, take } = getPagination(query);
    const where = {
      organization_id: organizationId,
      recipient_id: userId,
      recipient_type: "user" as NotificationRecipientType,
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        skip,
        take,
        orderBy: { created_at: "desc" },
      }),
      this.prisma.notification.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, page, limit);
  }

  async getUnreadCount(organizationId: string, userId: string) {
    const unread = await this.prisma.notification.count({
      where: {
        organization_id: organizationId,
        recipient_id: userId,
        recipient_type: "user",
        read_at: null,
      },
    });

    return { unread };
  }

  async markAsRead(organizationId: string, userId: string, id: string) {
    return this.prisma.notification.updateMany({
      where: {
        id,
        organization_id: organizationId,
        recipient_id: userId,
        recipient_type: "user",
      },
      data: { read_at: new Date() },
    });
  }

  async markAllAsRead(organizationId: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: {
        organization_id: organizationId,
        recipient_id: userId,
        recipient_type: "user",
        read_at: null,
      },
      data: { read_at: new Date() },
    });
  }

  async createNotification(params: CreateNotificationParams) {
    return this.prisma.notification.create({
      data: {
        organization_id: params.organizationId,
        recipient_id: params.recipientId,
        recipient_type: params.recipientType,
        type: params.type,
        title: params.title,
        body: params.body,
        related_entity_type: params.relatedEntityType,
        related_entity_id: params.relatedEntityId,
      },
    });
  }

  async notifyConversationParticipants(
    params: NotifyConversationParticipantsParams,
  ) {
    const participants =
      await this.prisma.conversationParticipant.findMany({
        where: { conversation_id: params.conversationId },
        select: { user_id: true, influencer_id: true },
      });

    const notifications = participants
      .filter(
        (p) =>
          (p.user_id && p.user_id !== params.excludeUserId) ||
          p.influencer_id,
      )
      .map((p) => ({
        organization_id: params.organizationId,
        recipient_id: (p.user_id ?? p.influencer_id)!,
        recipient_type: (p.user_id
          ? "user"
          : "influencer") as NotificationRecipientType,
        type: "new_message" as NotificationType,
        title: params.title,
        body: params.body,
        related_entity_type: "conversation",
        related_entity_id: params.conversationId,
      }));

    if (notifications.length === 0) {
      return [];
    }

    await this.prisma.notification.createMany({ data: notifications });

    return notifications;
  }
}
