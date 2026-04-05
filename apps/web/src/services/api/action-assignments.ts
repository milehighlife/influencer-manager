import type {
  ActionAssignment,
  ActionAssignmentsResponse,
  AssignmentPostsResponse,
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

export interface UpdateAssignmentPayload {
  assignment_status?: string;
  submission_url?: string | null;
  published_at?: string | null;
  completion_date?: string | null;
  total_views?: number;
  total_comments?: number;
  total_shares?: number;
  metrics_updated_at?: string | null;
}

export interface BulkAssignmentItem {
  action_id: string;
  influencer_id: string;
}

export interface BulkAssignmentResult {
  created: number;
  skipped: number;
}

export const actionAssignmentsApi = {
  listByAction(actionId: string) {
    return apiClient.get<ActionAssignmentsResponse>(`/actions/${actionId}/assignments`);
  },
  createForAction(actionId: string, payload: CreateAssignmentPayload) {
    return apiClient.post<ActionAssignment>(`/actions/${actionId}/assignments`, payload);
  },
  bulkCreate(assignments: BulkAssignmentItem[]) {
    return apiClient.post<BulkAssignmentResult>("/action-assignments/bulk", {
      assignments,
    });
  },
  update(assignmentId: string, payload: UpdateAssignmentPayload) {
    return apiClient.patch<ActionAssignment>(
      `/action-assignments/${assignmentId}`,
      payload,
    );
  },
  remove(assignmentId: string) {
    return apiClient.delete<{ id: string }>(`/action-assignments/${assignmentId}`);
  },
  getPosts(assignmentId: string) {
    return apiClient.get<AssignmentPostsResponse>(
      `/action-assignments/${assignmentId}/posts`,
    );
  },
  getUnratedPublished(params: { search?: string; page?: number; limit?: number } = {}) {
    return apiClient.get<PaginatedActionList>(
      "/action-assignments/unrated-published",
      {
        search: params.search,
        page: params.page,
        limit: params.limit,
      },
    );
  },
  getReviewed(params: { search?: string; page?: number; limit?: number } = {}) {
    return apiClient.get<PaginatedActionList>(
      "/action-assignments/reviewed",
      {
        search: params.search,
        page: params.page,
        limit: params.limit,
      },
    );
  },
  getOverdue(params: { search?: string; page?: number; limit?: number } = {}) {
    return apiClient.get<PaginatedActionList>(
      "/action-assignments/overdue",
      {
        search: params.search,
        page: params.page,
        limit: params.limit,
      },
    );
  },
  getPendingReview(params: { search?: string; page?: number; limit?: number } = {}) {
    return apiClient.get<PaginatedActionList>(
      "/action-assignments/pending-review",
      {
        search: params.search,
        page: params.page,
        limit: params.limit,
      },
    );
  },
  approve(assignmentId: string) {
    return apiClient.post<ActionAssignment>(
      `/action-assignments/${assignmentId}/approve`,
    );
  },
  requestRevision(assignmentId: string, reason: string) {
    return apiClient.post<ActionAssignment>(
      `/action-assignments/${assignmentId}/request-revision`,
      { reason },
    );
  },
};

export interface PaginatedActionList {
  data: UnratedPublishedAction[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface UnratedPublishedAction {
  id: string;
  action_id: string;
  action_title: string;
  campaign_id: string | null;
  campaign_name: string | null;
  client_name: string | null;
  company_name: string | null;
  influencer_id: string;
  influencer_name: string;
  due_date: string | null;
  rating_average?: number | null;
  submission_url?: string | null;
}
