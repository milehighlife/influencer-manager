import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { Worker } from "bullmq";

import { loadRuntimeConfig } from "../config/runtime-config";
import { getQueueConnection } from "../config/queue.config";
import { BulkOutreachProcessor } from "./processors/bulk-outreach.processor";
import { CampaignAggregationProcessor } from "./processors/campaign-aggregation.processor";
import { MessagingAutomationProcessor } from "./processors/messaging-automation.processor";
import { MetricSyncProcessor } from "./processors/metric-sync.processor";
import { PostRefreshProcessor } from "./processors/post-refresh.processor";
import {
  BULK_OUTREACH_QUEUE,
  CAMPAIGN_AGGREGATION_QUEUE,
  MESSAGING_AUTOMATION_QUEUE,
  METRIC_SYNC_QUEUE,
  POST_REFRESH_QUEUE,
} from "./queue.constants";
import type { BulkOutreachJobData } from "./interfaces/bulk-outreach-job.interface";
import type { CampaignAggregationJobData } from "./interfaces/campaign-aggregation-job.interface";
import type { MessagingAutomationJobData } from "./interfaces/messaging-automation-job.interface";
import type { MetricSyncJobData } from "./interfaces/metric-sync-job.interface";
import type { PostRefreshJobData } from "./interfaces/post-refresh-job.interface";

@Injectable()
export class WorkerRunnerService implements OnModuleInit, OnModuleDestroy {
  private metricSyncWorker?: Worker<MetricSyncJobData>;
  private postRefreshWorker?: Worker<PostRefreshJobData>;
  private campaignAggregationWorker?: Worker<CampaignAggregationJobData>;
  private bulkOutreachWorker?: Worker<BulkOutreachJobData>;
  private messagingAutomationWorker?: Worker<MessagingAutomationJobData>;

  constructor(
    private readonly metricSyncProcessor: MetricSyncProcessor,
    private readonly postRefreshProcessor: PostRefreshProcessor,
    private readonly campaignAggregationProcessor: CampaignAggregationProcessor,
    private readonly bulkOutreachProcessor: BulkOutreachProcessor,
    private readonly messagingAutomationProcessor: MessagingAutomationProcessor,
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

    this.bulkOutreachWorker = new Worker(
      BULK_OUTREACH_QUEUE,
      async (job) => this.bulkOutreachProcessor.process(job.data),
      { connection: getQueueConnection() },
    );

    this.messagingAutomationWorker = new Worker(
      MESSAGING_AUTOMATION_QUEUE,
      async (job) => this.messagingAutomationProcessor.process(job.data),
      { connection: getQueueConnection() },
    );
  }

  async onModuleDestroy() {
    await Promise.all([
      this.metricSyncWorker?.close(),
      this.postRefreshWorker?.close(),
      this.campaignAggregationWorker?.close(),
      this.bulkOutreachWorker?.close(),
      this.messagingAutomationWorker?.close(),
    ]);
  }
}
