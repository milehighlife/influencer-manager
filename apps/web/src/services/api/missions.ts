import type {
  Mission,
  PaginatedResponse,
} from "@influencer-manager/shared/types/mobile";

import { apiClient } from "./client";
import { createPaginationParams, type PaginationParams } from "./pagination";

export interface MissionListParams extends PaginationParams {
  campaign_id?: string;
}

export interface CreateMissionPayload {
  name: string;
  description?: string;
  sequence_order: number;
  status?: Mission["status"];
  start_date?: string;
  end_date?: string;
}

export interface UpdateMissionPayload {
  name?: string;
  description?: string;
  sequence_order?: number;
  status?: Mission["status"];
  start_date?: string | null;
  end_date?: string | null;
}

export const missionsApi = {
  list(params: MissionListParams = {}) {
    return apiClient.get<PaginatedResponse<Mission>>("/missions", {
      ...createPaginationParams(params),
      campaign_id: params.campaign_id,
    });
  },
  createForCampaign(campaignId: string, payload: CreateMissionPayload) {
    return apiClient.post<Mission>(`/campaigns/${campaignId}/missions`, payload);
  },
  update(missionId: string, payload: UpdateMissionPayload) {
    return apiClient.patch<Mission>(`/missions/${missionId}`, payload);
  },
  remove(missionId: string) {
    return apiClient.delete<{ id: string }>(`/missions/${missionId}`);
  },
};
