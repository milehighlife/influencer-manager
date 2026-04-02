import type {
  CreatorAssignmentSortField,
  CreateDeliverablePostPayload,
  InfluencerStatusDigestResponse,
  InfluencerLinkPostResponse,
  InfluencerWorkspaceAssignment,
  InfluencerWorkspaceAssignmentDetailResponse,
  InfluencerWorkspaceAssignmentListResponse,
  InfluencerWorkspacePost,
  InfluencerWorkspacePostListResponse,
  InfluencerWorkspacePostPerformanceResponse,
  SocialPlatform,
  SubmitAssignmentPayload,
  SubmitAssignmentResponse,
} from "@influencer-manager/shared/types/mobile";

import { createPaginationParams, type PaginationParams } from "./pagination";
import { apiClient } from "./client";

export interface InfluencerAssignmentListParams extends PaginationParams {
  assignment_status?: InfluencerWorkspaceAssignment["assignment_status"];
  search?: string;
  sort_by?: CreatorAssignmentSortField;
}

export interface InfluencerPostListParams extends PaginationParams {
  platform?: SocialPlatform;
}

export const influencerWorkspaceApi = {
  listAssignments(params: InfluencerAssignmentListParams = {}) {
    return apiClient.get<InfluencerWorkspaceAssignmentListResponse>(
      "/influencer/assignments",
      {
        ...createPaginationParams(params),
        assignment_status: params.assignment_status,
        search: params.search,
        sort_by: params.sort_by,
      },
    );
  },
  getAssignment(assignmentId: string) {
    return apiClient.get<InfluencerWorkspaceAssignmentDetailResponse>(
      `/influencer/assignments/${assignmentId}`,
    );
  },
  getStatusDigest(limit = 20) {
    return apiClient.get<InfluencerStatusDigestResponse>(
      "/influencer/status-digest",
      {
        limit,
      },
    );
  },
  acceptAssignment(assignmentId: string) {
    return apiClient.post<InfluencerWorkspaceAssignment>(
      `/influencer/assignments/${assignmentId}/accept`,
    );
  },
  startAssignment(assignmentId: string) {
    return apiClient.post<InfluencerWorkspaceAssignment>(
      `/influencer/assignments/${assignmentId}/start`,
    );
  },
  submitDeliverables(
    assignmentId: string,
    payload: SubmitAssignmentPayload,
  ) {
    return apiClient.post<SubmitAssignmentResponse>(
      `/influencer/assignments/${assignmentId}/deliverables`,
      payload,
    );
  },
  linkPost(deliverableId: string, payload: CreateDeliverablePostPayload) {
    return apiClient.post<InfluencerLinkPostResponse>(
      `/influencer/deliverables/${deliverableId}/posts`,
      payload,
    );
  },
  listPosts(params: InfluencerPostListParams = {}) {
    return apiClient.get<InfluencerWorkspacePostListResponse>(
      "/influencer/posts",
      {
        ...createPaginationParams(params),
        platform: params.platform,
      },
    );
  },
  getPostPerformance(postId: string) {
    return apiClient.get<InfluencerWorkspacePostPerformanceResponse>(
      `/influencer/posts/${postId}/performance`,
    );
  },
};
