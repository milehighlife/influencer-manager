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
export class InstagramAdapter implements PlatformAdapter {
  readonly platform = SocialPlatform.instagram;

  async fetchPostMetrics(
    post: PlatformPostReference,
  ): Promise<PlatformMetricFetchResult> {
    const rawResponse = {
      source: "instagram-placeholder",
      post_id: post.externalPostId ?? post.postId,
      metrics: buildMockMetrics(11, post),
    };

    this.validateResponseShape(rawResponse);

    return {
      normalizedMetrics: this.normalizeRawMetrics(rawResponse, post),
      rawResponse,
      importMetadata: {
        adapter: "instagram",
        mode: "placeholder",
      },
    };
  }

  normalizeRawMetrics(rawResponse: unknown, post: PlatformPostReference) {
    const metrics = (rawResponse as { metrics: ReturnType<typeof buildMockMetrics> }).metrics;
    assertNormalizedMetricsShape(metrics);
    return {
      ...metrics,
      capturedAt: new Date().toISOString(),
    };
  }

  validateResponseShape(rawResponse: unknown) {
    const parsed = rawResponse as { metrics?: unknown };
    if (!parsed.metrics) {
      throw new Error("Instagram placeholder response is missing metrics.");
    }
  }
}
