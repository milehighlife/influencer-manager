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
export class YoutubeAdapter implements PlatformAdapter {
  readonly platform = SocialPlatform.youtube;

  async fetchPostMetrics(
    post: PlatformPostReference,
  ): Promise<PlatformMetricFetchResult> {
    const rawResponse = {
      source: "youtube-placeholder",
      video_id: post.externalPostId ?? post.postId,
      statistics: buildMockMetrics(37, post),
    };

    this.validateResponseShape(rawResponse);

    return {
      normalizedMetrics: this.normalizeRawMetrics(rawResponse, post),
      rawResponse,
      importMetadata: {
        adapter: "youtube",
        mode: "placeholder",
      },
    };
  }

  normalizeRawMetrics(rawResponse: unknown, post: PlatformPostReference) {
    const metrics = (rawResponse as { statistics: ReturnType<typeof buildMockMetrics> }).statistics;
    assertNormalizedMetricsShape(metrics);
    return {
      ...metrics,
      capturedAt: new Date().toISOString(),
    };
  }

  validateResponseShape(rawResponse: unknown) {
    const parsed = rawResponse as { statistics?: unknown };
    if (!parsed.statistics) {
      throw new Error("YouTube placeholder response is missing statistics.");
    }
  }
}
