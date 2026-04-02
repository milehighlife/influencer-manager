import { Module } from "@nestjs/common";

import { ReportsController } from "./reports.controller";
import { AnalyticsAggregationService } from "./analytics-aggregation.service";
import { ReportsService } from "./reports.service";

@Module({
  controllers: [ReportsController],
  providers: [AnalyticsAggregationService, ReportsService],
  exports: [AnalyticsAggregationService, ReportsService],
})
export class ReportsModule {}
