import type {
  Influencer,
  InfluencerAssignmentsResponse,
  PaginatedResponse,
} from "@influencer-manager/shared/types/mobile";

import { createPaginationParams, type PaginationParams } from "./pagination";
import { apiClient } from "./client";

export const influencersApi = {
  list(params: PaginationParams = {}) {
    return apiClient.get<PaginatedResponse<Influencer>>("/influencers", {
      ...createPaginationParams(params),
    });
  },
  getAssignments(influencerId: string) {
    return apiClient.get<InfluencerAssignmentsResponse>(
      `/influencers/${influencerId}/assignments`,
    );
  },
};
