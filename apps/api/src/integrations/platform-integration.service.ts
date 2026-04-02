import { Injectable, NotFoundException } from "@nestjs/common";
import type { SocialPlatform } from "@prisma/client";

import { InstagramAdapter } from "./adapters/instagram.adapter";
import { TiktokAdapter } from "./adapters/tiktok.adapter";
import { TwitterXAdapter } from "./adapters/twitter-x.adapter";
import { YoutubeAdapter } from "./adapters/youtube.adapter";
import type { PlatformAdapter } from "./platform-adapter.interface";
import type {
  PlatformMetricFetchResult,
  PlatformPostReference,
} from "./types/platform-metrics.types";

@Injectable()
export class PlatformIntegrationService {
  private readonly adapters: PlatformAdapter[];

  constructor(
    instagramAdapter: InstagramAdapter,
    tiktokAdapter: TiktokAdapter,
    youtubeAdapter: YoutubeAdapter,
    twitterXAdapter: TwitterXAdapter,
  ) {
    this.adapters = [
      instagramAdapter,
      tiktokAdapter,
      youtubeAdapter,
      twitterXAdapter,
    ];
  }

  async fetchPostMetrics(
    post: PlatformPostReference,
  ): Promise<PlatformMetricFetchResult> {
    return this.getAdapter(post.platform).fetchPostMetrics(post);
  }

  private getAdapter(platform: SocialPlatform): PlatformAdapter {
    const adapter = this.adapters.find((candidate) => candidate.platform === platform);

    if (!adapter) {
      throw new NotFoundException(
        `No platform adapter is registered for ${platform}.`,
      );
    }

    return adapter;
  }
}
