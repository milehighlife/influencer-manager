import { Injectable, NotFoundException, OnModuleDestroy } from "@nestjs/common";
import { Queue } from "bullmq";

import { getQueueConnection } from "../config/queue.config";
import { PrismaService } from "../database/prisma.service";
import { ImportLogsService } from "../modules/import-logs/import-logs.service";
import {
  CAMPAIGN_AGGREGATION_JOB,
  CAMPAIGN_AGGREGATION_QUEUE,
  METRIC_SYNC_JOB,
  METRIC_SYNC_QUEUE,
  POST_REFRESH_JOB,
  POST_REFRESH_QUEUE,
} from "./queue.constants";
import type { CampaignAggregationJobData } from "./interfaces/campaign-aggregation-job.interface";
import type { MetricSyncJobData } from "./interfaces/metric-sync-job.interface";
import type { PostRefreshJobData } from "./interfaces/post-refresh-job.interface";

@Injectable()
export class QueueService implements OnModuleDestroy {
  private metricSyncQueue?: Queue<MetricSyncJobData>;
  private postRefreshQueue?: Queue<PostRefreshJobData>;
  private campaignAggregationQueue?: Queue<CampaignAggregationJobData>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly importLogsService: ImportLogsService,
  ) {}

  private createQueue<T>(name: string) {
    return new Queue<T>(name, {
      connection: getQueueConnection(),
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 100,
      },
    });
  }

  private getMetricSyncQueue() {
    this.metricSyncQueue ??= this.createQueue<MetricSyncJobData>(METRIC_SYNC_QUEUE);
    return this.metricSyncQueue;
  }

  private getPostRefreshQueue() {
    this.postRefreshQueue ??= this.createQueue<PostRefreshJobData>(POST_REFRESH_QUEUE);
    return this.postRefreshQueue;
  }

  private getCampaignAggregationQueue() {
    this.campaignAggregationQueue ??=
      this.createQueue<CampaignAggregationJobData>(CAMPAIGN_AGGREGATION_QUEUE);

    return this.campaignAggregationQueue;
  }

  async enqueueMetricSyncForPost(organizationId: string, postId: string) {
    const post = await this.prisma.post.findFirst({
      where: {
        id: postId,
        organization_id: organizationId,
      },
    });

    if (!post) {
      throw new NotFoundException("Post not found.");
    }

    const importLog = await this.importLogsService.create({
      organizationId,
      postId: post.id,
      platform: post.platform,
      rawMetadataJson: {
        queue: METRIC_SYNC_QUEUE,
        requested_by: "api",
      },
    });

    const job = await this.getMetricSyncQueue().add(METRIC_SYNC_JOB, {
      organizationId,
      postId,
      importLogId: importLog.id,
    });

    return {
      queue: METRIC_SYNC_QUEUE,
      jobId: String(job.id),
      importLogId: importLog.id,
    };
  }

  async enqueuePostRefresh(data: PostRefreshJobData) {
    const job = await this.getPostRefreshQueue().add(POST_REFRESH_JOB, data);

    return {
      queue: POST_REFRESH_QUEUE,
      jobId: String(job.id),
    };
  }

  async enqueueCampaignAggregation(data: CampaignAggregationJobData) {
    const job = await this.getCampaignAggregationQueue().add(
      CAMPAIGN_AGGREGATION_JOB,
      data,
    );

    return {
      queue: CAMPAIGN_AGGREGATION_QUEUE,
      jobId: String(job.id),
    };
  }

  async onModuleDestroy() {
    await Promise.all([
      this.metricSyncQueue?.close(),
      this.postRefreshQueue?.close(),
      this.campaignAggregationQueue?.close(),
    ]);
  }
}
