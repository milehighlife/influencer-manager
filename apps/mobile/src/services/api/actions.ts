import type {
  Action,
  MissionActionListItem,
} from "@influencer-manager/shared/types/mobile";

import { apiClient } from "./client";

export const actionsApi = {
  getById(actionId: string) {
    return apiClient.get<Action>(`/actions/${actionId}`);
  },
  listByMission(missionId: string) {
    return apiClient.get<MissionActionListItem[]>(`/missions/${missionId}/actions`);
  },
};
