import type {
  CampaignAssetRecord,
  ClientAssetListParams,
  ClientAssetSummary,
  PaginatedResponse,
} from "@influencer-manager/shared/types/mobile";

import { apiClient } from "./client";

export interface CreateAssetPayload {
  name: string;
  description?: string;
  source_type: string;
  file_url: string;
  file_name?: string;
  file_size_bytes?: number;
  mime_type?: string;
  thumbnail_url?: string;
  category?: string;
  tags?: string[];
}

export interface UpdateAssetPayload {
  name?: string;
  description?: string | null;
  category?: string;
  tags?: string[];
}

export interface ReorderItem {
  id: string;
  sort_order: number;
}

export const campaignAssetsApi = {
  listByCampaign(campaignId: string, params?: Record<string, string | number | undefined>) {
    const query: Record<string, string | number | boolean | null | undefined> = {};
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) {
          query[key] = value;
        }
      }
    }
    return apiClient.get<PaginatedResponse<CampaignAssetRecord>>(`/campaigns/${campaignId}/assets`, query);
  },

  create(campaignId: string, payload: CreateAssetPayload) {
    return apiClient.post<CampaignAssetRecord>(`/campaigns/${campaignId}/assets`, payload);
  },

  update(campaignId: string, assetId: string, payload: UpdateAssetPayload) {
    return apiClient.patch<CampaignAssetRecord>(
      `/campaigns/${campaignId}/assets/${assetId}`,
      payload,
    );
  },

  remove(campaignId: string, assetId: string) {
    return apiClient.delete(`/campaigns/${campaignId}/assets/${assetId}`);
  },

  linkActions(campaignId: string, assetId: string, actionIds: string[]) {
    return apiClient.post<CampaignAssetRecord>(
      `/campaigns/${campaignId}/assets/${assetId}/link-actions`,
      { action_ids: actionIds },
    );
  },

  reorder(campaignId: string, items: ReorderItem[]) {
    return apiClient.post(`/campaigns/${campaignId}/assets/reorder`, { items });
  },

  listByClient(clientId: string, params?: ClientAssetListParams) {
    const query: Record<string, string | number | boolean | null | undefined> = {};
    if (params) {
      if (params.search) query.search = params.search;
      if (params.company_id) query.company_id = params.company_id;
      if (params.campaign_id) query.campaign_id = params.campaign_id;
      if (params.category) query.category = params.category;
      if (params.source_type) query.source_type = params.source_type;
      if (params.start_date) query.start_date = params.start_date;
      if (params.end_date) query.end_date = params.end_date;
      if (params.sort_by) query.sort_by = params.sort_by;
      if (params.sort_order) query.sort_order = params.sort_order;
      if (params.page) query.page = params.page;
      if (params.limit) query.limit = params.limit;
    }
    return apiClient.get<PaginatedResponse<CampaignAssetRecord> & { summary: ClientAssetSummary }>(
      `/clients/${clientId}/assets`,
      query,
    );
  },
};
