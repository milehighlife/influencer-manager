import type {
  ActionAssignment,
  ActionAssignmentsResponse,
  CreateDeliverablePostPayload,
  Deliverable,
  DeliverableReviewResponse,
  PaginatedResponse,
  RejectDeliverablePayload,
  SubmitAssignmentPayload,
  SubmitAssignmentResponse,
} from "@influencer-manager/shared/types/mobile";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  actionAssignmentsApi,
  actionsApi,
  campaignsApi,
  companiesApi,
  deliverablesApi,
  influencersApi,
  missionsApi,
  postsApi,
  reportsApi,
  type CampaignListParams,
  type AssignmentListParams,
} from "../services/api";

interface AssignmentMutationSnapshot {
  assignmentDetail?: ActionAssignment;
  assignmentLists: Array<[readonly unknown[], unknown]>;
  actionAssignments?: ActionAssignmentsResponse;
  deliverables?: PaginatedResponse<Deliverable>;
}

function isPaginatedAssignments(
  value: unknown,
): value is PaginatedResponse<ActionAssignment> {
  return Boolean(
    value &&
      typeof value === "object" &&
      "meta" in value &&
      "data" in value &&
      Array.isArray((value as PaginatedResponse<ActionAssignment>).data),
  );
}

function patchAssignmentInCaches(
  queryClient: ReturnType<typeof useQueryClient>,
  assignmentId: string,
  updater: (assignment: ActionAssignment) => ActionAssignment,
) {
  const detailKey = ["action-assignments", assignmentId] as const;
  const detailValue = queryClient.getQueryData<ActionAssignment>(detailKey);

  if (detailValue) {
    queryClient.setQueryData(detailKey, updater(detailValue));
  }

  const assignmentListEntries =
    queryClient.getQueriesData<unknown>({ queryKey: ["action-assignments"] });

  for (const [queryKey, value] of assignmentListEntries) {
    if (!Array.isArray(queryKey) || !isPaginatedAssignments(value)) {
      continue;
    }

    const params =
      queryKey.length > 1 && typeof queryKey[1] === "object" && queryKey[1] !== null
        ? (queryKey[1] as Partial<AssignmentListParams>)
        : undefined;
    const statusFilter = params?.assignment_status;
    const existingAssignment = value.data.find(
      (assignment) => assignment.id === assignmentId,
    );

    if (!existingAssignment) {
      continue;
    }

    const nextAssignment = updater(existingAssignment);
    const matchesStatusFilter =
      !statusFilter || nextAssignment.assignment_status === statusFilter;
    const nextData = matchesStatusFilter
      ? value.data.map((assignment) =>
          assignment.id === assignmentId ? nextAssignment : assignment,
        )
      : value.data.filter((assignment) => assignment.id !== assignmentId);
    const totalAdjustment =
      matchesStatusFilter || value.meta.total === 0 ? 0 : -1;

    queryClient.setQueryData<PaginatedResponse<ActionAssignment>>(queryKey, {
      ...value,
      data: nextData,
      meta: {
        ...value.meta,
        total: Math.max(0, value.meta.total + totalAdjustment),
      },
    });
  }
}

function patchActionAssignmentsResponse(
  queryClient: ReturnType<typeof useQueryClient>,
  actionId: string | undefined,
  assignmentId: string,
  updater: (assignment: ActionAssignment) => ActionAssignment,
) {
  if (!actionId) {
    return;
  }

  const queryKey = ["actions", actionId, "assignments"] as const;
  const value = queryClient.getQueryData<ActionAssignmentsResponse>(queryKey);

  if (!value) {
    return;
  }

  queryClient.setQueryData<ActionAssignmentsResponse>(queryKey, {
    ...value,
    assignments: value.assignments.map((assignment) =>
      assignment.id === assignmentId ? { ...assignment, ...updater(assignment) } : assignment,
    ),
  });
}

function patchDeliverablesCache(
  queryClient: ReturnType<typeof useQueryClient>,
  assignmentId: string,
  updater: (deliverables: PaginatedResponse<Deliverable>) => PaginatedResponse<Deliverable>,
) {
  const queryKey = ["deliverables", assignmentId] as const;
  const value = queryClient.getQueryData<PaginatedResponse<Deliverable>>(queryKey);

  if (!value) {
    return;
  }

  queryClient.setQueryData(queryKey, updater(value));
}

