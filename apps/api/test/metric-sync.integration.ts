import { ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import { PrismaClient } from "@prisma/client";
import Redis from "ioredis";
import request from "supertest";

import { AppModule } from "../src/app.module";
import { getQueueConnection } from "../src/config/queue.config";
import { PrismaService } from "../src/database/prisma.service";
import { PlatformIntegrationService } from "../src/integrations/platform-integration.service";
import { AnalyticsAggregationService } from "../src/modules/reports/analytics-aggregation.service";

describe("metric_sync integration", () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let analyticsAggregationService: AnalyticsAggregationService;
  let platformIntegrationService: PlatformIntegrationService;
  let redis: Redis;

  const originalEnableWorkers = process.env.ENABLE_JOB_WORKERS;
  const originalRedisDb = process.env.REDIS_DB;
  const postId = "11111111-1111-1111-1111-111111112101";
  const organizationId = "11111111-1111-1111-1111-111111111111";
  const createdSnapshotIds: string[] = [];
  const createdImportLogIds: string[] = [];

  async function login() {
    return request(app.getHttpServer())
      .post("/api/auth/login")
      .send({
        email: "avery.chen@northstar.example",
        password: "AdminPass123!",
      })
      .expect(201);
  }

  beforeAll(async () => {
    process.env.ENABLE_JOB_WORKERS = "true";
    process.env.REDIS_DB = "15";

    prisma = new PrismaClient();
    redis = new Redis(getQueueConnection() as any);
    await redis.ping();
    await redis.flushdb();

    const seededPost = await prisma.post.findFirst({
      where: {
        id: postId,
        organization_id: organizationId,
      },
    });

    if (!seededPost) {
      throw new Error(
        `Seeded post ${postId} was not found. Run the database seed before test:integration.`,
      );
    }

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api");
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidUnknownValues: false,
      }),
    );

    await app.init();
    analyticsAggregationService = app.get(AnalyticsAggregationService);
    platformIntegrationService = app.get(PlatformIntegrationService);
    await app.get(PrismaService).$connect();
  });

  afterAll(async () => {
    for (const snapshotId of createdSnapshotIds) {
      await prisma.auditLog.deleteMany({
        where: {
          organization_id: organizationId,
          entity_type: "performance_snapshot",
          entity_id: snapshotId,
        },
      });
      await prisma.performanceSnapshot.delete({
        where: { id: snapshotId },
      });
    }
    if (createdSnapshotIds.length > 0) {
      await analyticsAggregationService.refreshForPost(organizationId, postId);
    }

    for (const importLogId of createdImportLogIds) {
      await prisma.importLog.delete({
        where: { id: importLogId },
      });
    }

    await redis.flushdb();
    await redis.quit();
    await prisma.$disconnect();
    await app.close();

    process.env.ENABLE_JOB_WORKERS = originalEnableWorkers;
    process.env.REDIS_DB = originalRedisDb;
  });

  it("enqueues metric sync work and writes a completed import log with a new snapshot", async () => {
    const beforeSnapshotCount = await prisma.performanceSnapshot.count({
      where: { post_id: postId },
    });
    const beforeLatestSnapshot = await prisma.performanceSnapshot.findFirst({
      where: { post_id: postId },
      orderBy: { captured_at: "desc" },
    });

    const loginResponse = await login();

    const enqueueResponse = await request(app.getHttpServer())
      .post(`/api/posts/${postId}/metric-sync`)
      .set("Authorization", `Bearer ${loginResponse.body.access_token}`)
      .expect(201);

    createdImportLogIds.push(enqueueResponse.body.importLogId);
    expect(enqueueResponse.body).toMatchObject({
      queue: "metric_sync",
      jobId: expect.any(String),
      importLogId: expect.any(String),
    });

    let latestImportLog = null as Awaited<
      ReturnType<typeof prisma.importLog.findUnique>
    > | null;
    let latestSnapshot = beforeLatestSnapshot;

    for (let attempt = 0; attempt < 20; attempt += 1) {
      latestImportLog = enqueueResponse.body.importLogId
        ? await prisma.importLog.findUnique({
            where: { id: enqueueResponse.body.importLogId },
          })
        : null;
      latestSnapshot = await prisma.performanceSnapshot.findFirst({
        where: { post_id: postId },
        orderBy: { captured_at: "desc" },
      });

      if (
        latestImportLog?.status === "completed" &&
        latestSnapshot &&
        latestSnapshot.id !== beforeLatestSnapshot?.id
      ) {
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, 250));
    }

    const afterSnapshotCount = await prisma.performanceSnapshot.count({
      where: { post_id: postId },
    });

    expect(afterSnapshotCount).toBe(beforeSnapshotCount + 1);
    expect(latestImportLog).toMatchObject({
      id: enqueueResponse.body.importLogId,
      organization_id: organizationId,
      post_id: postId,
      status: "completed",
      error_message: null,
    });
    expect(latestImportLog?.raw_metadata_json).toMatchObject({
      import_metadata: {
        adapter: "instagram",
        mode: "placeholder",
      },
      snapshot_id: expect.any(String),
      raw_response: {
        source: "instagram-placeholder",
        post_id: "ig_8392011",
      },
    });
    expect(latestSnapshot).toBeTruthy();
    expect(latestSnapshot?.id).not.toBe(beforeLatestSnapshot?.id);
    expect(latestSnapshot).toMatchObject({
      organization_id: organizationId,
      post_id: postId,
      impressions: expect.any(Number),
      reach: expect.any(Number),
      views: expect.any(Number),
      video_views: expect.any(Number),
      likes: expect.any(Number),
      comments: expect.any(Number),
      shares: expect.any(Number),
      saves: expect.any(Number),
      clicks: expect.any(Number),
      conversions: expect.any(Number),
    });

    if (latestSnapshot?.id) {
      createdSnapshotIds.push(latestSnapshot.id);
    }
  });

  it("marks the import log failed and leaves snapshots unchanged when the adapter throws", async () => {
    const beforeSnapshotCount = await prisma.performanceSnapshot.count({
      where: { post_id: postId },
    });
    const beforeLatestSnapshot = await prisma.performanceSnapshot.findFirst({
      where: { post_id: postId },
      orderBy: { captured_at: "desc" },
    });
    const loginResponse = await login();
    const fetchPostMetricsSpy = jest
      .spyOn(platformIntegrationService, "fetchPostMetrics")
      .mockRejectedValueOnce(new Error("Forced adapter failure."));

    const enqueueResponse = await request(app.getHttpServer())
      .post(`/api/posts/${postId}/metric-sync`)
      .set("Authorization", `Bearer ${loginResponse.body.access_token}`)
      .expect(201);

    createdImportLogIds.push(enqueueResponse.body.importLogId);

    let latestImportLog = null as Awaited<
      ReturnType<typeof prisma.importLog.findUnique>
    > | null;

    for (let attempt = 0; attempt < 20; attempt += 1) {
      latestImportLog = await prisma.importLog.findUnique({
        where: { id: enqueueResponse.body.importLogId },
      });

      if (latestImportLog?.status === "failed") {
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, 250));
    }

    fetchPostMetricsSpy.mockRestore();

    const afterSnapshotCount = await prisma.performanceSnapshot.count({
      where: { post_id: postId },
    });
    const afterLatestSnapshot = await prisma.performanceSnapshot.findFirst({
      where: { post_id: postId },
      orderBy: { captured_at: "desc" },
    });

    expect(afterSnapshotCount).toBe(beforeSnapshotCount);
    expect(afterLatestSnapshot?.id).toBe(beforeLatestSnapshot?.id);
    expect(latestImportLog).toMatchObject({
      id: enqueueResponse.body.importLogId,
      organization_id: organizationId,
      post_id: postId,
      status: "failed",
      error_message: "Forced adapter failure.",
    });
    expect(latestImportLog?.raw_metadata_json).toMatchObject({
      post_id: postId,
    });
  });
});
