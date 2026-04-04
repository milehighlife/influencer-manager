import type {
  Client,
  PaginatedResponse,
} from "@influencer-manager/shared/types/mobile";

import { apiClient } from "./client";
import { createPaginationParams, type PaginationParams } from "./pagination";

export interface ClientListParams extends PaginationParams {
  status?: string;
  search?: string;
}

export interface CreateClientPayload {
  name: string;
  industry?: string;
  primary_contact_first_name?: string;
  primary_contact_name?: string;
  primary_contact_email?: string;
  primary_contact_phone?: string;
  status?: string;
}

export interface UpdateClientPayload {
  name?: string;
  industry?: string | null;
  primary_contact_first_name?: string | null;
  primary_contact_name?: string | null;
  primary_contact_email?: string | null;
  primary_contact_phone?: string | null;
  status?: string;
}

export const clientsApi = {
  list(params: ClientListParams = {}) {
    return apiClient.get<PaginatedResponse<Client>>("/clients", {
      ...createPaginationParams(params),
      status: params.status,
      search: params.search,
    });
  },
  get(clientId: string) {
    return apiClient.get<Client>(`/clients/${clientId}`);
  },
  create(payload: CreateClientPayload) {
    return apiClient.post<Client>("/clients", payload);
  },
  update(clientId: string, payload: UpdateClientPayload) {
    return apiClient.patch<Client>(`/clients/${clientId}`, payload);
  },
  remove(clientId: string) {
    return apiClient.delete(`/clients/${clientId}`);
  },
};
