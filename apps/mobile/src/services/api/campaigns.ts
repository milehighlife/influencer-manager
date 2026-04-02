import type {
  Campaign,
  CampaignPlanningView,
  PaginatedResponse,
} from "@influencer-manager/shared/types/mobile";

import { createPaginationParams, type PaginationParams } from "./pagination";
import { apiClient } from "./client";

export interface CampaignListParams extends PaginationParams {
  company_id?: string;
}

export const campaignsApi = {
  list(params: CampaignListParams = {}) {
    return apiClient.get<PaginatedResponse<Campaign>>("/campaigns", {
      ...createPaginationParams(params),
      company_id: params.company_id,
    });
  },
  getById(campaignId: string) {
    return apiClient.get<Campaign>(`/campaigns/${campaignId}`);
  },
  getPlanningView(campaignId: string) {
    return apiClient.get<CampaignPlanningView>(
      `/campaigns/${campaignId}/planning-view`,
    );
  },
};
