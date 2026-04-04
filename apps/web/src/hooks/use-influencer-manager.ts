import { useMemo } from "react";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  actionAssignmentsApi,
  companiesApi,
  influencersApi,
  type CreateInfluencerPayload,
  type UpdateAssignmentPayload,
  type UpdateInfluencerPayload,
} from "../services/api";
import {
  influencerRatingsApi,
  type CreateInfluencerRatingPayload,
  type UpdateInfluencerRatingPayload,
} from "../services/api/influencer-ratings";

export interface InfluencerListQueryState {
  page: number;
  limit: number;
  search?: string;
  sortBy?: string;
  sortDirection?: string;
}

export function useInfluencerListItems(options: InfluencerListQueryState) {
  const influencersQuery = useQuery({
    queryKey: ["web", "influencers", "list", options],
    queryFn: () =>
      influencersApi.list({
        page: options.page,
        limit: options.limit,
        search: options.search?.trim() || undefined,
        sort_by: options.sortBy,
        sort_direction: options.sortDirection,
      }),
    placeholderData: keepPreviousData,
  });
  const items = influencersQuery.data?.data ?? [];

  return {
    items,
    influencersQuery,
    meta: influencersQuery.data?.meta ?? null,
    isLoading: influencersQuery.isLoading,
    isError: influencersQuery.isError,
  };
}

export function useCompaniesByClient(clientId?: string) {
  return useQuery({
    queryKey: ["web", "companies", "by-client", clientId],
    queryFn: () =>
      companiesApi.list({ client_id: clientId, page: 1, limit: 100 }),
    enabled: Boolean(clientId),
  });
}

export function useCreateInfluencerMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateInfluencerPayload) =>
      influencersApi.create(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["web", "influencers"] });
    },
  });
}

export function useUpdateInfluencerMutation(influencerId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateInfluencerPayload) =>
      influencersApi.update(influencerId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["web", "influencers"] });
    },
  });
}

export function useInfluencerClients(influencerId?: string) {
  const query = useQuery({
    queryKey: ["web", "influencers", influencerId, "clients"],
    queryFn: () => influencersApi.getClients(influencerId!),
    enabled: Boolean(influencerId),
  });

  return {
    clients: query.data ?? [],
    isLoading: query.isLoading,
    query,
  };
}

export function useAddInfluencerClientMutation(influencerId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (clientId: string) => influencersApi.addClient(influencerId, clientId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["web", "influencers", influencerId, "clients"] });
    },
  });
}

export function useRemoveInfluencerClientMutation(influencerId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (clientId: string) => influencersApi.removeClient(influencerId, clientId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["web", "influencers", influencerId, "clients"] });
    },
  });
}

export function useAssignmentPosts(assignmentId?: string) {
  const query = useQuery({
    queryKey: ["web", "assignments", "posts", assignmentId],
    queryFn: () => actionAssignmentsApi.getPosts(assignmentId!),
    enabled: Boolean(assignmentId),
  });

  return {
    data: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    query,
  };
}

export function useInfluencerAssignments(influencerId?: string) {
  const query = useQuery({
    queryKey: ["web", "influencers", "assignments", influencerId],
    queryFn: () => influencersApi.getAssignments(influencerId!),
    enabled: Boolean(influencerId),
  });

  return {
    data: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    query,
  };
}

export function useAllInfluencerRatingAverages() {
  const query = useQuery({
    queryKey: ["web", "influencer-ratings", "all"],
    queryFn: () =>
      influencerRatingsApi.list({ page: 1, limit: 100 }),
  });

  const ratings = query.data?.data ?? [];

  const averages = useMemo(() => {
    const result = new Map<string, number>();
    if (ratings.length === 0) return result;

    const grouped = new Map<string, number[]>();

    for (const r of ratings) {
      if (
        r.visual_quality_score != null &&
        r.script_quality_score != null &&
        r.overall_quality_score != null
      ) {
        const avg =
          (r.visual_quality_score +
            r.script_quality_score +
            r.overall_quality_score) /
          3;
        const list = grouped.get(r.influencer_id) ?? [];
        list.push(avg);
        grouped.set(r.influencer_id, list);
      }
    }

    for (const [id, scores] of grouped) {
      result.set(
        id,
        scores.reduce((a, b) => a + b, 0) / scores.length,
      );
    }

    return result;
  }, [ratings]);

  return { averages, isLoading: query.isLoading };
}

export function useInfluencerOverallRating(influencerId?: string) {
  const query = useQuery({
    queryKey: ["web", "influencer-ratings", "by-influencer", influencerId],
    queryFn: () =>
      influencerRatingsApi.list({
        influencer_id: influencerId,
        page: 1,
        limit: 100,
      }),
    enabled: Boolean(influencerId),
  });

  const ratings = query.data?.data ?? [];
  let average: number | null = null;

  if (ratings.length > 0) {
    let sum = 0;
    let count = 0;

    for (const r of ratings) {
      if (r.visual_quality_score != null && r.script_quality_score != null && r.overall_quality_score != null) {
        sum +=
          (r.visual_quality_score + r.script_quality_score + r.overall_quality_score) / 3;
        count++;
      }
    }

    if (count > 0) {
      average = sum / count;
    }
  }

  return { average, ratedCount: ratings.length > 0 ? ratings.filter(r => r.visual_quality_score != null && r.script_quality_score != null && r.overall_quality_score != null).length : 0, isLoading: query.isLoading };
}

export function useCampaignInfluencerRatings(
  campaignId?: string,
  influencerId?: string,
) {
  const query = useQuery({
    queryKey: [
      "web",
      "influencer-ratings",
      "by-campaign-influencer",
      campaignId,
      influencerId,
    ],
    queryFn: () =>
      influencerRatingsApi.list({
        campaign_id: campaignId,
        influencer_id: influencerId,
        page: 1,
        limit: 100,
      }),
    enabled: Boolean(campaignId) && Boolean(influencerId),
  });

  const ratingsByAssignment = new Map<string, typeof query.data extends { data: (infer R)[] } | undefined ? R : never>();
  for (const rating of query.data?.data ?? []) {
    if (rating.action_assignment_id) {
      ratingsByAssignment.set(rating.action_assignment_id, rating);
    }
  }

  return { ratingsByAssignment, isLoading: query.isLoading };
}

export function useUpdateAssignmentMutation(assignmentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateAssignmentPayload) =>
      actionAssignmentsApi.update(assignmentId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["web", "campaigns"] });
      await queryClient.invalidateQueries({ queryKey: ["web", "influencers"] });
    },
  });
}

export function useAssignmentRating(actionAssignmentId?: string) {
  const query = useQuery({
    queryKey: ["web", "influencer-ratings", "by-assignment", actionAssignmentId],
    queryFn: () =>
      influencerRatingsApi.list({
        action_assignment_id: actionAssignmentId,
        page: 1,
        limit: 1,
      }),
    enabled: Boolean(actionAssignmentId),
  });

  const rating = query.data?.data?.[0] ?? null;

  return {
    rating,
    isLoading: query.isLoading,
    isError: query.isError,
    query,
  };
}

export function useCreateRatingMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateInfluencerRatingPayload) =>
      influencerRatingsApi.create(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["web", "influencer-ratings"],
      });
    },
  });
}

export function useUpdateRatingMutation(ratingId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateInfluencerRatingPayload) =>
      influencerRatingsApi.update(ratingId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["web", "influencer-ratings"],
      });
    },
  });
}
