import { Module } from "@nestjs/common";

import { ReportsModule } from "../reports/reports.module";
import { PerformanceSnapshotsController } from "./performance-snapshots.controller";
import { PerformanceSnapshotsService } from "./performance-snapshots.service";

@Module({
  imports: [ReportsModule],
  controllers: [PerformanceSnapshotsController],
  providers: [PerformanceSnapshotsService],
  exports: [PerformanceSnapshotsService],
})
export class PerformanceSnapshotsModule {}
