import { Module } from "@nestjs/common";

import { IntegrationsModule } from "../integrations/integrations.module";
import { ImportLogsModule } from "../modules/import-logs/import-logs.module";
import { PerformanceSnapshotsModule } from "../modules/performance-snapshots/performance-snapshots.module";
import { ReportsModule } from "../modules/reports/reports.module";
import { CampaignAggregationProcessor } from "./processors/campaign-aggregation.processor";
import { MetricSyncProcessor } from "./processors/metric-sync.processor";
import { PostRefreshProcessor } from "./processors/post-refresh.processor";
import { QueueService } from "./queue.service";
import { WorkerRunnerService } from "./worker-runner.service";

@Module({
  imports: [
    IntegrationsModule,
    ImportLogsModule,
    PerformanceSnapshotsModule,
    ReportsModule,
  ],
  providers: [
    QueueService,
    MetricSyncProcessor,
    PostRefreshProcessor,
    CampaignAggregationProcessor,
    WorkerRunnerService,
  ],
  exports: [QueueService],
})
export class JobsModule {}