function restoreAssignmentSnapshot(
  queryClient: ReturnType<typeof useQueryClient>,
  assignmentId: string,
  actionId: string | undefined,
  snapshot?: AssignmentMutationSnapshot,
) {
  if (!snapshot) {
    return;
  }

  queryClient.setQueryData(
    ["action-assignments", assignmentId],
    snapshot.assignmentDetail,
  );

  for (const [queryKey, value] of snapshot.assignmentLists) {
    queryClient.setQueryData(queryKey, value);
  }

  if (actionId) {
    queryClient.setQueryData(
      ["actions", actionId, "assignments"],
      snapshot.actionAssignments,
    );
  }

  queryClient.setQueryData(["deliverables", assignmentId], snapshot.deliverables);
}

async function snapshotAssignmentMutation(
  queryClient: ReturnType<typeof useQueryClient>,
  assignmentId: string,
  actionId?: string,
): Promise<AssignmentMutationSnapshot> {
  await Promise.all([
    queryClient.cancelQueries({ queryKey: ["action-assignments", assignmentId] }),
    queryClient.cancelQueries({ queryKey: ["action-assignments"] }),
    queryClient.cancelQueries({ queryKey: ["deliverables", assignmentId] }),
    ...(actionId
      ? [queryClient.cancelQueries({ queryKey: ["actions", actionId, "assignments"] })]
      : []),
  ]);

  return {
    assignmentDetail: queryClient.getQueryData<ActionAssignment>([
      "action-assignments",
      assignmentId,
    ]),
    assignmentLists: queryClient.getQueriesData<unknown>({
      queryKey: ["action-assignments"],
    }),
    actionAssignments: actionId
      ? queryClient.getQueryData<ActionAssignmentsResponse>([
          "actions",
          actionId,
          "assignments",
        ])
      : undefined,
    deliverables: queryClient.getQueryData<PaginatedResponse<Deliverable>>([
      "deliverables",
      assignmentId,
    ]),
  };
}

function applyServerAssignment(
  queryClient: ReturnType<typeof useQueryClient>,
  assignmentId: string,
  actionId: string | undefined,
  assignment: ActionAssignment,
) {
  queryClient.setQueryData(["action-assignments", assignmentId], assignment);
  patchAssignmentInCaches(queryClient, assignmentId, () => assignment);
  patchActionAssignmentsResponse(queryClient, actionId, assignmentId, () => assignment);
}

function mergeDeliverablesIntoCache(
  queryClient: ReturnType<typeof useQueryClient>,
  assignmentId: string,
  deliverables: Deliverable[],
) {
  patchDeliverablesCache(queryClient, assignmentId, (value) => {
    const optimisticIds = new Set(
      value.data
        .filter((deliverable) => deliverable.id.startsWith("optimistic-"))
        .map((deliverable) => deliverable.id),
    );
    const serverIds = new Set(deliverables.map((deliverable) => deliverable.id));
    const nextData = [
      ...value.data.filter(
        (deliverable) =>
          !optimisticIds.has(deliverable.id) && !serverIds.has(deliverable.id),
      ),
      ...deliverables,
    ];

    return {
      ...value,
      data: nextData,
      meta: {
        ...value.meta,
        total: nextData.length,
      },
    };
  });
}

export function useCampaignsQuery(params: CampaignListParams) {
  return useQuery({
    queryKey: ["campaigns", params],
    queryFn: () => campaignsApi.list(params),
  });
}

export function useCompaniesQuery() {
  return useQuery({
    queryKey: ["companies"],
    queryFn: () => companiesApi.list({ page: 1, limit: 50 }),
  });
}

export function useCampaignPlanningViewQuery(campaignId: string) {
  return useQuery({
    queryKey: ["campaigns", campaignId, "planning-view"],
    queryFn: () => campaignsApi.getPlanningView(campaignId),
    enabled: Boolean(campaignId),
  });
}

export function useCampaignSummaryQuery(campaignId: string) {
  return useQuery({
    queryKey: ["reports", "campaign", campaignId],
    queryFn: () => reportsApi.getCampaignSummary(campaignId),
    enabled: Boolean(campaignId),
  });
}

