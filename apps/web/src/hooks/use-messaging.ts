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

export function useInfluencerConversations(influencerId?: string) {
  return useQuery({
    queryKey: ["web", "conversations", "by-influencer", influencerId],
    queryFn: () => conversationsApi.listByInfluencer(influencerId!),
    enabled: Boolean(influencerId),
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

export function useArchiveConversationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (conversationId: string) =>
      conversationsApi.archive(conversationId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["web", "conversations"] }),
  });
}

export function useUnarchiveConversationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (conversationId: string) =>
      conversationsApi.unarchive(conversationId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["web", "conversations"] }),
  });
}

export function useSnoozeConversationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, until }: { id: string; until: string }) =>
      conversationsApi.snooze(id, until),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["web", "conversations"] }),
  });
}

export function useBulkActionAllMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { action: "read" | "unread" | "archive"; status?: string; search?: string }) =>
      conversationsApi.bulkActionAll(params.action, { status: params.status, search: params.search }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["web", "conversations"] }),
  });
}

export function useBulkMarkReadMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => conversationsApi.bulkMarkRead(ids),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["web", "conversations"] }),
  });
}

export function useBulkMarkUnreadMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => conversationsApi.bulkMarkUnread(ids),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["web", "conversations"] }),
  });
}

export function useBulkArchiveMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) =>
      conversationsApi.bulkArchive(ids),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["web", "conversations"] }),
  });
}

export function useBatchGroups() {
  return useQuery({
    queryKey: ["web", "conversations", "batch-groups"],
    queryFn: () => conversationsApi.getBatchGroups(),
  });
}

export function useBatchConversations(batchId?: string) {
  return useQuery({
    queryKey: ["web", "conversations", "batch", batchId],
    queryFn: () => conversationsApi.getBatchConversations(batchId!),
    enabled: Boolean(batchId),
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
