import { Module } from "@nestjs/common";

import { AuditLogService } from "../../common/services/audit-log.service";
import { CampaignsController } from "./campaigns.controller";
import { CampaignsService } from "./campaigns.service";

@Module({
  controllers: [CampaignsController],
  providers: [CampaignsService, AuditLogService],
  exports: [CampaignsService],
})
export class CampaignsModule {}
