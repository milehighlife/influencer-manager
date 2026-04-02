import type { ReportSummaryResponse } from "@influencer-manager/shared/types/mobile";

import { apiClient } from "./client";

export const reportsApi = {
  getCampaignSummary(campaignId: string) {
    return apiClient.get<ReportSummaryResponse>(`/reports/campaigns/${campaignId}/summary`);
  },
  getMissionSummary(missionId: string) {
    return apiClient.get<ReportSummaryResponse>(`/reports/missions/${missionId}/summary`);
  },
  getActionSummary(actionId: string) {
    return apiClient.get<ReportSummaryResponse>(`/reports/actions/${actionId}/summary`);
  },
};
