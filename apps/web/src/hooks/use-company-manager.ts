import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  companiesApi,
  type CreateCompanyPayload,
  type UpdateCompanyPayload,
} from "../services/api";

export interface CompanyListQueryState {
  page: number;
  limit: number;
  search?: string;
  status?: string;
  clientId?: string;
}

export function useCompanyListItems(options: CompanyListQueryState) {
  const companiesQuery = useQuery({
    queryKey: ["web", "companies", "list", options],
    queryFn: () =>
      companiesApi.list({
        page: options.page,
        limit: options.limit,
        search: options.search?.trim() || undefined,
        status: options.status || undefined,
        client_id: options.clientId || undefined,
      }),
    placeholderData: keepPreviousData,
  });
  const items = companiesQuery.data?.data ?? [];

  return {
    items,
    companiesQuery,
    meta: companiesQuery.data?.meta ?? null,
    isLoading: companiesQuery.isLoading,
    isError: companiesQuery.isError,
  };
}

export function useCreateCompanyMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateCompanyPayload) => companiesApi.create(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["web", "companies"] });
    },
  });
}

export function useUpdateCompanyMutation(companyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateCompanyPayload) =>
      companiesApi.update(companyId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["web", "companies"] });
    },
  });
}

export function useDeleteCompanyMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (companyId: string) => companiesApi.remove(companyId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["web", "companies"] });
    },
  });
}
