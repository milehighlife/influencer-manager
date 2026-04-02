import type { SocialPlatform } from "@prisma/client";

export interface PlatformPostReference {
  organizationId: string;
  postId: string;
  platform: SocialPlatform;
  externalPostId?: string | null;
  postUrl: string;
}

export interface NormalizedPostMetrics {
  capturedAt: string;
  impressions: number;
  reach: number;
  views: number;
  videoViews: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  clicks: number;
  conversions: number;
}

export interface PlatformMetricFetchResult {
  normalizedMetrics: NormalizedPostMetrics;
  rawResponse: unknown;
  importMetadata: Record<string, unknown>;
}
