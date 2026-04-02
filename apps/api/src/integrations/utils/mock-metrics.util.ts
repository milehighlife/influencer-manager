import type {
  NormalizedPostMetrics,
  PlatformPostReference,
} from "../types/platform-metrics.types";

export function buildMockMetrics(
  platformSeed: number,
  post: PlatformPostReference,
): NormalizedPostMetrics {
  const postSeed =
    post.postId.split("").reduce((total, char) => total + char.charCodeAt(0), 0) +
    platformSeed;

  return {
    capturedAt: new Date().toISOString(),
    impressions: 1000 + (postSeed % 5000),
    reach: 700 + (postSeed % 3200),
    views: 500 + (postSeed % 2500),
    videoViews: 400 + (postSeed % 2200),
    likes: 40 + (postSeed % 500),
    comments: 5 + (postSeed % 75),
    shares: 2 + (postSeed % 40),
    saves: 3 + (postSeed % 60),
    clicks: 1 + (postSeed % 90),
    conversions: postSeed % 15,
  };
}
