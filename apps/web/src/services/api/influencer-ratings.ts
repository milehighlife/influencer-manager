import type { PaginatedResponse } from "@influencer-manager/shared/types/mobile";

import { apiClient } from "./client";
import { createPaginationParams, type PaginationParams } from "./pagination";

export interface InfluencerRating {
  id: string;
  organization_id: string;
  influencer_id: string;
  campaign_id: string;
  action_assignment_id: string | null;
  rater_user_id: string;
  visual_quality_score: number | null;
  visual_quality_note: string | null;
  script_quality_score: number | null;
  script_quality_note: string | null;
  overall_quality_score: number | null;
  overall_quality_note: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  rater_user?: {
    id: string;
    full_name: string;
    email: string;
  };
}

export interface InfluencerRatingListParams extends PaginationParams {
  campaign_id?: string;
  influencer_id?: string;
  action_assignment_id?: string;
}

export interface CreateInfluencerRatingPayload {
  influencer_id: string;
  campaign_id: string;
  action_assignment_id?: string;
  rater_user_id: string;
  visual_quality_score?: number;
  visual_quality_note?: string;
  script_quality_score?: number;
  script_quality_note?: string;
  overall_quality_score?: number;
  overall_quality_note?: string;
}

export interface UpdateInfluencerRatingPayload {
  visual_quality_score?: number;
  visual_quality_note?: string;
  script_quality_score?: number;
  script_quality_note?: string;
  overall_quality_score?: number;
  overall_quality_note?: string;
}

export const influencerRatingsApi = {
  list(params: InfluencerRatingListParams = {}) {
    return apiClient.get<PaginatedResponse<InfluencerRating>>(
      "/influencer-ratings",
      {
        ...createPaginationParams(params),
        campaign_id: params.campaign_id,
        influencer_id: params.influencer_id,
        action_assignment_id: params.action_assignment_id,
      },
    );
  },
  create(payload: CreateInfluencerRatingPayload) {
    return apiClient.post<InfluencerRating>("/influencer-ratings", payload);
  },
  update(ratingId: string, payload: UpdateInfluencerRatingPayload) {
    return apiClient.patch<InfluencerRating>(
      `/influencer-ratings/${ratingId}`,
      payload,
    );
  },
};
