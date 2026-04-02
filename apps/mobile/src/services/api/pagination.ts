import type { PaginationMeta } from "@influencer-manager/shared/types/mobile";

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export function createPaginationParams(params: PaginationParams = {}) {
  return {
    page: params.page ?? 1,
    limit: params.limit ?? 20,
  };
}

export function hasNextPage(meta: PaginationMeta) {
  return meta.page < meta.totalPages;
}
