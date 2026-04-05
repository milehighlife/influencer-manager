import type {
  AuthenticatedUser,
  LoginResponse,
  PaginatedResponse,
  InfluencerWorkspaceAssignment,
  InfluencerWorkspaceAssignmentListResponse,
  InfluencerWorkspaceAssignmentDetailResponse,
  ConversationListItem,
  MessageRecord,
  NotificationRecord,
} from "@influencer-manager/shared/types/mobile";

import { apiClient } from "./client";

// -- Auth --

export const authApi = {
  login(email: string, password: string) {
    return apiClient.post<LoginResponse>("/auth/login", { email, password });
  },
  me() {
    return apiClient.get<AuthenticatedUser>("/auth/me");
  },
  logout() {
    return apiClient.post("/auth/logout");
  },
};

// -- Assignments --

export const assignmentsApi = {
  list(params: { page?: number; limit?: number; status?: string; sort_by?: string; sort_direction?: string } = {}) {
    return apiClient.get<InfluencerWorkspaceAssignmentListResponse>(
      "/influencer/assignments",
      params as Record<string, string | number>,
    );
  },
  get(id: string) {
    return apiClient.get<InfluencerWorkspaceAssignmentDetailResponse>(
      `/influencer/assignments/${id}`,
    );
  },
  accept(id: string) {
    return apiClient.post(`/influencer/assignments/${id}/accept`);
  },
  decline(id: string) {
    return apiClient.post(`/influencer/assignments/${id}/decline`);
  },
  start(id: string) {
    return apiClient.post(`/influencer/assignments/${id}/start`);
  },
  submit(id: string, deliverables: Array<{ deliverable_type: string; submission_url: string; description?: string }>) {
    return apiClient.post(`/influencer/assignments/${id}/deliverables`, {
      deliverables,
    });
  },
  getCampaignAssets(id: string) {
    return apiClient.get<{
      action_assets: Array<{ id: string; name: string; description: string | null; source_type: string; file_url: string; file_name: string | null; file_size_bytes: number | null; mime_type: string | null; thumbnail_url: string | null; category: string; tags: string[]; created_at: string }>;
      campaign_assets: Array<{ id: string; name: string; description: string | null; source_type: string; file_url: string; file_name: string | null; file_size_bytes: number | null; mime_type: string | null; thumbnail_url: string | null; category: string; tags: string[]; created_at: string }>;
    }>(`/influencer/assignments/${id}/campaign-assets`);
  },
};

// -- Conversations --

export const conversationsApi = {
  list(params: { page?: number; limit?: number } = {}) {
    return apiClient.get<PaginatedResponse<ConversationListItem>>(
      "/influencer/conversations",
      params as Record<string, string | number>,
    );
  },
  getMessages(id: string, params: { page?: number; limit?: number } = {}) {
    return apiClient.get<PaginatedResponse<MessageRecord>>(
      `/influencer/conversations/${id}/messages`,
      params as Record<string, string | number>,
    );
  },
  sendMessage(id: string, body: string) {
    return apiClient.post<MessageRecord>(
      `/influencer/conversations/${id}/messages`,
      { body },
    );
  },
  markRead(id: string) {
    return apiClient.post(`/influencer/conversations/${id}/read`);
  },
};

// -- Notifications --

export const notificationsApi = {
  list(params: { page?: number; limit?: number } = {}) {
    return apiClient.get<PaginatedResponse<NotificationRecord>>(
      "/influencer/notifications",
      params as Record<string, string | number>,
    );
  },
  getUnreadCount() {
    return apiClient.get<{ unread: number }>("/influencer/notifications/unread-count");
  },
  markAllRead() {
    return apiClient.post("/influencer/notifications/read-all");
  },
};

// -- Profile --

export const profileApi = {
  get() {
    return apiClient.get<{
      id: string;
      name: string;
      email: string | null;
      phone: string | null;
      city: string | null;
      state: string | null;
      primary_platform: string;
      url_instagram: string | null;
      url_tiktok: string | null;
      url_youtube: string | null;
      url_facebook: string | null;
      url_x: string | null;
      url_linkedin: string | null;
      url_threads: string | null;
      status: string;
      rating_average: number | null;
      clients: string[];
      companies: string[];
    }>("/influencer/profile");
  },
};
