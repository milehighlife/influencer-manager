import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  campaignsApi,
  clientsApi,
  type CreateClientPayload,
  type UpdateClientPayload,
} from "../services/api";

export interface ClientListQueryState {
  page: number;
  limit: number;
  search?: string;
  status?: string;
}

export function useClientListItems(options: ClientListQueryState) {
  const clientsQuery = useQuery({
    queryKey: ["web", "clients", "list", options],
    queryFn: () =>
      clientsApi.list({
        page: options.page,
        limit: options.limit,
        search: options.search?.trim() || undefined,
        status: options.status || undefined,
      }),
    placeholderData: keepPreviousData,
  });
  const items = clientsQuery.data?.data ?? [];

  return {
    items,
    clientsQuery,
    meta: clientsQuery.data?.meta ?? null,
    isLoading: clientsQuery.isLoading,
    isError: clientsQuery.isError,
  };
}

export function useClientQuery(clientId?: string) {
  return useQuery({
    queryKey: ["web", "clients", clientId],
    queryFn: () => clientsApi.get(clientId!),
    enabled: Boolean(clientId),
  });
}

export function useClientCampaigns(clientId?: string) {
  const campaignsQuery = useQuery({
    queryKey: ["web", "clients", clientId, "campaigns"],
    queryFn: () =>
      campaignsApi.listPlanner({
        client_id: clientId,
        page: 1,
        limit: 100,
        sort_by: "updated_at",
        sort_direction: "desc",
      }),
    enabled: Boolean(clientId),
  });

  return {
    items: campaignsQuery.data?.data ?? [],
    campaignsQuery,
    isLoading: campaignsQuery.isLoading,
    isError: campaignsQuery.isError,
  };
}

export function useCreateClientMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateClientPayload) => clientsApi.create(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["web", "clients"] });
    },
  });
}

export function useUpdateClientMutation(clientId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateClientPayload) =>
      clientsApi.update(clientId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["web", "clients"] });
    },
  });
}

export function useDeleteClientMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (clientId: string) => clientsApi.remove(clientId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["web", "clients"] });
    },
  });
}
