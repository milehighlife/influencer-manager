import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  bulkOutreachApi,
  conversationsApi,
  messageTemplatesApi,
  notificationsApi,
  type ConversationListParams,
  type CreateConversationPayload,
  type CreateTemplatePayload,
  type SendMessagePayload,
  type TemplateListParams,
  type UpdateTemplatePayload,
} from "../services/api";
import type {
  BulkOutreachPayload,
} from "@influencer-manager/shared/types/mobile";

// -- Templates --

export function useTemplateList(params: TemplateListParams = {}) {
  const query = useQuery({
    queryKey: ["web", "message-templates", params],
    queryFn: () => messageTemplatesApi.list(params),
    placeholderData: keepPreviousData,
  });

  return {
    items: query.data?.data ?? [],
    meta: query.data?.meta ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    query,
  };
}

export function useTemplate(id?: string) {
  return useQuery({
    queryKey: ["web", "message-templates", id],
    queryFn: () => messageTemplatesApi.get(id!),
    enabled: Boolean(id),
  });
}

export function useCreateTemplateMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTemplatePayload) =>
      messageTemplatesApi.create(payload),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["web", "message-templates"] }),
  });
}

export function useUpdateTemplateMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateTemplatePayload) =>
      messageTemplatesApi.update(id, payload),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["web", "message-templates"] }),
  });
}

export function useDeleteTemplateMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => messageTemplatesApi.remove(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["web", "message-templates"] }),
  });
}

export function useCloneTemplateMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => messageTemplatesApi.clone(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["web", "message-templates"] }),
  });
}

// -- Conversations --

export function useConversationList(params: ConversationListParams = {}) {
  const query = useQuery({
    queryKey: ["web", "conversations", params],
    queryFn: () => conversationsApi.list(params),
    placeholderData: keepPreviousData,
  });

  return {
    items: query.data?.data ?? [],
    meta: query.data?.meta ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    query,
  };
}

export function useConversation(id?: string) {
  return useQuery({
    queryKey: ["web", "conversations", id],
    queryFn: () => conversationsApi.get(id!),
    enabled: Boolean(id),
  });
}

export function useConversationMessages(id?: string, page = 1, limit = 50) {
  return useQuery({
    queryKey: ["web", "conversations", id, "messages", page, limit],
    queryFn: () => conversationsApi.getMessages(id!, { page, limit }),
    enabled: Boolean(id),
  });
}

export function useConversationsByEntity(
  entityType?: string,
  entityId?: string,
) {
  return useQuery({
    queryKey: ["web", "conversations", "by-entity", entityType, entityId],
    queryFn: () => conversationsApi.listByEntity(entityType!, entityId!),
    enabled: Boolean(entityType && entityId),
  });
}

export function useCreateConversationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateConversationPayload) =>
      conversationsApi.create(payload),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["web", "conversations"] }),
  });
}

export function useSendMessageMutation(conversationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SendMessagePayload) =>
      conversationsApi.sendMessage(conversationId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["web", "conversations", conversationId, "messages"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["web", "conversations"],
      });
    },
  });
}

export function useMarkConversationReadMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (conversationId: string) =>
      conversationsApi.markAsRead(conversationId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["web", "conversations"] }),
  });
}

// -- Bulk Outreach --

export function useBulkOutreachMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: BulkOutreachPayload) =>
      bulkOutreachApi.send(payload),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["web", "conversations"] }),
  });
}

// -- Notifications --

export function useNotificationList(page = 1, limit = 20) {
  const query = useQuery({
    queryKey: ["web", "notifications", page, limit],
    queryFn: () => notificationsApi.list({ page, limit }),
    placeholderData: keepPreviousData,
  });

  return {
    items: query.data?.data ?? [],
    meta: query.data?.meta ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    query,
  };
}

export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: ["web", "notifications", "unread-count"],
    queryFn: () => notificationsApi.getUnreadCount(),
    refetchInterval: 30000,
  });
}

export function useMarkNotificationReadMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationsApi.markAsRead(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["web", "notifications"],
      });
    },
  });
}

export function useMarkAllNotificationsReadMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["web", "notifications"],
      });
    },
  });
}
