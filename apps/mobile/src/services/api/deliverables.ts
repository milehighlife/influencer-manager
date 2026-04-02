import type {
  Deliverable,
  DeliverableReviewResponse,
  PaginatedResponse,
  RejectDeliverablePayload,
} from "@influencer-manager/shared/types/mobile";

import { apiClient } from "./client";
import { createPaginationParams, type PaginationParams } from "./pagination";

export interface DeliverableListParams extends PaginationParams {
  action_assignment_id?: string;
  status?: string;
}

export const deliverablesApi = {
  list(params: DeliverableListParams = {}) {
    return apiClient.get<PaginatedResponse<Deliverable>>("/deliverables", {
      ...createPaginationParams(params),
      action_assignment_id: params.action_assignment_id,
      status: params.status,
    });
  },
  listByAssignment(actionAssignmentId: string) {
    return this.list({
      action_assignment_id: actionAssignmentId,
      page: 1,
      limit: 50,
    });
  },
  approve(deliverableId: string) {
    return apiClient.post<DeliverableReviewResponse>(
      `/deliverables/${deliverableId}/approve`,
    );
  },
  reject(deliverableId: string, payload: RejectDeliverablePayload) {
    return apiClient.post<DeliverableReviewResponse>(
      `/deliverables/${deliverableId}/reject`,
      payload,
    );
  },
};
