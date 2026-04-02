import { Injectable } from "@nestjs/common";

import { AnalyticsAggregationService } from "../../modules/reports/analytics-aggregation.service";
import type { CampaignAggregationJobData } from "../interfaces/campaign-aggregation-job.interface";

@Injectable()
export class CampaignAggregationProcessor {
  constructor(
    private readonly analyticsAggregationService: AnalyticsAggregationService,
  ) {}

  async process(data: CampaignAggregationJobData) {
    await this.analyticsAggregationService.refreshCampaignHierarchy(
      data.organizationId,
      data.campaignId,
    );

    return {
      status: "completed",
      ...data,
    };
  }
}
