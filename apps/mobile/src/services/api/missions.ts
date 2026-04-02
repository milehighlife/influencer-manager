import type { Mission } from "@influencer-manager/shared/types/mobile";

import { apiClient } from "./client";

export const missionsApi = {
  getById(missionId: string) {
    return apiClient.get<Mission>(`/missions/${missionId}`);
  },
};
