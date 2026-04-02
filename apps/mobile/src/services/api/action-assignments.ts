import type {
  ActionAssignment,
  ActionAssignmentsResponse,
  AssignmentStatus,
  PaginatedResponse,
  SubmitAssignmentPayload,
  SubmitAssignmentResponse,
} from "@influencer-manager/shared/types/mobile";

import { createPaginationParams, type PaginationParams } from "./pagination";
import { apiClient } from "./client";

export interface AssignmentListParams extends PaginationParams {
  action_id?: string;
  influencer_id?: string;
  campaign_id?: string;
  assignment_status?: AssignmentStatus;
}

export const actionAssignmentsApi = {
  list(params: AssignmentListParams = {}) {
    return apiClient.get<PaginatedResponse<ActionAssignment>>("/action-assignments", {
      ...createPaginationParams(params),
      action_id: params.action_id,
      influencer_id: params.influencer_id,
      campaign_id: params.campaign_id,
      assignment_status: params.assignment_status,
    });
  },
  getById(assignmentId: string) {
    return apiClient.get<ActionAssignment>(`/action-assignments/${assignmentId}`);
  },
  listByAction(actionId: string) {
    return apiClient.get<ActionAssignmentsResponse>(`/actions/${actionId}/assignments`);
  },
  accept(assignmentId: string) {
    return apiClient.post<ActionAssignment>(
      `/action-assignments/${assignmentId}/accept`,
    );
  },
  start(assignmentId: string) {
    return apiClient.post<ActionAssignment>(
      `/action-assignments/${assignmentId}/start`,
    );
  },
  submit(assignmentId: string, payload: SubmitAssignmentPayload) {
    return apiClient.post<SubmitAssignmentResponse>(
      `/action-assignments/${assignmentId}/submit`,
      payload,
    );
  },
};
