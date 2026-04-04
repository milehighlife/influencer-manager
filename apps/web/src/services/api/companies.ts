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
  contact_first_name?: string;
  contact_last_name?: string;
  contact_email?: string;
  contact_phone?: string;
  status?: string;
}

export interface UpdateCompanyPayload {
  name?: string;
  description?: string | null;
  contact_first_name?: string | null;
  contact_last_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  priority_instagram?: number;
  priority_tiktok?: number;
  priority_youtube?: number;
  priority_facebook?: number;
  priority_x?: number;
  priority_linkedin?: number;
  priority_threads?: number;
  priority_regions?: Record<string, string>;
  priorities_updated_at?: string | null;
  priorities_updated_by?: string | null;
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
  getInfluencers(companyId: string) {
    return apiClient.get<{ id: string; name: string; city: string | null; state: string | null; rating_average: number | null }[]>(
      "/influencers/by-company",
      { company_id: companyId },
    );
  },
  remove(companyId: string) {
    return apiClient.delete(`/companies/${companyId}`);
  },
};
