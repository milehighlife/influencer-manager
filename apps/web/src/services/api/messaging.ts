import type {
  BulkOutreachPayload,
  BulkOutreachResult,
  ConversationDetail,
  ConversationListItem,
  MessageRecord,
  MessageTemplate,
  NotificationCountResponse,
  NotificationRecord,
  PaginatedResponse,
} from "@influencer-manager/shared/types/mobile";

import { apiClient } from "./client";
import { createPaginationParams, type PaginationParams } from "./pagination";

// -- Templates --

export interface CreateTemplatePayload {
  name: string;
  subject: string;
  body: string;
  category: string;
}

export interface UpdateTemplatePayload {
  name?: string;
  subject?: string;
  body?: string;
  category?: string;
}

export interface TemplateListParams extends PaginationParams {
  search?: string;
  category?: string;
}

export const messageTemplatesApi = {
  list(params: TemplateListParams = {}) {
    return apiClient.get<PaginatedResponse<MessageTemplate>>(
      "/message-templates",
      {
        ...createPaginationParams(params),
        search: params.search,
        category: params.category,
      },
    );
  },
  get(id: string) {
    return apiClient.get<MessageTemplate>(`/message-templates/${id}`);
  },
  create(payload: CreateTemplatePayload) {
    return apiClient.post<MessageTemplate>("/message-templates", payload);
  },
  update(id: string, payload: UpdateTemplatePayload) {
    return apiClient.patch<MessageTemplate>(
      `/message-templates/${id}`,
      payload,
    );
  },
  remove(id: string) {
    return apiClient.delete<{ id: string }>(`/message-templates/${id}`);
  },
  clone(id: string) {
    return apiClient.post<MessageTemplate>(`/message-templates/${id}/clone`);
  },
};

// -- Conversations --

export interface ConversationListParams extends PaginationParams {
  search?: string;
  unread?: boolean;
  needs_reply?: boolean;
  sent_by_me?: boolean;
  show_batches?: boolean;
  status?: string;
  related_entity_type?: string;
  related_entity_id?: string;
  influencer_id?: string;
}

export interface CreateConversationPayload {
  subject: string;
  influencer_id: string;
  related_entity_type?: string;
  related_entity_id?: string;
  initial_message?: string;
}

export interface SendMessagePayload {
  body: string;
  template_id?: string;
  sent_via_email?: boolean;
}

export const conversationsApi = {
  list(params: ConversationListParams = {}) {
    return apiClient.get<PaginatedResponse<ConversationListItem>>(
      "/conversations",
      {
        ...createPaginationParams(params),
        search: params.search,
        unread: params.unread != null ? String(params.unread) : undefined,
        needs_reply: params.needs_reply != null ? String(params.needs_reply) : undefined,
        sent_by_me: params.sent_by_me != null ? String(params.sent_by_me) : undefined,
        show_batches: params.show_batches != null ? String(params.show_batches) : undefined,
        status: params.status,
        related_entity_type: params.related_entity_type,
        related_entity_id: params.related_entity_id,
        influencer_id: params.influencer_id,
      },
    );
  },
  get(id: string) {
    return apiClient.get<ConversationDetail>(`/conversations/${id}`);
  },
  create(payload: CreateConversationPayload) {
    return apiClient.post<ConversationDetail>("/conversations", payload);
  },
  getMessages(id: string, params: PaginationParams = {}) {
    return apiClient.get<PaginatedResponse<MessageRecord>>(
      `/conversations/${id}/messages`,
      createPaginationParams(params),
    );
  },
  sendMessage(id: string, payload: SendMessagePayload) {
    return apiClient.post<MessageRecord>(
      `/conversations/${id}/messages`,
      payload,
    );
  },
  markAsRead(id: string) {
    return apiClient.post<{ success: boolean }>(`/conversations/${id}/read`);
  },
  archive(id: string) {
    return apiClient.post<{ success: boolean }>(`/conversations/${id}/archive`);
  },
  unarchive(id: string) {
    return apiClient.post<{ success: boolean }>(`/conversations/${id}/unarchive`);
  },
  snooze(id: string, until: string) {
    return apiClient.post<{ success: boolean }>(`/conversations/${id}/snooze`, { until });
  },
  getUnreadCount() {
    return apiClient.get<{ unread: number }>("/conversations/unread-count");
  },
  bulkActionAll(action: "read" | "unread" | "archive", filter: { status?: string; search?: string }) {
    return apiClient.post<{ success: boolean; updated: number }>("/conversations/bulk-action-all", {
      action,
      ...filter,
    });
  },
  bulkMarkRead(conversationIds: string[]) {
    return apiClient.post<{ success: boolean }>("/conversations/bulk-read", {
      conversation_ids: conversationIds,
    });
  },
  bulkMarkUnread(conversationIds: string[]) {
    return apiClient.post<{ success: boolean }>("/conversations/bulk-unread", {
      conversation_ids: conversationIds,
    });
  },
  bulkArchive(conversationIds: string[]) {
    return apiClient.post<{ success: boolean; archived: number }>("/conversations/bulk-archive", {
      conversation_ids: conversationIds,
    });
  },
  getBatchGroups() {
    return apiClient.get<Array<{
      batch_id: string;
      template_name: string;
      total_conversations: number;
      replied: number;
      unread_replies: number;
    }>>("/conversations/batch-groups");
  },
  getBatchConversations(batchId: string) {
    return apiClient.get<Array<{
      id: string;
      subject: string;
      influencer_name: string | null;
      last_message: { body: string; sender_type: string; created_at: string } | null;
      unread: boolean;
      message_count: number;
      updated_at: string;
    }>>(`/conversations/batch/${batchId}`);
  },
  listByEntity(entityType: string, entityId: string) {
    return apiClient.get<ConversationListItem[]>("/conversations/by-entity", {
      entity_type: entityType,
      entity_id: entityId,
    });
  },
  listByInfluencer(influencerId: string) {
    return apiClient.get<Array<{
      id: string;
      subject: string;
      created_at: string;
      updated_at: string;
      last_message_at: string;
      unread: boolean;
    }>>(`/conversations/by-influencer/${influencerId}`);
  },
};

// -- Bulk Outreach --

export const bulkOutreachApi = {
  send(payload: BulkOutreachPayload) {
    return apiClient.post<BulkOutreachResult>("/bulk-outreach", payload);
  },
};

// -- Notifications --

export const notificationsApi = {
  list(params: PaginationParams = {}) {
    return apiClient.get<PaginatedResponse<NotificationRecord>>(
      "/notifications",
      createPaginationParams(params),
    );
  },
  getUnreadCount() {
    return apiClient.get<NotificationCountResponse>(
      "/notifications/unread-count",
    );
  },
  markAsRead(id: string) {
    return apiClient.post<{ success: boolean }>(`/notifications/${id}/read`);
  },
  markAllAsRead() {
    return apiClient.post<{ success: boolean }>("/notifications/read-all");
  },
};