export function useMissionQuery(missionId: string) {
  return useQuery({
    queryKey: ["missions", missionId],
    queryFn: () => missionsApi.getById(missionId),
    enabled: Boolean(missionId),
  });
}

export function useMissionActionsQuery(missionId: string) {
  return useQuery({
    queryKey: ["missions", missionId, "actions"],
    queryFn: () => actionsApi.listByMission(missionId),
    enabled: Boolean(missionId),
  });
}

export function useActionQuery(actionId: string) {
  return useQuery({
    queryKey: ["actions", actionId],
    queryFn: () => actionsApi.getById(actionId),
    enabled: Boolean(actionId),
  });
}

export function useActionAssignmentsQuery(actionId: string) {
  return useQuery({
    queryKey: ["actions", actionId, "assignments"],
    queryFn: () => actionAssignmentsApi.listByAction(actionId),
    enabled: Boolean(actionId),
  });
}

export function useAssignmentDetailQuery(assignmentId: string) {
  return useQuery({
    queryKey: ["action-assignments", assignmentId],
    queryFn: () => actionAssignmentsApi.getById(assignmentId),
    enabled: Boolean(assignmentId),
  });
}

export function useAssignmentsQuery(params: AssignmentListParams) {
  return useQuery({
    queryKey: ["action-assignments", params],
    queryFn: () => actionAssignmentsApi.list(params),
  });
}

export function useAssignmentDeliverablesQuery(assignmentId: string) {
  return useQuery({
    queryKey: ["deliverables", assignmentId],
    queryFn: () => deliverablesApi.listByAssignment(assignmentId),
    enabled: Boolean(assignmentId),
  });
}

export function useAssignmentPostsQuery(assignmentId: string) {
  return useQuery({
    queryKey: ["assignment-posts", assignmentId],
    queryFn: () => postsApi.listByAssignment(assignmentId),
    enabled: Boolean(assignmentId),
  });
}

export function useInfluencersQuery() {
  return useQuery({
    queryKey: ["influencers"],
    queryFn: () => influencersApi.list({ page: 1, limit: 50 }),
  });
}

function useAssignmentMutationInvalidation(
  assignmentId: string,
  actionId?: string,
) {
  const queryClient = useQueryClient();

  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ["action-assignments", assignmentId],
      }),
      queryClient.invalidateQueries({
        queryKey: ["action-assignments"],
      }),
      queryClient.invalidateQueries({
        queryKey: ["deliverables", assignmentId],
      }),
      ...(actionId
        ? [
            queryClient.invalidateQueries({
              queryKey: ["actions", actionId, "assignments"],
            }),
          ]
        : []),
    ]);
  };
}

export function useAcceptAssignmentMutation(
  assignmentId: string,
  actionId?: string,
) {
  const queryClient = useQueryClient();
  const invalidate = useAssignmentMutationInvalidation(assignmentId, actionId);

  return useMutation({
    mutationFn: () => actionAssignmentsApi.accept(assignmentId),
    onMutate: async () => {
      const snapshot = await snapshotAssignmentMutation(
        queryClient,
        assignmentId,
        actionId,
      );
      const optimisticUpdatedAt = new Date().toISOString();

      patchAssignmentInCaches(queryClient, assignmentId, (assignment) => ({
        ...assignment,
        assignment_status: "accepted",
        updated_at: optimisticUpdatedAt,
      }));
      patchActionAssignmentsResponse(
        queryClient,
        actionId,
        assignmentId,
        (assignment) => ({
          ...assignment,
          assignment_status: "accepted",
          updated_at: optimisticUpdatedAt,
        }),
      );

      return snapshot;
    },
    onError: (_error, _variables, snapshot) => {
      restoreAssignmentSnapshot(queryClient, assignmentId, actionId, snapshot);
    },
    onSuccess: async (assignment) => {
      applyServerAssignment(queryClient, assignmentId, actionId, assignment);
      await invalidate();
    },
  });
}

