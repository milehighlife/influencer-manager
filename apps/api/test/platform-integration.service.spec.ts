import { SocialPlatform } from "@prisma/client";
import { describe, expect, it } from "@jest/globals";

import { InstagramAdapter } from "../src/integrations/adapters/instagram.adapter";
import { TiktokAdapter } from "../src/integrations/adapters/tiktok.adapter";
import { TwitterXAdapter } from "../src/integrations/adapters/twitter-x.adapter";
import { YoutubeAdapter } from "../src/integrations/adapters/youtube.adapter";
import { PlatformIntegrationService } from "../src/integrations/platform-integration.service";

describe("PlatformIntegrationService", () => {
  it("selects the correct adapter and returns normalized placeholder metrics", async () => {
    const service = new PlatformIntegrationService(
      new InstagramAdapter(),
      new TiktokAdapter(),
      new YoutubeAdapter(),
      new TwitterXAdapter(),
    );

    const result = await service.fetchPostMetrics({
      organizationId: "org-1",
      postId: "post-1",
      platform: SocialPlatform.instagram,
      externalPostId: "ig_123",
      postUrl: "https://instagram.com/p/abc",
    });

    expect(result.importMetadata).toMatchObject({
      adapter: "instagram",
      mode: "placeholder",
    });
    expect(result.normalizedMetrics.impressions).toBeGreaterThan(0);
    expect(result.normalizedMetrics.capturedAt).toBeTruthy();
  });
});
