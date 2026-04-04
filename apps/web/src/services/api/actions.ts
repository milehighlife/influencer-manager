import type {
  Action,
  MissionActionListItem,
} from "@influencer-manager/shared/types/mobile";

import { apiClient } from "./client";

export interface CreateActionPayload {
  title: string;
  platform: Action["platform"];
  instructions?: string;
  content_format: string;
  required_deliverables?: number;
  approval_required?: boolean;
  required_platforms?: string[];
  start_window?: string;
  end_window?: string;
  status?: Action["status"];
}

export interface UpdateActionPayload {
  title?: string;
  platform?: Action["platform"];
  instructions?: string;
  content_format?: string;
  required_deliverables?: number;
  required_platforms?: string[];
  approval_required?: boolean;
  start_window?: string | null;
  end_window?: string | null;
  status?: Action["status"];
}

export const actionsApi = {
  listByMission(missionId: string) {
    return apiClient.get<MissionActionListItem[]>(`/missions/${missionId}/actions`);
  },
  createForMission(missionId: string, payload: CreateActionPayload) {
    return apiClient.post<Action>(`/missions/${missionId}/actions`, payload);
  },
  update(actionId: string, payload: UpdateActionPayload) {
    return apiClient.patch<Action>(`/actions/${actionId}`, payload);
  },
  remove(actionId: string) {
    return apiClient.delete<{ id: string }>(`/actions/${actionId}`);
  },
};
