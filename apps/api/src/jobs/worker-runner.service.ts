import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { Worker } from "bullmq";

import { loadRuntimeConfig } from "../config/runtime-config";
import { getQueueConnection } from "../config/queue.config";
import { CampaignAggregationProcessor } from "./processors/campaign-aggregation.processor";
import { MetricSyncProcessor } from "./processors/metric-sync.processor";
import { PostRefreshProcessor } from "./processors/post-refresh.processor";
import {
  CAMPAIGN_AGGREGATION_QUEUE,
  METRIC_SYNC_QUEUE,
  POST_REFRESH_QUEUE,
} from "./queue.constants";
import type { CampaignAggregationJobData } from "./interfaces/campaign-aggregation-job.interface";
import type { MetricSyncJobData } from "./interfaces/metric-sync-job.interface";
import type { PostRefreshJobData } from "./interfaces/post-refresh-job.interface";

@Injectable()
export class WorkerRunnerService implements OnModuleInit, OnModuleDestroy {
  private metricSyncWorker?: Worker<MetricSyncJobData>;
  private postRefreshWorker?: Worker<PostRefreshJobData>;
  private campaignAggregationWorker?: Worker<CampaignAggregationJobData>;

  constructor(
    private readonly metricSyncProcessor: MetricSyncProcessor,
    private readonly postRefreshProcessor: PostRefreshProcessor,
    private readonly campaignAggregationProcessor: CampaignAggregationProcessor,
  ) {}

  async onModuleInit() {
    if (!loadRuntimeConfig().enableJobWorkers) {
      return;
    }

    // Workers are opt-in so the API process does not require Redis unless explicitly enabled.
    this.metricSyncWorker = new Worker(
      METRIC_SYNC_QUEUE,
      async (job) => this.metricSyncProcessor.process(job.data),
      { connection: getQueueConnection() },
    );

    this.postRefreshWorker = new Worker(
      POST_REFRESH_QUEUE,
      async (job) => this.postRefreshProcessor.process(job.data),
      { connection: getQueueConnection() },
    );

    this.campaignAggregationWorker = new Worker(
      CAMPAIGN_AGGREGATION_QUEUE,
      async (job) => this.campaignAggregationProcessor.process(job.data),
      { connection: getQueueConnection() },
    );
  }

  async onModuleDestroy() {
    await Promise.all([
      this.metricSyncWorker?.close(),
      this.postRefreshWorker?.close(),
      this.campaignAggregationWorker?.close(),
    ]);
  }
}
