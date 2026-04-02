import type {
  Company,
  PaginatedResponse,
} from "@influencer-manager/shared/types/mobile";

import { apiClient } from "./client";
import { createPaginationParams, type PaginationParams } from "./pagination";

export interface CompanyListParams extends PaginationParams {
  client_id?: string;
  status?: string;
  search?: string;
}

export interface CreateCompanyPayload {
  client_id: string;
  name: string;
  description?: string;
  status?: string;
}

export interface UpdateCompanyPayload {
  name?: string;
  description?: string | null;
  status?: string;
}

export const companiesApi = {
  list(params: CompanyListParams = {}) {
    return apiClient.get<PaginatedResponse<Company>>("/companies", {
      ...createPaginationParams(params),
      client_id: params.client_id,
      status: params.status,
      search: params.search,
    });
  },
  get(companyId: string) {
    return apiClient.get<Company>(`/companies/${companyId}`);
  },
  create(payload: CreateCompanyPayload) {
    return apiClient.post<Company>("/companies", payload);
  },
  update(companyId: string, payload: UpdateCompanyPayload) {
    return apiClient.patch<Company>(`/companies/${companyId}`, payload);
  },
  remove(companyId: string) {
    return apiClient.delete(`/companies/${companyId}`);
  },
};
