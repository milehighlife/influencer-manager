import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { ClientAssetListParams } from "@influencer-manager/shared/types/mobile";

import {
  campaignAssetsApi,
  type CreateAssetPayload,
  type ReorderItem,
  type UpdateAssetPayload,
} from "../services/api";

export function useCampaignAssets(campaignId?: string) {
  const query = useQuery({
    queryKey: ["web", "campaign-assets", campaignId],
    queryFn: () => campaignAssetsApi.listByCampaign(campaignId!),
    enabled: Boolean(campaignId),
  });

  return {
    assets: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    query,
  };
}

export function useClientAssets(clientId?: string, params?: ClientAssetListParams) {
  const query = useQuery({
    queryKey: ["web", "client-assets", clientId, params],
    queryFn: () => campaignAssetsApi.listByClient(clientId!, params),
    enabled: Boolean(clientId),
    placeholderData: keepPreviousData,
  });

  return {
    assets: query.data?.data ?? [],
    meta: query.data?.meta ?? null,
    summary: query.data?.summary ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    query,
  };
}

export function useCreateAssetMutation(campaignId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateAssetPayload) =>
      campaignAssetsApi.create(campaignId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["web", "campaign-assets", campaignId],
      });
    },
  });
}

export function useUpdateAssetMutation(campaignId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ assetId, payload }: { assetId: string; payload: UpdateAssetPayload }) =>
      campaignAssetsApi.update(campaignId, assetId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["web", "campaign-assets", campaignId],
      });
    },
  });
}

export function useDeleteAssetMutation(campaignId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (assetId: string) =>
      campaignAssetsApi.remove(campaignId, assetId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["web", "campaign-assets", campaignId],
      });
    },
  });
}

export function useLinkActionsMutation(campaignId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ assetId, actionIds }: { assetId: string; actionIds: string[] }) =>
      campaignAssetsApi.linkActions(campaignId, assetId, actionIds),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["web", "campaign-assets", campaignId],
      });
    },
  });
}

export function useReorderAssetsMutation(campaignId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (items: ReorderItem[]) =>
      campaignAssetsApi.reorder(campaignId, items),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["web", "campaign-assets", campaignId],
      });
    },
  });
}
