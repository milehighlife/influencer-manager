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
    const now = new Date();

    // Build participant-level filter
    const participantFilter: Prisma.ConversationParticipantWhereInput = {
      user_id: userId,
    };

    // Status filter: default to active only
    const statusFilter = query.status ?? "active";
    if (statusFilter !== "all") {
      participantFilter.status = statusFilter as "active" | "archived" | "snoozed";
      // For snoozed, only show if snoozed_until has passed
      if (statusFilter === "snoozed") {
        participantFilter.OR = [
          { snoozed_until: null },
          { snoozed_until: { lte: now } },
        ];
      }
    }

    const where: Prisma.ConversationWhereInput = {
      organization_id: organizationId,
      participants: { some: participantFilter },
      // Exclude batch conversations from individual listing (they're grouped)
      outreach_batch_id: query.show_batches ? undefined : null,
      ...(query.search
        ? {
            subject: {
              contains: query.search.trim(),
              mode: "insensitive",
            },
          }
        : {}),
      ...(query.related_entity_type
        ? { related_entity_type: query.related_entity_type as ConversationEntityType }
        : {}),
      ...(query.related_entity_id
        ? { related_entity_id: query.related_entity_id }
        : {}),
      ...(query.influencer_id
        ? { participants: { some: { influencer_id: query.influencer_id } } }
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
              sender_id: true,
              created_at: true,
            },
          },
          participants: {
            select: {
              user_id: true,
              influencer_id: true,
              last_read_at: true,
              influencer: { select: { name: true } },
            },
          },
          _count: { select: { participants: true } },
        },
        orderBy: { updated_at: "desc" },
        skip,
        take,
      }),
      this.prisma.conversation.count({ where }),
    ]);

    let data = rows.map(({ messages, participants, _count, ...conv }) => {
      const lastMessage = messages[0] ?? null;
      const userParticipant = participants.find((p) => p.user_id === userId);
      const influencerParticipant = participants.find((p) => p.influencer_id !== null);
      const lastReadAt = userParticipant?.last_read_at;
      const unread = lastMessage
        ? !lastReadAt || lastReadAt < lastMessage.created_at
        : false;
      const needsReply = lastMessage
        ? lastMessage.sender_type === "influencer"
        : false;
      const influencerName = influencerParticipant?.influencer?.name ?? null;

      return {
        ...conv,
        influencer_name: influencerName,
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
        needs_reply: needsReply,
        participant_count: _count.participants,
      };
    });

    // Client-side filters
    if (query.unread !== undefined) {
      data = data.filter((c) => c.unread === query.unread);
    }
    if (query.needs_reply !== undefined) {
      data = data.filter((c) => c.needs_reply === query.needs_reply);
    }
    if (query.sent_by_me !== undefined && query.sent_by_me) {
      data = data.filter(
        (c) => c.last_message?.sender_type === "user",
      );
    }

    return buildPaginatedResponse(data, total, page, limit);
  }

  async getUnreadCount(organizationId: string, userId: string) {
    // Find conversations where the user is a participant and the last message
    // was created after the participant's last_read_at
    const participants = await this.prisma.conversationParticipant.findMany({
      where: {
        user_id: userId,
        status: "active",
        conversation: {
          organization_id: organizationId,
          outreach_batch_id: null,
        },
      },
      select: {
        last_read_at: true,
        conversation: {
          select: {
            messages: {
              orderBy: { created_at: "desc" },
              take: 1,
              select: { created_at: true },
            },
          },
        },
      },
    });

    let unread = 0;
    for (const p of participants) {
      const lastMsg = p.conversation.messages[0];
      if (lastMsg && (!p.last_read_at || p.last_read_at < lastMsg.created_at)) {
        unread++;
      }
    }

    return { unread };
  }

  async findBatchGroups(organizationId: string, userId: string) {
    const batches = await this.prisma.conversation.groupBy({
      by: ["outreach_batch_id", "outreach_template_name"],
      where: {
        organization_id: organizationId,
        outreach_batch_id: { not: null },
        participants: { some: { user_id: userId } },
      },
      _count: { id: true },
    });

    const result = [];
    for (const batch of batches) {
      if (!batch.outreach_batch_id) continue;

      // Count replies (conversations where last message is from influencer)
      const conversations = await this.prisma.conversation.findMany({
        where: {
          organization_id: organizationId,
          outreach_batch_id: batch.outreach_batch_id,
        },
        include: {
          messages: {
            orderBy: { created_at: "desc" },
            take: 1,
            select: { sender_type: true, sender_id: true, created_at: true },
          },
          participants: {
            where: { user_id: userId },
            select: { last_read_at: true },
            take: 1,
          },
        },
      });

      let replied = 0;
      let unreadReplies = 0;
      for (const c of conversations) {
        const last = c.messages[0];
        if (last && last.sender_type === "influencer") {
          replied++;
          const lastRead = c.participants[0]?.last_read_at;
          if (!lastRead || lastRead < last.created_at) {
            unreadReplies++;
          }
        }
      }

      result.push({
        batch_id: batch.outreach_batch_id,
        template_name: batch.outreach_template_name ?? "Outreach",
        total_conversations: batch._count.id,
        replied,
        unread_replies: unreadReplies,
      });
    }

    return result;
  }

  async findBatchConversations(
    organizationId: string,
    userId: string,
    batchId: string,
  ) {
    const conversations = await this.prisma.conversation.findMany({
      where: {
        organization_id: organizationId,
        outreach_batch_id: batchId,
      },
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
          include: {
            influencer: { select: { name: true } },
          },
        },
        _count: { select: { messages: true } },
      },
      orderBy: { updated_at: "desc" },
    });

    return conversations.map((conv) => {
      const lastMsg = conv.messages[0] ?? null;
      const userParticipant = conv.participants.find((p) => p.user_id === userId);
      const influencerParticipant = conv.participants.find((p) => p.influencer_id !== null);
      const unread = lastMsg
        ? !userParticipant?.last_read_at ||
          userParticipant.last_read_at < lastMsg.created_at
        : false;

      return {
        id: conv.id,
        subject: conv.subject,
        influencer_name: influencerParticipant?.influencer?.name ?? null,
        last_message: lastMsg
          ? {
              body: lastMsg.body.slice(0, 120),
              sender_type: lastMsg.sender_type,
              created_at: lastMsg.created_at.toISOString(),
            }
          : null,
        unread,
        message_count: conv._count.messages,
        updated_at: conv.updated_at.toISOString(),
      };
    });
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
      const now = new Date();

      const conversation = await tx.conversation.create({
        data: {
          organization_id: organizationId,
          subject: dto.subject,
          related_entity_type: dto.related_entity_type,
          related_entity_id: dto.related_entity_id,
          created_by_id: userId,
          participants: {
            create: [
              {
                user_id: userId,
                // Sender has read everything up to now
                last_read_at: dto.initial_message ? now : undefined,
              },
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

    // Get influencer participant name for resolving influencer-sent messages
    const influencerParticipant =
      await this.prisma.conversationParticipant.findFirst({
        where: {
          conversation_id: conversationId,
          influencer_id: { not: null },
        },
        include: {
          influencer: { select: { name: true } },
        },
      });
    const influencerName = influencerParticipant?.influencer?.name ?? null;

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
      sender_name:
        msg.sender_type === "influencer"
          ? influencerName
          : sender?.full_name ?? null,
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

      // Update sender's lastReadAt so they don't see their own message as unread
      await tx.conversationParticipant.updateMany({
        where: { conversation_id: conversationId, user_id: userId },
        data: { last_read_at: message.created_at },
      });

      await tx.conversation.update({
        where: { id: conversationId },
        data: { updated_at: new Date() },
      });

      // Auto-unarchive conversation for all participants on new message
      await tx.conversationParticipant.updateMany({
        where: {
          conversation_id: conversationId,
          status: "archived",
        },
        data: { status: "active" },
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

  async archiveConversation(conversationId: string, userId: string) {
    await this.prisma.conversationParticipant.updateMany({
      where: { conversation_id: conversationId, user_id: userId },
      data: { status: "archived" },
    });
    return { success: true };
  }

  async snoozeConversation(
    conversationId: string,
    userId: string,
    until: Date,
  ) {
    await this.prisma.conversationParticipant.updateMany({
      where: { conversation_id: conversationId, user_id: userId },
      data: { status: "snoozed", snoozed_until: until },
    });
    return { success: true };
  }

  async unarchiveConversation(conversationId: string, userId: string) {
    await this.prisma.conversationParticipant.updateMany({
      where: { conversation_id: conversationId, user_id: userId },
      data: { status: "active", snoozed_until: null },
    });
    return { success: true };
  }

  async bulkMarkRead(conversationIds: string[], userId: string) {
    const result = await this.prisma.conversationParticipant.updateMany({
      where: {
        conversation_id: { in: conversationIds },
        user_id: userId,
      },
      data: { last_read_at: new Date() },
    });
    return { success: true, updated: result.count };
  }

  async bulkMarkUnread(conversationIds: string[], userId: string) {
    const result = await this.prisma.conversationParticipant.updateMany({
      where: {
        conversation_id: { in: conversationIds },
        user_id: userId,
      },
      data: { last_read_at: null },
    });
    return { success: true, updated: result.count };
  }

  async bulkArchive(conversationIds: string[], userId: string) {
    const result = await this.prisma.conversationParticipant.updateMany({
      where: {
        conversation_id: { in: conversationIds },
        user_id: userId,
      },
      data: { status: "archived" },
    });
    return { success: true, archived: result.count };
  }

  /**
   * Apply a bulk action to ALL conversations matching a filter (across all pages).
   */
  async bulkActionAll(
    organizationId: string,
    userId: string,
    action: "read" | "unread" | "archive",
    filter: { status?: string; search?: string },
  ) {
    const participantFilter: Prisma.ConversationParticipantWhereInput = {
      user_id: userId,
    };
    if (filter.status && filter.status !== "all") {
      participantFilter.status = filter.status as "active" | "archived" | "snoozed";
    }

    const where: Prisma.ConversationWhereInput = {
      organization_id: organizationId,
      participants: { some: participantFilter },
      outreach_batch_id: null,
      ...(filter.search
        ? { subject: { contains: filter.search.trim(), mode: "insensitive" } }
        : {}),
    };

    const conversationIds = (
      await this.prisma.conversation.findMany({
        where,
        select: { id: true },
      })
    ).map((c) => c.id);

    if (conversationIds.length === 0) {
      return { success: true, updated: 0 };
    }

    if (action === "read") {
      return this.bulkMarkRead(conversationIds, userId);
    }
    if (action === "unread") {
      return this.bulkMarkUnread(conversationIds, userId);
    }
    return this.bulkArchive(conversationIds, userId);
  }

  async findByInfluencer(
    organizationId: string,
    userId: string,
    influencerId: string,
  ) {
    const conversations = await this.prisma.conversation.findMany({
      where: {
        organization_id: organizationId,
        participants: { some: { influencer_id: influencerId } },
      },
      include: {
        messages: {
          orderBy: { created_at: "desc" },
          take: 1,
          include: { sender: { select: { full_name: true } } },
        },
        participants: {
          where: { user_id: userId },
          select: { last_read_at: true },
        },
      },
      orderBy: { updated_at: "desc" },
    });

    return conversations.map((c) => {
      const lastMsg = c.messages[0] ?? null;
      const participant = c.participants[0];
      const unread = lastMsg
        ? !participant?.last_read_at ||
          participant.last_read_at < lastMsg.created_at
        : false;

      return {
        id: c.id,
        subject: c.subject,
        created_at: c.created_at.toISOString(),
        updated_at: c.updated_at.toISOString(),
        last_message_at: lastMsg?.created_at.toISOString() ?? c.updated_at.toISOString(),
        unread,
      };
    });
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
    const message = await this.prisma.message.create({
      data: {
        conversation_id: conversationId,
        sender_type: "system",
        body,
      },
    });

    // Auto-unarchive on new system message
    await this.prisma.conversationParticipant.updateMany({
      where: {
        conversation_id: conversationId,
        status: "archived",
      },
      data: { status: "active" },
    });

    return message;
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
