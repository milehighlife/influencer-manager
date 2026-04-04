import type {
  Campaign,
  CampaignCascadePreview,
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
  statuses?: string;
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
        statuses: params.statuses,
        schedule_state: params.schedule_state,
        sort_by: params.sort_by,
        sort_direction: params.sort_direction,
      },
    );
  },
  getStatusCounts() {
    return apiClient.get<Record<string, number>>("/campaigns/status-counts");
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
  getCascadePreview(campaignId: string) {
    return apiClient.get<CampaignCascadePreview>(`/campaigns/${campaignId}/cascade-preview`);
  },
  cascadeComplete(campaignId: string, expectedVersion: number) {
    return apiClient.post<{
      campaign_id: string;
      missions_updated: number;
      actions_updated: number;
      assignments_updated: number;
      influencers_notified: string[];
    }>(`/campaigns/${campaignId}/cascade-complete`, {
      expected_version: expectedVersion,
    });
  },
};