export function useStartAssignmentMutation(
  assignmentId: string,
  actionId?: string,
) {
  const queryClient = useQueryClient();
  const invalidate = useAssignmentMutationInvalidation(assignmentId, actionId);

  return useMutation({
    mutationFn: () => actionAssignmentsApi.start(assignmentId),
    onMutate: async () => {
      const snapshot = await snapshotAssignmentMutation(
        queryClient,
        assignmentId,
        actionId,
      );
      const optimisticUpdatedAt = new Date().toISOString();

      patchAssignmentInCaches(queryClient, assignmentId, (assignment) => ({
        ...assignment,
        assignment_status: "in_progress",
        updated_at: optimisticUpdatedAt,
      }));
      patchActionAssignmentsResponse(
        queryClient,
        actionId,
        assignmentId,
        (assignment) => ({
          ...assignment,
          assignment_status: "in_progress",
          updated_at: optimisticUpdatedAt,
        }),
      );

      return snapshot;
    },
    onError: (_error, _variables, snapshot) => {
      restoreAssignmentSnapshot(queryClient, assignmentId, actionId, snapshot);
    },
    onSuccess: async (assignment) => {
      applyServerAssignment(queryClient, assignmentId, actionId, assignment);
      await invalidate();
    },
  });
}

export function useSubmitAssignmentMutation(
  assignmentId: string,
  actionId?: string,
) {
  const queryClient = useQueryClient();
  const invalidate = useAssignmentMutationInvalidation(assignmentId, actionId);

  return useMutation({
    mutationFn: (payload: SubmitAssignmentPayload) =>
      actionAssignmentsApi.submit(assignmentId, payload),
    onMutate: async (payload) => {
      const snapshot = await snapshotAssignmentMutation(
        queryClient,
        assignmentId,
        actionId,
      );
      const optimisticNow = new Date().toISOString();

      patchAssignmentInCaches(queryClient, assignmentId, (assignment) => ({
        ...assignment,
        assignment_status: "submitted",
        deliverable_count_submitted:
          assignment.deliverable_count_submitted + payload.deliverables.length,
        updated_at: optimisticNow,
      }));
      patchActionAssignmentsResponse(
        queryClient,
        actionId,
        assignmentId,
        (assignment) => ({
          ...assignment,
          assignment_status: "submitted",
          deliverable_count_submitted:
            assignment.deliverable_count_submitted + payload.deliverables.length,
          updated_at: optimisticNow,
        }),
      );
      patchDeliverablesCache(queryClient, assignmentId, (value) => ({
        ...value,
        data: [
          ...value.data,
          ...payload.deliverables.map((deliverable, index) => ({
            id: `optimistic-${assignmentId}-${index}-${optimisticNow}`,
            action_assignment_id: assignmentId,
            deliverable_type: deliverable.deliverable_type,
            description: deliverable.description ?? null,
            status: "submitted" as const,
            submission_url: deliverable.submission_url ?? null,
            rejection_reason: null,
            submitted_by_user_id: null,
            submitted_at: optimisticNow,
            approved_at: null,
            created_at: optimisticNow,
            updated_at: optimisticNow,
          })),
        ],
        meta: {
          ...value.meta,
          total: value.meta.total + payload.deliverables.length,
        },
      }));

      return snapshot;
    },
    onError: (_error, _variables, snapshot) => {
      restoreAssignmentSnapshot(queryClient, assignmentId, actionId, snapshot);
    },
    onSuccess: async (response: SubmitAssignmentResponse) => {
      applyServerAssignment(
        queryClient,
        assignmentId,
        actionId,
        response.assignment,
      );
      mergeDeliverablesIntoCache(
        queryClient,
        assignmentId,
        response.deliverables,
      );
      await invalidate();
    },
  });
}

export function useCreateDeliverablePostMutation(
  assignmentId: string,
  actionId?: string,
) {
  const queryClient = useQueryClient();
  const invalidateAssignment = useAssignmentMutationInvalidation(
    assignmentId,
    actionId,
  );

  return useMutation({
    mutationFn: ({
      deliverableId,
      payload,
    }: {
      deliverableId: string;
      payload: CreateDeliverablePostPayload;
    }) => postsApi.createForDeliverable(deliverableId, payload),
    onSuccess: async () => {
      await Promise.all([
        invalidateAssignment(),
        queryClient.invalidateQueries({
          queryKey: ["assignment-posts", assignmentId],
        }),
      ]);
    },
  });
}

