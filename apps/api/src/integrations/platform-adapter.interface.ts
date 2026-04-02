import type { SocialPlatform } from "@prisma/client";

import type {
  PlatformMetricFetchResult,
  PlatformPostReference,
} from "./types/platform-metrics.types";

export interface PlatformAdapter {
  readonly platform: SocialPlatform;
  fetchPostMetrics(
    post: PlatformPostReference,
  ): Promise<PlatformMetricFetchResult>;
  normalizeRawMetrics(
    rawResponse: unknown,
    post: PlatformPostReference,
  ): PlatformMetricFetchResult["normalizedMetrics"];
  validateResponseShape(rawResponse: unknown): void;
}
