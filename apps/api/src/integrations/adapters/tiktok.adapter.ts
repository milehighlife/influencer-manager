import { Injectable } from "@nestjs/common";
import { SocialPlatform } from "@prisma/client";

import { PlatformAdapter } from "../platform-adapter.interface";
import { assertNormalizedMetricsShape } from "../platform-adapter.validation";
import type {
  PlatformMetricFetchResult,
  PlatformPostReference,
} from "../types/platform-metrics.types";
import { buildMockMetrics } from "../utils/mock-metrics.util";

@Injectable()
export class TiktokAdapter implements PlatformAdapter {
  readonly platform = SocialPlatform.tiktok;

  async fetchPostMetrics(
    post: PlatformPostReference,
  ): Promise<PlatformMetricFetchResult> {
    const rawResponse = {
      source: "tiktok-placeholder",
      item_id: post.externalPostId ?? post.postId,
      payload: buildMockMetrics(23, post),
    };

    this.validateResponseShape(rawResponse);

    return {
      normalizedMetrics: this.normalizeRawMetrics(rawResponse, post),
      rawResponse,
      importMetadata: {
        adapter: "tiktok",
        mode: "placeholder",
      },
    };
  }

  normalizeRawMetrics(rawResponse: unknown, post: PlatformPostReference) {
    const metrics = (rawResponse as { payload: ReturnType<typeof buildMockMetrics> }).payload;
    assertNormalizedMetricsShape(metrics);
    return {
      ...metrics,
      capturedAt: new Date().toISOString(),
    };
  }

  validateResponseShape(rawResponse: unknown) {
    const parsed = rawResponse as { payload?: unknown };
    if (!parsed.payload) {
      throw new Error("TikTok placeholder response is missing payload.");
    }
  }
}
