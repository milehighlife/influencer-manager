import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type {
  Campaign,
  CampaignPlanningView,
  CampaignPlannerScheduleState,
  CampaignPlannerSortField,
  SortDirection,
} from "@influencer-manager/shared/types/mobile";

import type { CampaignCascadePreview } from "@influencer-manager/shared/types/mobile";

import {
  actionAssignmentsApi,
  actionsApi,
  campaignsApi,
  clientsApi,
  companiesApi,
  influencersApi,
  missionsApi,
  type CreateActionPayload,
  type CreateAssignmentPayload,
  type CreateCampaignPayload,
  type CreateMissionPayload,
  type UpdateActionPayload,
  type UpdateCampaignPayload,
  type UpdateMissionPayload,
} from "../services/api";
import {
  buildMissionSequenceUpdates,
  type MissionReorderDirection,
} from "../utils/campaign-builder";

function normalizeLookupSearchTerm(searchTerm: string) {
  return searchTerm.trim();
}

export function useClientLookupQuery(searchTerm: string) {
  const normalizedSearch = normalizeLookupSearchTerm(searchTerm);

  return useQuery({
    queryKey: ["web", "clients", "lookup", normalizedSearch],
    queryFn: () =>
      clientsApi.list({
        page: 1,
        limit: 20,
        search: normalizedSearch || undefined,
      }),
    enabled: normalizedSearch.length > 0,
  });
}

export function useSelectedClientQuery(clientId?: string) {
  return useQuery({
    queryKey: ["web", "clients", clientId],
    queryFn: () => clientsApi.get(clientId!),
    enabled: Boolean(clientId),
  });
}

export function useCompanyLookupQuery(searchTerm: string, clientId?: string) {
  const normalizedSearch = normalizeLookupSearchTerm(searchTerm);

  return useQuery({
    queryKey: ["web", "companies", "lookup", normalizedSearch, clientId ?? null],
    queryFn: () =>
      companiesApi.list({
        page: 1,
        limit: 20,
        search: normalizedSearch || undefined,
        client_id: clientId || undefined,
      }),
    enabled: normalizedSearch.length > 0 || Boolean(clientId),
  });
}

export function useSelectedCompanyQuery(companyId?: string) {
  return useQuery({
    queryKey: ["web", "companies", companyId],
    queryFn: () => companiesApi.get(companyId!),
    enabled: Boolean(companyId),
  });
}

export function mergeLookupOptions<T extends { id: string }>(
  selectedItem: T | null | undefined,
  items: T[],
) {
  const map = new Map<string, T>();

  if (selectedItem) {
    map.set(selectedItem.id, selectedItem);
  }

  for (const item of items) {
    map.set(item.id, item);
  }

  return Array.from(map.values());
}

export function useInfluencerLookupQuery(searchTerm: string) {
  const normalizedSearch = normalizeLookupSearchTerm(searchTerm);

  return useQuery({
    queryKey: ["web", "influencers", "lookup", normalizedSearch],
    queryFn: () =>
      influencersApi.list({
        page: 1,
        limit: 20,
        search: normalizedSearch || undefined,
      }),
    enabled: normalizedSearch.length > 0,
  });
}

export interface PlannerListQueryState {
  page: number;
  limit: number;
  search?: string;
  companyId?: string;
  clientId?: string;
  status?: Campaign["status"];
  statuses?: string;
  scheduleState?: CampaignPlannerScheduleState;
  sortBy: CampaignPlannerSortField;
  sortDirection: SortDirection;
}

export function getLookupHelperMessage(options: {
  searchTerm: string;
  subject: string;
  count: number;
}) {
  const normalizedSearch = normalizeLookupSearchTerm(options.searchTerm);
  if (!normalizedSearch) {
    return `Search ${options.subject} to load matching results across the organization.`;
  }

  if (options.count === 0) {
    return `No ${options.subject} match "${normalizedSearch}".`;
  }

  return `Showing ${options.count} matching ${options.subject}.`;
}

export function useCampaignListItems(options: PlannerListQueryState) {
  const campaignsQuery = useQuery({
    queryKey: ["web", "campaigns", "planner-list", options],
    queryFn: () =>
      campaignsApi.listPlanner({
        page: options.page,
        limit: options.limit,
        search: options.search?.trim() || undefined,
        company_id: options.companyId || undefined,
        client_id: options.clientId || undefined,
        status: options.status,
        statuses: options.statuses,
        schedule_state: options.scheduleState,
        sort_by: options.sortBy,
        sort_direction: options.sortDirection,
      }),
    placeholderData: keepPreviousData,
  });
  const items = campaignsQuery.data?.data ?? [];

  return {
    items,
    campaignsQuery,
    meta: campaignsQuery.data?.meta ?? null,
    isLoading: campaignsQuery.isLoading,
    isError: campaignsQuery.isError,
  };
}

export function useUnratedPublishedActions(
  search?: string,
  page = 1,
  limit = 10,
) {
  const query = useQuery({
    queryKey: ["web", "action-assignments", "unrated-published", search, page, limit],
    queryFn: () =>
      actionAssignmentsApi.getUnratedPublished({ search, page, limit }),
    placeholderData: keepPreviousData,
  });

  return {
    items: query.data?.data ?? [],
    meta: query.data?.meta ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    query,
  };
}

