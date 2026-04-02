import type {
  AssignmentPostsResponse,
  CreateDeliverablePostPayload,
  CreateDeliverablePostResponse,
  LinkedPostRecord,
} from "@influencer-manager/shared/types/mobile";

import { apiClient } from "./client";

export const postsApi = {
  listByAssignment(actionAssignmentId: string) {
    return apiClient.get<AssignmentPostsResponse>(
      `/action-assignments/${actionAssignmentId}/posts`,
    );
  },
  listByDeliverable(deliverableId: string) {
    return apiClient.get<LinkedPostRecord[]>(`/deliverables/${deliverableId}/posts`);
  },
  createForDeliverable(
    deliverableId: string,
    payload: CreateDeliverablePostPayload,
  ) {
    return apiClient.post<CreateDeliverablePostResponse>(
      `/deliverables/${deliverableId}/posts`,
      payload,
    );
  },
};
