import type {
  Influencer,
  InfluencerAssignmentsResponse,
  PaginatedResponse,
  SocialPlatform,
} from "@influencer-manager/shared/types/mobile";

import { apiClient } from "./client";
import { createPaginationParams, type PaginationParams } from "./pagination";

export interface InfluencerListParams extends PaginationParams {
  primary_platform?: SocialPlatform;
  status?: string;
  search?: string;
  sort_by?: string;
  sort_direction?: string;
}

export interface CreateInfluencerPayload {
  name: string;
  email?: string;
  primary_platform: string;
  location?: string;
  audience_description?: string;
  status?: string;
}

export interface UpdateInfluencerPayload {
  name?: string;
  email?: string | null;
  primary_platform?: string;
  location?: string | null;
  mailing_address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  phone?: string | null;
  url_instagram?: string | null;
  url_tiktok?: string | null;
  url_facebook?: string | null;
  url_youtube?: string | null;
  url_linkedin?: string | null;
  url_x?: string | null;
  url_threads?: string | null;
  status?: string;
}

export const influencersApi = {
  list(params: InfluencerListParams = {}) {
    return apiClient.get<PaginatedResponse<Influencer>>("/influencers", {
      ...createPaginationParams(params),
      primary_platform: params.primary_platform,
      status: params.status,
      search: params.search,
      sort_by: params.sort_by,
      sort_direction: params.sort_direction,
    });
  },
  get(influencerId: string) {
    return apiClient.get<Influencer>(`/influencers/${influencerId}`);
  },
  create(payload: CreateInfluencerPayload) {
    return apiClient.post<Influencer>("/influencers", payload);
  },
  update(influencerId: string, payload: UpdateInfluencerPayload) {
    return apiClient.patch<Influencer>(`/influencers/${influencerId}`, payload);
  },
  getAssignments(influencerId: string) {
    return apiClient.get<InfluencerAssignmentsResponse>(
      `/influencers/${influencerId}/assignments`,
    );
  },
  listByClientAndPlatform(clientId: string, platform?: string) {
    return apiClient.get<ClientInfluencer[]>("/influencers/by-client-platform", {
      client_id: clientId,
      platform,
    });
  },
  getClients(influencerId: string) {
    return apiClient.get<{ id: string; name: string; industry: string | null; status: string }[]>(
      `/influencers/${influencerId}/clients`,
    );
  },
  addClient(influencerId: string, clientId: string) {
    return apiClient.post(`/influencers/${influencerId}/clients/${clientId}`);
  },
  removeClient(influencerId: string, clientId: string) {
    return apiClient.delete(`/influencers/${influencerId}/clients/${clientId}`);
  },
};

export interface ClientInfluencer extends Influencer {
  rating_average: number | null;
  published_action_count: number;
}
