import { ValidationPipe } from "@nestjs/common";
import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import request from "supertest";

jest.mock("../src/common/utils/password.util", () => ({
  verifyPassword: jest.fn(),
}));

import { AppModule } from "../src/app.module";
import { verifyPassword } from "../src/common/utils/password.util";
import { PrismaService } from "../src/database/prisma.service";
import { QueueService } from "../src/jobs/queue.service";
import { ReportsService } from "../src/modules/reports/reports.service";

describe("Generic read auth boundaries (e2e)", () => {
  let app: INestApplication;

  const org1 = "11111111-1111-1111-1111-111111111111";
  const org2 = "22222222-2222-2222-2222-222222222222";
  const campaignId = "33333333-3333-3333-3333-333333333333";

  const users = [
    {
      id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      email: "admin@northstar.example",
      full_name: "Org Admin",
      organization_id: org1,
      influencer_id: null,
      role: "organization_admin",
      status: "active",
      password_hash: "hash",
      created_at: new Date("2026-03-01T00:00:00.000Z"),
      updated_at: new Date("2026-03-01T00:00:00.000Z"),
    },
    {
      id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
      email: "manager@northstar.example",
      full_name: "Campaign Manager",
      organization_id: org1,
      influencer_id: null,
      role: "campaign_manager",
      status: "active",
      password_hash: "hash",
      created_at: new Date("2026-03-01T00:00:00.000Z"),
      updated_at: new Date("2026-03-01T00:00:00.000Z"),
    },
    {
      id: "cccccccc-cccc-cccc-cccc-cccccccccccc",
      email: "editor@northstar.example",
      full_name: "Campaign Editor",
      organization_id: org1,
      influencer_id: null,
      role: "campaign_editor",
      status: "active",
      password_hash: "hash",
      created_at: new Date("2026-03-01T00:00:00.000Z"),
      updated_at: new Date("2026-03-01T00:00:00.000Z"),
    },
    {
      id: "dddddddd-dddd-dddd-dddd-dddddddddddd",
      email: "analyst@northstar.example",
      full_name: "Analyst",
      organization_id: org1,
      influencer_id: null,
      role: "analyst",
      status: "active",
      password_hash: "hash",
      created_at: new Date("2026-03-01T00:00:00.000Z"),
      updated_at: new Date("2026-03-01T00:00:00.000Z"),
    },
    {
      id: "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
      email: "viewer@northstar.example",
      full_name: "Viewer",
      organization_id: org1,
      influencer_id: null,
      role: "viewer",
      status: "active",
      password_hash: "hash",
      created_at: new Date("2026-03-01T00:00:00.000Z"),
      updated_at: new Date("2026-03-01T00:00:00.000Z"),
    },
    {
      id: "ffffffff-ffff-ffff-ffff-ffffffffffff",
      email: "creator@northstar.example",
      full_name: "Creator",
      organization_id: org1,
      influencer_id: "99999999-9999-9999-9999-999999999999",
      role: "influencer",
      status: "active",
      password_hash: "hash",
      created_at: new Date("2026-03-01T00:00:00.000Z"),
      updated_at: new Date("2026-03-01T00:00:00.000Z"),
    },
    {
      id: "12121212-1212-1212-1212-121212121212",
      email: "other-admin@other.example",
      full_name: "Other Org Admin",
      organization_id: org2,
      influencer_id: null,
      role: "organization_admin",
      status: "active",
      password_hash: "hash",
      created_at: new Date("2026-03-02T00:00:00.000Z"),
      updated_at: new Date("2026-03-02T00:00:00.000Z"),
    },
  ];

  const campaignsByOrg: Record<string, Array<Record<string, unknown>>> = {
    [org1]: [
      {
        id: campaignId,
        organization_id: org1,
        company_id: "44444444-4444-4444-4444-444444444444",
        name: "Spring Launch",
        status: "planned",
        campaign_type: "product_launch",
        description: null,
        start_date: new Date("2026-03-01T00:00:00.000Z"),
        end_date: new Date("2026-03-31T00:00:00.000Z"),
        budget: null,
        created_at: new Date("2026-02-20T00:00:00.000Z"),
        updated_at: new Date("2026-02-21T00:00:00.000Z"),
      },
    ],
    [org2]: [
      {
        id: "55555555-5555-5555-5555-555555555555",
        organization_id: org2,
        company_id: "66666666-6666-6666-6666-666666666666",
        name: "Other Org Campaign",
        status: "active",
        campaign_type: "always_on",
        description: null,
        start_date: new Date("2026-04-01T00:00:00.000Z"),
        end_date: new Date("2026-04-30T00:00:00.000Z"),
        budget: null,
        created_at: new Date("2026-03-01T00:00:00.000Z"),
        updated_at: new Date("2026-03-02T00:00:00.000Z"),
      },
    ],
  };

  const reportsService = {
    getPostSummary: jest.fn(),
    getActionSummary: jest.fn(),
    getMissionSummary: jest.fn(),
    getCampaignSummary: jest.fn(),
    getInfluencerSummary: jest.fn(),
    refreshCampaignSummary: jest.fn(),
  };

  const prisma: any = {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    campaign: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(),
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  };

  const loginAs = async (email: string) => {
    const response = await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({
        email,
        password: "Password123!",
      })
      .expect(201);

    return {
      Authorization: `Bearer ${response.body.access_token}`,
    };
  };

  beforeAll(async () => {
    (verifyPassword as jest.MockedFunction<typeof verifyPassword>).mockResolvedValue(
      true,
    );

    prisma.user.findUnique.mockImplementation(async ({ where }: any) => {
      return users.find((user) => user.email === where.email) ?? null;
    });

    prisma.user.findFirst.mockImplementation(async ({ where }: any) => {
      return (
        users.find(
          (user) =>
            user.id === where.id &&
            user.organization_id === where.organization_id &&
            user.status === where.status,
        ) ?? null
      );
    });

    prisma.user.findMany.mockImplementation(async ({ where }: any) => {
      return users.filter(
        (user) =>
          user.organization_id === where.organization_id &&
          (!where.role || user.role === where.role) &&
          (!where.status || user.status === where.status),
      );
    });

    prisma.user.count.mockImplementation(async ({ where }: any) => {
      return users.filter(
        (user) =>
          user.organization_id === where.organization_id &&
          (!where.role || user.role === where.role) &&
          (!where.status || user.status === where.status),
      ).length;
    });

    prisma.campaign.findMany.mockImplementation(async ({ where }: any) => {
      const campaigns = campaignsByOrg[where.organization_id] ?? [];
      return campaigns.filter((campaign) => !where.status || campaign.status === where.status);
    });

    prisma.campaign.count.mockImplementation(async ({ where }: any) => {
      const campaigns = campaignsByOrg[where.organization_id] ?? [];
      return campaigns.filter((campaign) => !where.status || campaign.status === where.status)
        .length;
    });

    prisma.$transaction.mockImplementation(async (input: unknown) => {
      if (Array.isArray(input)) {
        return Promise.all(input);
      }

      if (typeof input === "function") {
        return input(prisma);
      }

      return input;
    });

    reportsService.getCampaignSummary.mockImplementation(
      async (...args: unknown[]) => {
        const [organizationId, id, filters] = args as [
          string,
          string,
          Record<string, unknown>,
        ];

        return {
        scope: {
          type: "campaign",
          id,
        },
        total_impressions: organizationId === org1 ? 1000 : 2000,
        total_engagement: organizationId === org1 ? 100 : 200,
        engagement_rate: 10,
        total_posts: 2,
        total_influencers: 1,
        last_snapshot_at: "2026-03-12T16:30:00.000Z",
        filters_applied: filters,
        };
      },
    );

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .overrideProvider(ReportsService)
      .useValue(reportsService)
      .overrideProvider(QueueService)
      .useValue({
        enqueueMetricSyncForPost: jest.fn(),
        enqueuePostRefresh: jest.fn(),
        enqueueCampaignAggregation: jest.fn(),
      })
      .compile();

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
  });

  beforeEach(() => {
    prisma.campaign.findMany.mockClear();
    prisma.campaign.count.mockClear();
    prisma.user.findMany.mockClear();
    prisma.user.count.mockClear();
    reportsService.getCampaignSummary.mockClear();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it.each([
    "admin@northstar.example",
    "manager@northstar.example",
    "editor@northstar.example",
    "analyst@northstar.example",
    "viewer@northstar.example",
  ])("allows internal role %s to access GET /api/campaigns", async (email) => {
    const authHeader = await loginAs(email);

    const response = await request(app.getHttpServer())
      .get("/api/campaigns?status=planned&page=1&limit=10")
      .set(authHeader)
      .expect(200);

    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0]).toMatchObject({
      id: campaignId,
      organization_id: org1,
      status: "planned",
    });
    expect(
      response.body.data.find((campaign: any) => campaign.organization_id === org2),
    ).toBeUndefined();
  });

  it("denies influencer access to GET /api/campaigns", async () => {
    const authHeader = await loginAs("creator@northstar.example");

    await request(app.getHttpServer())
      .get("/api/campaigns?status=planned")
      .set(authHeader)
      .expect(403);
  });

  it("denies unauthenticated access to GET /api/campaigns", async () => {
    await request(app.getHttpServer()).get("/api/campaigns").expect(401);
  });

  it("allows only organization_admin to access GET /api/users", async () => {
    const authHeader = await loginAs("admin@northstar.example");

    const response = await request(app.getHttpServer())
      .get("/api/users?role=campaign_manager&status=active&page=1&limit=10")
      .set(authHeader)
      .expect(200);

    expect(response.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          email: "manager@northstar.example",
          organization_id: org1,
        }),
      ]),
    );
    expect(
      response.body.data.find((user: any) => user.organization_id === org2),
    ).toBeUndefined();
  });

  it.each([
    "manager@northstar.example",
    "editor@northstar.example",
    "analyst@northstar.example",
    "viewer@northstar.example",
    "creator@northstar.example",
  ])("denies non-admin role %s from GET /api/users", async (email) => {
    const authHeader = await loginAs(email);

    await request(app.getHttpServer())
      .get("/api/users?page=1&limit=10")
      .set(authHeader)
      .expect(403);
  });

  it("denies unauthenticated access to GET /api/users", async () => {
    await request(app.getHttpServer()).get("/api/users").expect(401);
  });

  it.each([
    "admin@northstar.example",
    "manager@northstar.example",
    "editor@northstar.example",
    "analyst@northstar.example",
    "viewer@northstar.example",
  ])("allows internal role %s to access report summaries", async (email) => {
    const authHeader = await loginAs(email);

    const response = await request(app.getHttpServer())
      .get(
        `/api/reports/campaigns/${campaignId}/summary?date_from=2026-03-01&date_to=2026-03-31&platform=instagram`,
      )
      .set(authHeader)
      .expect(200);

    expect(reportsService.getCampaignSummary).toHaveBeenCalledWith(
      org1,
      campaignId,
      expect.objectContaining({
        date_from: "2026-03-01",
        date_to: "2026-03-31",
        platform: "instagram",
      }),
    );
    expect(response.body.scope).toEqual({
      type: "campaign",
      id: campaignId,
    });
  });

  it("denies influencer access to report summaries", async () => {
    const authHeader = await loginAs("creator@northstar.example");

    await request(app.getHttpServer())
      .get(`/api/reports/campaigns/${campaignId}/summary?platform=instagram`)
      .set(authHeader)
      .expect(403);
  });

  it("denies unauthenticated access to report summaries", async () => {
    await request(app.getHttpServer())
      .get(`/api/reports/campaigns/${campaignId}/summary`)
      .expect(401);
  });
});
