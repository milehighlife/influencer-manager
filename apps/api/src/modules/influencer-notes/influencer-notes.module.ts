import { Module } from "@nestjs/common";

import { InfluencerNotesController } from "./influencer-notes.controller";
import { InfluencerNotesService } from "./influencer-notes.service";

@Module({
  controllers: [InfluencerNotesController],
  providers: [InfluencerNotesService],
  exports: [InfluencerNotesService],
})
export class InfluencerNotesModule {}
