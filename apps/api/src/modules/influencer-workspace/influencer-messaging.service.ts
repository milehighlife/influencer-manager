import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import {
  buildPaginatedResponse,
  getPagination,
} from "../../common/utils/pagination.util";
import type { AuthenticatedUser } from "../../common/utils/authenticated-user.interface";
import { PrismaService } from "../../database/prisma.service";
import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";

@Injectable()
export class InfluencerMessagingService {
  constructor(private readonly prisma: PrismaService) {}

  private getInfluencerId(user: AuthenticatedUser) {
    if (!user.influencerId) {
      throw new ForbiddenException("No influencer profile linked.");
    }
    return user.influencerId;
  }

  async listConversations(
    organizationId: string,
    user: AuthenticatedUser,
    query: PaginationQueryDto,
  ) {
    const influencerId = this.getInfluencerId(user);
    const { page, limit, skip, take } = getPagination(query);

    const where = {
      organization_id: organizationId,
      participants: {
        some: { influencer_id: influencerId },
      },
    };

    const [conversations, total] = await this.prisma.$transaction([
      this.prisma.conversation.findMany({
        where,
        skip,
        take,
        orderBy: { updated_at: "desc" },
        include: {
          messages: {
            orderBy: { created_at: "desc" },
            take: 1,
            include: {
              sender: { select: { full_name: true } },
            },
          },
          participants: {
            where: { influencer_id: influencerId },
            select: { last_read_at: true },
          },
          _count: { select: { participants: true } },
        },
      }),
      this.prisma.conversation.count({ where }),
    ]);

    const data = conversations.map((c) => {
      const lastMsg = c.messages[0] ?? null;
      const participant = c.participants[0];
      const unread = lastMsg
        ? !participant?.last_read_at ||
          participant.last_read_at < lastMsg.created_at
        : false;

      return {
        id: c.id,
        subject: c.subject,
        related_entity_type: c.related_entity_type,
        related_entity_id: c.related_entity_id,
        created_at: c.created_at.toISOString(),
        updated_at: c.updated_at.toISOString(),
        last_message: lastMsg
          ? {
              body: lastMsg.body.slice(0, 200),
              sender_type: lastMsg.sender_type,
              sender_name: lastMsg.sender?.full_name ?? null,
              created_at: lastMsg.created_at.toISOString(),
            }
          : null,
        unread,
        participant_count: c._count.participants,
      };
    });

    return buildPaginatedResponse(data, total, page, limit);
  }

  async getMessages(
    organizationId: string,
    user: AuthenticatedUser,
    conversationId: string,
    query: PaginationQueryDto,
  ) {
    const influencerId = this.getInfluencerId(user);
    const { page, limit, skip, take } = getPagination(query);

    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        organization_id: organizationId,
        participants: { some: { influencer_id: influencerId } },
      },
    });

    if (!conversation) {
      throw new NotFoundException("Conversation not found.");
    }

    const [messages, total] = await this.prisma.$transaction([
      this.prisma.message.findMany({
        where: { conversation_id: conversationId },
        skip,
        take,
        orderBy: { created_at: "asc" },
        include: {
          sender: { select: { full_name: true } },
          attachments: true,
        },
      }),
      this.prisma.message.count({ where: { conversation_id: conversationId } }),
    ]);

    const data = messages.map((m) => ({
      id: m.id,
      conversation_id: m.conversation_id,
      sender_id: m.sender_id,
      sender_type: m.sender_type,
      sender_name: m.sender?.full_name ?? null,
      body: m.body,
      template_id: m.template_id,
      sent_via_email: m.sent_via_email,
      created_at: m.created_at.toISOString(),
      attachments: m.attachments.map((a) => ({
        id: a.id,
        file_name: a.file_name,
        file_url: a.file_url,
        file_type: a.file_type,
        file_size_bytes: a.file_size_bytes,
      })),
    }));

    return buildPaginatedResponse(data, total, page, limit);
  }

  async sendMessage(
    organizationId: string,
    user: AuthenticatedUser,
    conversationId: string,
    body: string,
  ) {
    const influencerId = this.getInfluencerId(user);

    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        organization_id: organizationId,
        participants: { some: { influencer_id: influencerId } },
      },
    });

    if (!conversation) {
      throw new NotFoundException("Conversation not found.");
    }

    const message = await this.prisma.message.create({
      data: {
        conversation_id: conversationId,
        sender_type: "influencer",
        body,
      },
    });

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { updated_at: new Date() },
    });

    // Create notifications for other participants (users)
    const otherParticipants = await this.prisma.conversationParticipant.findMany(
      {
        where: {
          conversation_id: conversationId,
          user_id: { not: null },
        },
        select: { user_id: true },
      },
    );

    if (otherParticipants.length > 0) {
      await this.prisma.notification.createMany({
        data: otherParticipants
          .filter((p) => p.user_id)
          .map((p) => ({
            organization_id: organizationId,
            recipient_id: p.user_id!,
            recipient_type: "user" as const,
            type: "new_message" as const,
            title: `Reply in: ${conversation.subject}`,
            body: body.slice(0, 200),
            related_entity_type: "conversation",
            related_entity_id: conversationId,
          })),
      });
    }

    return {
      id: message.id,
      conversation_id: message.conversation_id,
      sender_id: message.sender_id,
      sender_type: message.sender_type,
      body: message.body,
      created_at: message.created_at.toISOString(),
    };
  }

  async markAsRead(
    organizationId: string,
    user: AuthenticatedUser,
    conversationId: string,
  ) {
    const influencerId = this.getInfluencerId(user);

    await this.prisma.conversationParticipant.updateMany({
      where: {
        conversation_id: conversationId,
        influencer_id: influencerId,
      },
      data: { last_read_at: new Date() },
    });

    return { success: true };
  }

  async listNotifications(
    organizationId: string,
    user: AuthenticatedUser,
    query: PaginationQueryDto,
  ) {
    const influencerId = this.getInfluencerId(user);
    const { page, limit, skip, take } = getPagination(query);

    const where = {
      organization_id: organizationId,
      recipient_id: influencerId,
      recipient_type: "influencer" as const,
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        skip,
        take,
        orderBy: { created_at: "desc" },
      }),
      this.prisma.notification.count({ where }),
    ]);

    return buildPaginatedResponse(
      items.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        related_entity_type: n.related_entity_type,
        related_entity_id: n.related_entity_id,
        read_at: n.read_at?.toISOString() ?? null,
        created_at: n.created_at.toISOString(),
      })),
      total,
      page,
      limit,
    );
  }

  async getUnreadCount(
    organizationId: string,
    user: AuthenticatedUser,
  ) {
    const influencerId = this.getInfluencerId(user);

    const unread = await this.prisma.notification.count({
      where: {
        organization_id: organizationId,
        recipient_id: influencerId,
        recipient_type: "influencer",
        read_at: null,
      },
    });

    return { unread };
  }

  async markAllNotificationsRead(
    organizationId: string,
    user: AuthenticatedUser,
  ) {
    const influencerId = this.getInfluencerId(user);

    await this.prisma.notification.updateMany({
      where: {
        organization_id: organizationId,
        recipient_id: influencerId,
        recipient_type: "influencer",
        read_at: null,
      },
      data: { read_at: new Date() },
    });

    return { success: true };
  }
}
