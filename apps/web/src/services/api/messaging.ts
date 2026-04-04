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
  listByEntity(entityType: string, entityId: string) {
    return apiClient.get<ConversationListItem[]>("/conversations/by-entity", {
      entity_type: entityType,
      entity_id: entityId,
    });
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
