import type {
  Campaign,
  CampaignPlannerScheduleState,
  CampaignPlannerSortField,
  CampaignPlannerListItem,
  CampaignPlanningView,
  PaginatedResponse,
  SortDirection,
} from "@influencer-manager/shared/types/mobile";

import { apiClient } from "./client";
import { createPaginationParams, type PaginationParams } from "./pagination";

export interface CampaignListParams extends PaginationParams {
  search?: string;
  company_id?: string;
  client_id?: string;
  status?: Campaign["status"];
  schedule_state?: CampaignPlannerScheduleState;
  sort_by?: CampaignPlannerSortField;
  sort_direction?: SortDirection;
}

export interface CreateCampaignPayload {
  company_id: string;
  name: string;
  description?: string;
  campaign_type: string;
  status?: Campaign["status"];
  start_date?: string;
  end_date?: string;
  budget?: number;
}

export interface UpdateCampaignPayload {
  name?: string;
  description?: string;
  campaign_type?: string;
  status?: Campaign["status"];
  start_date?: string | null;
  end_date?: string | null;
  budget?: number;
}

export const campaignsApi = {
  list(params: CampaignListParams = {}) {
    return apiClient.get<PaginatedResponse<Campaign>>("/campaigns", {
      ...createPaginationParams(params),
      search: params.search,
      company_id: params.company_id,
      client_id: params.client_id,
      status: params.status,
    });
  },
  listPlanner(params: CampaignListParams = {}) {
    return apiClient.get<PaginatedResponse<CampaignPlannerListItem>>(
      "/campaigns/planner-list",
      {
        ...createPaginationParams(params),
        search: params.search,
        company_id: params.company_id,
        client_id: params.client_id,
        status: params.status,
        schedule_state: params.schedule_state,
        sort_by: params.sort_by,
        sort_direction: params.sort_direction,
      },
    );
  },
  createUnderCompany(companyId: string, payload: Omit<CreateCampaignPayload, "company_id">) {
    return apiClient.post<Campaign>(`/companies/${companyId}/campaigns`, payload);
  },
  update(campaignId: string, payload: UpdateCampaignPayload) {
    return apiClient.patch<Campaign>(`/campaigns/${campaignId}`, payload);
  },
  getPlanningView(campaignId: string) {
    return apiClient.get<CampaignPlanningView>(`/campaigns/${campaignId}/planning-view`);
  },
};
