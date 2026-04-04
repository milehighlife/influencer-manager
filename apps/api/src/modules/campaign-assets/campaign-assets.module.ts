import { Module } from "@nestjs/common";

import { CampaignAssetsController } from "./campaign-assets.controller";
import { CampaignAssetsService } from "./campaign-assets.service";

@Module({
  controllers: [CampaignAssetsController],
  providers: [CampaignAssetsService],
  exports: [CampaignAssetsService],
})
export class CampaignAssetsModule {}
