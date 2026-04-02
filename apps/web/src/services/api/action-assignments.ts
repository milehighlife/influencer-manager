import type {
  ActionAssignment,
  ActionAssignmentsResponse,
} from "@influencer-manager/shared/types/mobile";

import { apiClient } from "./client";

export interface CreateAssignmentPayload {
  influencer_id: string;
  assignment_status?: ActionAssignment["assignment_status"];
  assigned_at?: string;
  due_date?: string;
  completion_date?: string;
  deliverable_count_expected?: number;
  deliverable_count_submitted?: number;
}

export const actionAssignmentsApi = {
  listByAction(actionId: string) {
    return apiClient.get<ActionAssignmentsResponse>(`/actions/${actionId}/assignments`);
  },
  createForAction(actionId: string, payload: CreateAssignmentPayload) {
    return apiClient.post<ActionAssignment>(`/actions/${actionId}/assignments`, payload);
  },
  remove(assignmentId: string) {
    return apiClient.delete<{ id: string }>(`/action-assignments/${assignmentId}`);
  },
};
