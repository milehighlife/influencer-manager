import type {
  CreateDeliverablePostPayload,
  InfluencerWorkspaceAssignmentSummary,
  SubmitAssignmentPayload,
} from "@influencer-manager/shared/types/mobile";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  influencerWorkspaceApi,
  type InfluencerAssignmentListParams,
  type InfluencerPostListParams,
} from "../services/api";

function getAssignmentDetailKey(assignmentId: string) {
  return ["influencer", "assignments", assignmentId] as const;
}

function getAssignmentListKey(params: InfluencerAssignmentListParams) {
  return ["influencer", "assignments", "list", params] as const;
}

function getPostsListKey(params: InfluencerPostListParams) {
  return ["influencer", "posts", "list", params] as const;
}

function getStatusDigestKey(limit: number) {
  return ["influencer", "status-digest", limit] as const;
}

export function useInfluencerAssignmentsQuery(
  params: InfluencerAssignmentListParams,
) {
  return useQuery({
    queryKey: getAssignmentListKey(params),
    queryFn: () => influencerWorkspaceApi.listAssignments(params),
  });
}

export function getEmptyInfluencerAssignmentSummary(): InfluencerWorkspaceAssignmentSummary {
  return {
    total_assignments: 0,
    status_counts: {
      assigned: 0,
      accepted: 0,
      in_progress: 0,
      submitted: 0,
      approved: 0,
      rejected: 0,
      completed: 0,
    },
  };
}

export function useInfluencerAssignmentSummaryQuery() {
  return useInfluencerAssignmentsQuery({
    page: 1,
    limit: 1,
  });
}

export function useInfluencerAssignmentDetailQuery(assignmentId: string) {
  return useQuery({
    queryKey: getAssignmentDetailKey(assignmentId),
    queryFn: () => influencerWorkspaceApi.getAssignment(assignmentId),
    enabled: Boolean(assignmentId),
  });
}

export function useInfluencerAcceptAssignmentMutation(assignmentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => influencerWorkspaceApi.acceptAssignment(assignmentId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: getAssignmentDetailKey(assignmentId),
        }),
        queryClient.invalidateQueries({
          queryKey: ["influencer", "assignments"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["influencer", "status-digest"],
        }),
      ]);
    },
  });
}

export function useInfluencerStartAssignmentMutation(assignmentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => influencerWorkspaceApi.startAssignment(assignmentId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: getAssignmentDetailKey(assignmentId),
        }),
        queryClient.invalidateQueries({
          queryKey: ["influencer", "assignments"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["influencer", "status-digest"],
        }),
      ]);
    },
  });
}

export function useInfluencerSubmitDeliverablesMutation(assignmentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: SubmitAssignmentPayload) =>
      influencerWorkspaceApi.submitDeliverables(assignmentId, payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: getAssignmentDetailKey(assignmentId),
        }),
        queryClient.invalidateQueries({
          queryKey: ["influencer", "assignments"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["influencer", "posts"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["influencer", "status-digest"],
        }),
      ]);
    },
  });
}

export function useInfluencerLinkPostMutation(assignmentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      deliverableId,
      payload,
    }: {
      deliverableId: string;
      payload: CreateDeliverablePostPayload;
    }) => influencerWorkspaceApi.linkPost(deliverableId, payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: getAssignmentDetailKey(assignmentId),
        }),
        queryClient.invalidateQueries({
          queryKey: ["influencer", "assignments"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["influencer", "posts"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["influencer", "status-digest"],
        }),
      ]);
    },
  });
}

export function useInfluencerPostsQuery(params: InfluencerPostListParams) {
  return useQuery({
    queryKey: getPostsListKey(params),
    queryFn: () => influencerWorkspaceApi.listPosts(params),
  });
}

export function useInfluencerPostPerformanceQuery(postId: string) {
  return useQuery({
    queryKey: ["influencer", "posts", postId, "performance"],
    queryFn: () => influencerWorkspaceApi.getPostPerformance(postId),
    enabled: Boolean(postId),
  });
}

export function useCreatorStatusDigestQuery(limit = 20) {
  return useQuery({
    queryKey: getStatusDigestKey(limit),
    queryFn: () => influencerWorkspaceApi.getStatusDigest(limit),
  });
}
