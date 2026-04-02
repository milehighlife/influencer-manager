import { BadRequestException } from "@nestjs/common";

import type { NormalizedPostMetrics } from "./types/platform-metrics.types";

export function assertNormalizedMetricsShape(
  metrics: NormalizedPostMetrics,
): void {
  const numericFields: Array<keyof Omit<NormalizedPostMetrics, "capturedAt">> = [
    "impressions",
    "reach",
    "views",
    "videoViews",
    "likes",
    "comments",
    "shares",
    "saves",
    "clicks",
    "conversions",
  ];

  if (!metrics.capturedAt) {
    throw new BadRequestException("Normalized metrics require capturedAt.");
  }

  for (const field of numericFields) {
    if (typeof metrics[field] !== "number" || Number.isNaN(metrics[field])) {
      throw new BadRequestException(
        `Normalized metrics field ${field} must be a valid number.`,
      );
    }
  }
}
