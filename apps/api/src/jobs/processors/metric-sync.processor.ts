import { Injectable, NotFoundException } from "@nestjs/common";

import { PlatformIntegrationService } from "../../integrations/platform-integration.service";
import { ImportLogsService } from "../../modules/import-logs/import-logs.service";
import { PerformanceSnapshotsService } from "../../modules/performance-snapshots/performance-snapshots.service";
import { PrismaService } from "../../database/prisma.service";
import type { MetricSyncJobData } from "../interfaces/metric-sync-job.interface";

@Injectable()
export class MetricSyncProcessor {
  constructor(
    private readonly prisma: PrismaService,
    private readonly platformIntegrationService: PlatformIntegrationService,
    private readonly performanceSnapshotsService: PerformanceSnapshotsService,
    private readonly importLogsService: ImportLogsService,
  ) {}

  async process(data: MetricSyncJobData) {
    await this.importLogsService.markRunning(data.importLogId, {
      phase: "fetching_metrics",
      post_id: data.postId,
    });

    try {
      const post = await this.prisma.post.findFirst({
        where: {
          id: data.postId,
          organization_id: data.organizationId,
        },
      });

      if (!post) {
        throw new NotFoundException("Post not found for metric sync.");
      }

      const result = await this.platformIntegrationService.fetchPostMetrics({
        organizationId: data.organizationId,
        postId: post.id,
        platform: post.platform,
        externalPostId: post.external_post_id,
        postUrl: post.post_url,
      });

      const snapshot = await this.performanceSnapshotsService.create(
        data.organizationId,
        {
          post_id: post.id,
          captured_at: result.normalizedMetrics.capturedAt,
          impressions: result.normalizedMetrics.impressions,
          reach: result.normalizedMetrics.reach,
          views: result.normalizedMetrics.views,
          video_views: result.normalizedMetrics.videoViews,
          likes: result.normalizedMetrics.likes,
          comments: result.normalizedMetrics.comments,
          shares: result.normalizedMetrics.shares,
          saves: result.normalizedMetrics.saves,
          clicks: result.normalizedMetrics.clicks,
          conversions: result.normalizedMetrics.conversions,
        },
      );

      await this.importLogsService.markCompleted(data.importLogId, {
        import_metadata: result.importMetadata,
        raw_response: result.rawResponse,
        snapshot_id: snapshot.id,
      });

      return {
        snapshotId: snapshot.id,
        importLogId: data.importLogId,
      };
    } catch (error) {
      await this.importLogsService.markFailed(
        data.importLogId,
        error instanceof Error ? error.message : "Metric sync failed.",
        {
          post_id: data.postId,
        },
      );

      throw error;
    }
  }
}
