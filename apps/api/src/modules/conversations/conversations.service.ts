import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { ConversationEntityType, Prisma } from "@prisma/client";

import { PrismaService } from "../../database/prisma.service";
import {
  buildPaginatedResponse,
  getPagination,
} from "../../common/utils/pagination.util";
import { CreateConversationDto } from "./dto/create-conversation.dto";
import { QueryConversationsDto } from "./dto/query-conversations.dto";
import { SendMessageDto } from "./dto/send-message.dto";

@Injectable()
export class ConversationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    organizationId: string,
    userId: string,
    query: QueryConversationsDto,
  ) {
    const { page, limit, skip, take } = getPagination(query);

    const where: Prisma.ConversationWhereInput = {
      organization_id: organizationId,
      participants: {
        some: { user_id: userId },
      },
      ...(query.search
        ? {
            subject: {
              contains: query.search.trim(),
              mode: "insensitive",
            },
          }
        : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.conversation.findMany({
        where,
        include: {
          messages: {
            orderBy: { created_at: "desc" },
            take: 1,
            select: {
              id: true,
              body: true,
              sender_type: true,
              created_at: true,
            },
          },
          participants: {
            where: { user_id: userId },
            select: { last_read_at: true },
            take: 1,
          },
          _count: { select: { participants: true } },
        },
        orderBy: { updated_at: "desc" },
        skip,
        take,
      }),
      this.prisma.conversation.count({ where }),
    ]);

    const data = rows.map(({ messages, participants, _count, ...conv }) => {
      const lastMessage = messages[0] ?? null;
      const lastReadAt = participants[0]?.last_read_at;
      const unread = lastMessage
        ? !lastReadAt || lastReadAt < lastMessage.created_at
        : false;

      return {
        ...conv,
        last_message: lastMessage
          ? {
              id: lastMessage.id,
              body:
                lastMessage.body.length > 120
                  ? lastMessage.body.slice(0, 120) + "..."
                  : lastMessage.body,
              sender_type: lastMessage.sender_type,
              created_at: lastMessage.created_at,
            }
          : null,
        unread,
        participant_count: _count.participants,
      };
    });

    const filtered =
      query.unread !== undefined
        ? data.filter((c) => c.unread === query.unread)
        : data;

    return buildPaginatedResponse(filtered, total, page, limit);
  }

  async create(
    organizationId: string,
    userId: string,
    dto: CreateConversationDto,
  ) {
    const influencer = await this.prisma.influencer.findFirst({
      where: { id: dto.influencer_id, organization_id: organizationId },
    });

    if (!influencer) {
      throw new NotFoundException("Influencer not found.");
    }

    return this.prisma.$transaction(async (tx) => {
      const conversation = await tx.conversation.create({
        data: {
          organization_id: organizationId,
          subject: dto.subject,
          related_entity_type: dto.related_entity_type,
          related_entity_id: dto.related_entity_id,
          created_by_id: userId,
          participants: {
            create: [
              { user_id: userId },
              { influencer_id: dto.influencer_id },
            ],
          },
        },
        include: {
          participants: {
            include: {
              user: { select: { id: true, full_name: true, email: true } },
              influencer: { select: { id: true, name: true, email: true } },
            },
          },
        },
      });

      if (dto.initial_message) {
        await tx.message.create({
          data: {
            conversation_id: conversation.id,
            sender_id: userId,
            sender_type: "user",
            body: dto.initial_message,
          },
        });
      }

      return conversation;
    });
  }

  async findOne(organizationId: string, id: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id, organization_id: organizationId },
      include: {
        participants: {
          include: {
            user: { select: { id: true, full_name: true, email: true } },
            influencer: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException("Conversation not found.");
    }

    return conversation;
  }

  async findMessages(
    organizationId: string,
    userId: string,
    conversationId: string,
    query: { page?: number; limit?: number },
  ) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, organization_id: organizationId },
    });

    if (!conversation) {
      throw new NotFoundException("Conversation not found.");
    }

    await this.assertParticipant(conversationId, userId);

    const { page, limit, skip, take } = getPagination({
      page: query.page ?? 1,
      limit: query.limit ?? 20,
    });

    const where: Prisma.MessageWhereInput = {
      conversation_id: conversationId,
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.message.findMany({
        where,
        include: {
          sender: { select: { id: true, full_name: true } },
          attachments: true,
        },
        orderBy: { created_at: "asc" },
        skip,
        take,
      }),
      this.prisma.message.count({ where }),
    ]);

    const data = rows.map(({ sender, ...msg }) => ({
      ...msg,
      sender_name: sender?.full_name ?? null,
    }));

    return buildPaginatedResponse(data, total, page, limit);
  }

  async sendMessage(
    organizationId: string,
    userId: string,
    conversationId: string,
    dto: SendMessageDto,
  ) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, organization_id: organizationId },
    });

    if (!conversation) {
      throw new NotFoundException("Conversation not found.");
    }

    await this.assertParticipant(conversationId, userId);

    return this.prisma.$transaction(async (tx) => {
      const message = await tx.message.create({
        data: {
          conversation_id: conversationId,
          sender_id: userId,
          sender_type: "user",
          body: dto.body,
          template_id: dto.template_id,
          sent_via_email: dto.sent_via_email ?? false,
        },
        include: {
          sender: { select: { id: true, full_name: true } },
          attachments: true,
        },
      });

      await tx.conversation.update({
        where: { id: conversationId },
        data: { updated_at: new Date() },
      });

      return {
        ...message,
        sender_name: message.sender?.full_name ?? null,
      };
    });
  }

  async markAsRead(
    organizationId: string,
    userId: string,
    conversationId: string,
  ) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, organization_id: organizationId },
    });

    if (!conversation) {
      throw new NotFoundException("Conversation not found.");
    }

    const participant = await this.prisma.conversationParticipant.findFirst({
      where: { conversation_id: conversationId, user_id: userId },
    });

    if (!participant) {
      throw new ForbiddenException("Not a participant in this conversation.");
    }

    await this.prisma.conversationParticipant.update({
      where: { id: participant.id },
      data: { last_read_at: new Date() },
    });

    return { success: true };
  }

  async findByEntity(
    organizationId: string,
    entityType: ConversationEntityType,
    entityId: string,
  ) {
    return this.prisma.conversation.findMany({
      where: {
        organization_id: organizationId,
        related_entity_type: entityType,
        related_entity_id: entityId,
      },
      include: {
        _count: { select: { participants: true, messages: true } },
      },
      orderBy: { updated_at: "desc" },
    });
  }

  async createSystemMessage(conversationId: string, body: string) {
    return this.prisma.message.create({
      data: {
        conversation_id: conversationId,
        sender_type: "system",
        body,
      },
    });
  }

  async findOrCreateConversation(
    organizationId: string,
    userId: string,
    influencerId: string,
    subject: string,
    entityType?: ConversationEntityType,
    entityId?: string,
  ) {
    const existingWhere: Prisma.ConversationWhereInput = {
      organization_id: organizationId,
      participants: {
        some: { user_id: userId },
      },
      AND: {
        participants: {
          some: { influencer_id: influencerId },
        },
      },
      ...(entityType && entityId
        ? { related_entity_type: entityType, related_entity_id: entityId }
        : {}),
    };

    const existing = await this.prisma.conversation.findFirst({
      where: existingWhere,
      orderBy: { updated_at: "desc" },
    });

    if (existing) {
      return existing;
    }

    return this.prisma.conversation.create({
      data: {
        organization_id: organizationId,
        subject,
        related_entity_type: entityType,
        related_entity_id: entityId,
        created_by_id: userId,
        participants: {
          create: [
            { user_id: userId },
            { influencer_id: influencerId },
          ],
        },
      },
    });
  }

  private async assertParticipant(conversationId: string, userId: string) {
    const participant = await this.prisma.conversationParticipant.findFirst({
      where: { conversation_id: conversationId, user_id: userId },
    });

    if (!participant) {
      throw new ForbiddenException("Not a participant in this conversation.");
    }

    return participant;
  }
}
