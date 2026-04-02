import { Module } from "@nestjs/common";

import { InstagramAdapter } from "./adapters/instagram.adapter";
import { TiktokAdapter } from "./adapters/tiktok.adapter";
import { TwitterXAdapter } from "./adapters/twitter-x.adapter";
import { YoutubeAdapter } from "./adapters/youtube.adapter";
import { PlatformIntegrationService } from "./platform-integration.service";

@Module({
  providers: [
    InstagramAdapter,
    TiktokAdapter,
    YoutubeAdapter,
    TwitterXAdapter,
    PlatformIntegrationService,
  ],
  exports: [PlatformIntegrationService],
})
export class IntegrationsModule {}
