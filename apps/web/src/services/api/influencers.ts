import type {
  Influencer,
  PaginatedResponse,
  SocialPlatform,
} from "@influencer-manager/shared/types/mobile";

import { apiClient } from "./client";
import { createPaginationParams, type PaginationParams } from "./pagination";

export interface InfluencerListParams extends PaginationParams {
  primary_platform?: SocialPlatform;
  status?: string;
  search?: string;
}

export const influencersApi = {
  list(params: InfluencerListParams = {}) {
    return apiClient.get<PaginatedResponse<Influencer>>("/influencers", {
      ...createPaginationParams(params),
      primary_platform: params.primary_platform,
      status: params.status,
      search: params.search,
    });
  },
  get(influencerId: string) {
    return apiClient.get<Influencer>(`/influencers/${influencerId}`);
  },
};
