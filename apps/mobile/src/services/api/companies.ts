import type {
  Company,
  PaginatedResponse,
} from "@influencer-manager/shared/types/mobile";

import { createPaginationParams, type PaginationParams } from "./pagination";
import { apiClient } from "./client";

export const companiesApi = {
  list(params: PaginationParams = {}) {
    return apiClient.get<PaginatedResponse<Company>>("/companies", {
      ...createPaginationParams(params),
    });
  },
};