export function useApproveDeliverableMutation(
  assignmentId: string,
  actionId?: string,
) {
  const queryClient = useQueryClient();
  const invalidateAssignment = useAssignmentMutationInvalidation(
    assignmentId,
    actionId,
  );

  return useMutation({
    mutationFn: (deliverableId: string) => deliverablesApi.approve(deliverableId),
    onMutate: async (deliverableId) => {
      const snapshot = await snapshotAssignmentMutation(
        queryClient,
        assignmentId,
        actionId,
      );
      const optimisticNow = new Date().toISOString();

      patchAssignmentInCaches(queryClient, assignmentId, (assignment) => ({
        ...assignment,
        assignment_status: "approved",
        updated_at: optimisticNow,
      }));
      patchActionAssignmentsResponse(
        queryClient,
        actionId,
        assignmentId,
        (assignment) => ({
          ...assignment,
          assignment_status: "approved",
          updated_at: optimisticNow,
        }),
      );
      patchDeliverablesCache(queryClient, assignmentId, (value) => ({
        ...value,
        data: value.data.map((deliverable) =>
          deliverable.id === deliverableId
            ? {
                ...deliverable,
                status: "approved",
                approved_at: optimisticNow,
                rejection_reason: null,
                updated_at: optimisticNow,
              }
            : deliverable,
        ),
      }));

      return snapshot;
    },
    onError: (_error, _variables, snapshot) => {
      restoreAssignmentSnapshot(queryClient, assignmentId, actionId, snapshot);
    },
    onSuccess: async (response: DeliverableReviewResponse) => {
      applyServerAssignment(
        queryClient,
        assignmentId,
        actionId,
        response.assignment,
      );
      patchDeliverablesCache(queryClient, assignmentId, (value) => ({
        ...value,
        data: value.data.map((deliverable) =>
          deliverable.id === response.deliverable.id
            ? response.deliverable
            : deliverable,
        ),
      }));
      await Promise.all([
        invalidateAssignment(),
        queryClient.invalidateQueries({
          queryKey: ["assignment-posts", assignmentId],
        }),
      ]);
    },
  });
}

export function useRejectDeliverableMutation(
  assignmentId: string,
  actionId?: string,
) {
  const queryClient = useQueryClient();
  const invalidateAssignment = useAssignmentMutationInvalidation(
    assignmentId,
    actionId,
  );

  return useMutation({
    mutationFn: ({
      deliverableId,
      payload,
    }: {
      deliverableId: string;
      payload: RejectDeliverablePayload;
    }) => deliverablesApi.reject(deliverableId, payload),
    onMutate: async ({ deliverableId, payload }) => {
      const snapshot = await snapshotAssignmentMutation(
        queryClient,
        assignmentId,
        actionId,
      );
      const optimisticNow = new Date().toISOString();

      patchAssignmentInCaches(queryClient, assignmentId, (assignment) => ({
        ...assignment,
        assignment_status: "rejected",
        updated_at: optimisticNow,
      }));
      patchActionAssignmentsResponse(
        queryClient,
        actionId,
        assignmentId,
        (assignment) => ({
          ...assignment,
          assignment_status: "rejected",
          updated_at: optimisticNow,
        }),
      );
      patchDeliverablesCache(queryClient, assignmentId, (value) => ({
        ...value,
        data: value.data.map((deliverable) =>
          deliverable.id === deliverableId
            ? {
                ...deliverable,
                status: "rejected",
                rejection_reason: payload.reason,
                approved_at: null,
                updated_at: optimisticNow,
              }
            : deliverable,
        ),
      }));

      return snapshot;
    },
    onError: (_error, _variables, snapshot) => {
      restoreAssignmentSnapshot(queryClient, assignmentId, actionId, snapshot);
    },
    onSuccess: async (response: DeliverableReviewResponse) => {
      applyServerAssignment(
        queryClient,
        assignmentId,
        actionId,
        response.assignment,
      );
      patchDeliverablesCache(queryClient, assignmentId, (value) => ({
        ...value,
        data: value.data.map((deliverable) =>
          deliverable.id === response.deliverable.id
            ? response.deliverable
            : deliverable,
        ),
      }));
      await Promise.all([
        invalidateAssignment(),
        queryClient.invalidateQueries({
          queryKey: ["assignment-posts", assignmentId],
        }),
      ]);
    },
  });
}
