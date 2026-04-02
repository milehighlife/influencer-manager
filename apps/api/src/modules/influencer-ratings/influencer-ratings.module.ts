import { Module } from "@nestjs/common";

import { InfluencerRatingsController } from "./influencer-ratings.controller";
import { InfluencerRatingsService } from "./influencer-ratings.service";

@Module({
  controllers: [InfluencerRatingsController],
  providers: [InfluencerRatingsService],
  exports: [InfluencerRatingsService],
})
export class InfluencerRatingsModule {}
