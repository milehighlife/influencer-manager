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
export class TwitterXAdapter implements PlatformAdapter {
  readonly platform = SocialPlatform.x;

  async fetchPostMetrics(
    post: PlatformPostReference,
  ): Promise<PlatformMetricFetchResult> {
    const rawResponse = {
      source: "twitter-x-placeholder",
      tweet_id: post.externalPostId ?? post.postId,
      data: buildMockMetrics(41, post),
    };

    this.validateResponseShape(rawResponse);

    return {
      normalizedMetrics: this.normalizeRawMetrics(rawResponse, post),
      rawResponse,
      importMetadata: {
        adapter: "twitter-x",
        mode: "placeholder",
      },
    };
  }

  normalizeRawMetrics(rawResponse: unknown, post: PlatformPostReference) {
    const metrics = (rawResponse as { data: ReturnType<typeof buildMockMetrics> }).data;
    assertNormalizedMetricsShape(metrics);
    return {
      ...metrics,
      capturedAt: new Date().toISOString(),
    };
  }

  validateResponseShape(rawResponse: unknown) {
    const parsed = rawResponse as { data?: unknown };
    if (!parsed.data) {
      throw new Error("Twitter/X placeholder response is missing data.");
    }
  }
}