export function useReviewedActions(
  search?: string,
  page = 1,
  limit = 10,
) {
  const query = useQuery({
    queryKey: ["web", "action-assignments", "reviewed", search, page, limit],
    queryFn: () =>
      actionAssignmentsApi.getReviewed({ search, page, limit }),
    placeholderData: keepPreviousData,
  });

  return {
    items: query.data?.data ?? [],
    meta: query.data?.meta ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    query,
  };
}

export function useOverdueActions(
  search?: string,
  page = 1,
  limit = 10,
) {
  const query = useQuery({
    queryKey: ["web", "action-assignments", "overdue", search, page, limit],
    queryFn: () =>
      actionAssignmentsApi.getOverdue({ search, page, limit }),
    placeholderData: keepPreviousData,
  });

  return {
    items: query.data?.data ?? [],
    meta: query.data?.meta ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    query,
  };
}

export function useCampaignStatusCounts() {
  return useQuery<Record<string, number>>({
    queryKey: ["web", "campaigns", "status-counts"],
    queryFn: () => campaignsApi.getStatusCounts(),
  });
}

export function useCreateCampaignMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      companyId,
      payload,
    }: {
      companyId: string;
      payload: Omit<CreateCampaignPayload, "company_id">;
    }) => campaignsApi.createUnderCompany(companyId, payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["web", "campaigns"] }),
        queryClient.invalidateQueries({ queryKey: ["web", "companies"] }),
      ]);
    },
  });
}

export function useUpdateCampaignMutation(campaignId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateCampaignPayload) =>
      campaignsApi.update(campaignId, payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["web", "campaigns"] }),
        queryClient.invalidateQueries({
          queryKey: ["web", "campaigns", campaignId],
        }),
      ]);
    },
  });
}

export function useCampaignPlanningViewQuery(campaignId?: string) {
  return useQuery({
    queryKey: ["web", "campaigns", campaignId, "planning-view"],
    queryFn: () => campaignsApi.getPlanningView(campaignId!),
    enabled: Boolean(campaignId),
  });
}

export function useCreateMissionMutation(campaignId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateMissionPayload) =>
      missionsApi.createForCampaign(campaignId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["web", "campaigns", campaignId],
      });
    },
  });
}

export function useUpdateMissionMutation(campaignId: string, missionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateMissionPayload) =>
      missionsApi.update(missionId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["web", "campaigns", campaignId],
      });
    },
  });
}

export function useDeleteMissionMutation(campaignId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (missionId: string) => missionsApi.remove(missionId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["web", "campaigns", campaignId],
      });
    },
  });
}

export function useCreateActionMutation(campaignId: string, missionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateActionPayload) =>
      actionsApi.createForMission(missionId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["web", "campaigns", campaignId],
      });
    },
  });
}

export function useUpdateActionMutation(campaignId: string, actionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateActionPayload) => actionsApi.update(actionId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["web", "campaigns", campaignId],
      });
    },
  });
}

export function useDeleteActionMutation(campaignId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (actionId: string) => actionsApi.remove(actionId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["web", "campaigns", campaignId],
      });
    },
  });
}

export function useCreateAssignmentMutation(campaignId: string, actionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateAssignmentPayload) =>
      actionAssignmentsApi.createForAction(actionId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["web", "campaigns", campaignId],
      });
    },
  });
}

export function useDeleteAssignmentMutation(campaignId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (assignmentId: string) => actionAssignmentsApi.remove(assignmentId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["web", "campaigns", campaignId],
      });
    },
  });
}

export function useReorderMissionMutation(campaignId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      missions,
      missionId,
      direction,
    }: {
      missions: CampaignPlanningView["missions"];
      missionId: string;
      direction: MissionReorderDirection;
    }) => {
      const updates = buildMissionSequenceUpdates(missions, missionId, direction);
      await Promise.all(
        updates.map((update) =>
          missionsApi.update(update.id, { sequence_order: update.sequence_order }),
        ),
      );

      return updates;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["web", "campaigns", campaignId],
      });
    },
  });
}

export function useFilteredInfluencers(searchTerm: string) {
  const influencersQuery = useInfluencerLookupQuery(searchTerm);
  const influencers = influencersQuery.data?.data ?? [];

  return {
    ...influencersQuery,
    filteredInfluencers: influencers,
  };
}

export function useCascadePreviewQuery(campaignId: string, enabled: boolean) {
  return useQuery<CampaignCascadePreview>({
    queryKey: ["web", "campaigns", campaignId, "cascade-preview"],
    queryFn: () => campaignsApi.getCascadePreview(campaignId),
    enabled,
  });
}

export function useCascadeCompleteMutation(campaignId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (expectedVersion: number) =>
      campaignsApi.cascadeComplete(campaignId, expectedVersion),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["web", "campaigns"] }),
        queryClient.invalidateQueries({
          queryKey: ["web", "campaigns", campaignId],
        }),
      ]);
    },
  });
}
