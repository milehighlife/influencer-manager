import { Module } from "@nestjs/common";

import { BulkOutreachProcessor } from "../../jobs/processors/bulk-outreach.processor";
import { ConversationsController } from "./conversations.controller";
import { ConversationsService } from "./conversations.service";

@Module({
  controllers: [ConversationsController],
  providers: [ConversationsService, BulkOutreachProcessor],
  exports: [ConversationsService],
})
export class ConversationsModule {}
