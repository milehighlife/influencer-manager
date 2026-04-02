import { describe, expect, it, jest, beforeEach } from "@jest/globals";

const addMock = jest.fn<() => Promise<{ id: string }>>();
const closeMock = jest.fn<() => Promise<void>>();
const queueConstructorMock = jest.fn();

jest.mock("bullmq", () => ({
  Queue: class MockQueue {
    add = addMock;
    close = closeMock;

    constructor(name: string, options: unknown) {
      queueConstructorMock(name, options);
    }
  },
}));

import { QueueService } from "../src/jobs/queue.service";
import {
  CAMPAIGN_AGGREGATION_JOB,
  CAMPAIGN_AGGREGATION_QUEUE,
  METRIC_SYNC_JOB,
  METRIC_SYNC_QUEUE,
  POST_REFRESH_JOB,
  POST_REFRESH_QUEUE,
} from "../src/jobs/queue.constants";

describe("QueueService", () => {
  beforeEach(() => {
    addMock.mockReset();
    closeMock.mockReset();
    queueConstructorMock.mockReset();
    addMock.mockResolvedValue({ id: "job-1" });
    closeMock.mockResolvedValue();
  });

  it("does not create BullMQ queues during service construction", async () => {
    const service = new QueueService(
      {} as never,
      {} as never,
    );

    expect(service).toBeInstanceOf(QueueService);
    expect(queueConstructorMock).not.toHaveBeenCalled();

    await expect(service.onModuleDestroy()).resolves.toBeUndefined();
    expect(closeMock).not.toHaveBeenCalled();
  });

  it("creates the metric sync queue lazily when enqueueing work", async () => {
    const prisma = {
      post: {
        findFirst: jest.fn<() => Promise<unknown>>().mockResolvedValue({
          id: "post-1",
          platform: "instagram",
        }),
      },
    };
    const importLogsService = {
      create: jest.fn<() => Promise<unknown>>().mockResolvedValue({
        id: "import-log-1",
      }),
    };
    const service = new QueueService(
      prisma as never,
      importLogsService as never,
    );

    const result = await service.enqueueMetricSyncForPost("org-1", "post-1");

    expect(prisma.post.findFirst).toHaveBeenCalledWith({
      where: {
        id: "post-1",
        organization_id: "org-1",
      },
    });
    expect(importLogsService.create).toHaveBeenCalledWith({
      organizationId: "org-1",
      postId: "post-1",
      platform: "instagram",
      rawMetadataJson: {
        queue: METRIC_SYNC_QUEUE,
        requested_by: "api",
      },
    });
    expect(queueConstructorMock).toHaveBeenCalledTimes(1);
    expect(queueConstructorMock).toHaveBeenCalledWith(
      METRIC_SYNC_QUEUE,
      expect.objectContaining({
        connection: expect.any(Object),
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 100,
        },
      }),
    );
    expect(addMock).toHaveBeenCalledWith(METRIC_SYNC_JOB, {
      organizationId: "org-1",
      postId: "post-1",
      importLogId: "import-log-1",
    });
    expect(result).toEqual({
      queue: METRIC_SYNC_QUEUE,
      jobId: "job-1",
      importLogId: "import-log-1",
    });
  });

  it("reuses queue instances across enqueue calls", async () => {
    const service = new QueueService(
      {} as never,
      {} as never,
    );

    await service.enqueuePostRefresh({
      organizationId: "org-1",
      postId: "post-1",
    });
    await service.enqueuePostRefresh({
      organizationId: "org-1",
      postId: "post-2",
    });
    await service.enqueueCampaignAggregation({
      organizationId: "org-1",
      campaignId: "campaign-1",
    });

    expect(queueConstructorMock).toHaveBeenCalledTimes(2);
    expect(addMock).toHaveBeenNthCalledWith(1, POST_REFRESH_JOB, {
      organizationId: "org-1",
      postId: "post-1",
    });
    expect(addMock).toHaveBeenNthCalledWith(2, POST_REFRESH_JOB, {
      organizationId: "org-1",
      postId: "post-2",
    });
    expect(addMock).toHaveBeenNthCalledWith(3, CAMPAIGN_AGGREGATION_JOB, {
      organizationId: "org-1",
      campaignId: "campaign-1",
    });

    await service.onModuleDestroy();

    expect(closeMock).toHaveBeenCalledTimes(2);
    expect(queueConstructorMock).toHaveBeenNthCalledWith(
      1,
      POST_REFRESH_QUEUE,
      expect.any(Object),
    );
    expect(queueConstructorMock).toHaveBeenNthCalledWith(
      2,
      CAMPAIGN_AGGREGATION_QUEUE,
      expect.any(Object),
    );
  });
});
