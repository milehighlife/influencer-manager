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

describe("Campaign planner-list auth boundaries (e2e)", () => {
  let app: INestApplication;

  const org1 = "11111111-1111-1111-1111-111111111111";
  const org2 = "22222222-2222-2222-2222-222222222222";
  const clientId = "33333333-3333-3333-3333-333333333333";
  const companyId = "44444444-4444-4444-4444-444444444444";
  const otherClientId = "55555555-5555-5555-5555-555555555555";
  const otherCompanyId = "66666666-6666-6666-6666-666666666666";
  const campaignId = "77777777-7777-7777-7777-777777777777";
  const otherCampaignId = "88888888-8888-8888-8888-888888888888";

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
    },
  ] as const;

  const campaignsByOrg = {
    [org1]: [
      {
        id: campaignId,
        organization_id: org1,
        company_id: companyId,
        name: "Spring Launch",
        status: "planned",
        start_date: new Date("2026-03-01T00:00:00.000Z"),
        end_date: new Date("2026-03-31T00:00:00.000Z"),
        created_at: new Date("2026-02-20T00:00:00.000Z"),
        updated_at: new Date("2026-02-21T00:00:00.000Z"),
        company: {
          id: companyId,
          name: "Glow Labs",
          client_id: clientId,
          client: {
            id: clientId,
            name: "Northstar Retail",
          },
        },
      },
    ],
    [org2]: [
      {
        id: otherCampaignId,
        organization_id: org2,
        company_id: otherCompanyId,
        name: "Spring Launch",
        status: "planned",
        start_date: new Date("2026-04-01T00:00:00.000Z"),
        end_date: new Date("2026-04-30T00:00:00.000Z"),
        created_at: new Date("2026-03-01T00:00:00.000Z"),
        updated_at: new Date("2026-03-02T00:00:00.000Z"),
        company: {
          id: otherCompanyId,
          name: "Peak Labs",
          client_id: otherClientId,
          client: {
            id: otherClientId,
            name: "Summit Retail",
          },
        },
      },
    ],
  } as const;

  const missionsByCampaign: Record<
    string,
    Array<{
      campaign_id: string;
      start_date: Date | null;
      end_date: Date | null;
    }>
  > = {
    [campaignId]: [
      {
        campaign_id: campaignId,
        start_date: new Date("2026-03-01T00:00:00.000Z"),
        end_date: new Date("2026-03-10T00:00:00.000Z"),
      },
    ],
    [otherCampaignId]: [
      {
        campaign_id: otherCampaignId,
        start_date: new Date("2026-04-01T00:00:00.000Z"),
        end_date: new Date("2026-04-10T00:00:00.000Z"),
      },
    ],
  };

  const prisma: any = {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    campaign: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    mission: {
      findMany: jest.fn(),
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

    prisma.campaign.findMany.mockImplementation(async ({ where }: any) => {
      return campaignsByOrg[where.organization_id as keyof typeof campaignsByOrg] ?? [];
    });

    prisma.campaign.count.mockImplementation(async ({ where }: any) => {
      return (
        campaignsByOrg[where.organization_id as keyof typeof campaignsByOrg]?.length ?? 0
      );
    });

    prisma.mission.findMany.mockImplementation(async ({ where }: any) => {
      const campaignIds = where.campaign_id.in as string[];
      return campaignIds.flatMap((campaignId) => missionsByCampaign[campaignId] ?? []);
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

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
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
    prisma.mission.findMany.mockClear();
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
  ])("allows planner-safe role %s to access planner-list", async (email) => {
    const authHeader = await loginAs(email);

    const response = await request(app.getHttpServer())
      .get("/api/campaigns/planner-list")
      .set(authHeader)
      .expect(200);

    expect(response.body).toMatchObject({
      data: [
        {
          id: campaignId,
          name: "Spring Launch",
          status: "planned",
          company: {
            id: companyId,
            name: "Glow Labs",
            client_id: clientId,
            client_name: "Northstar Retail",
          },
          mission_count: 1,
          scheduled_mission_count: 1,
          partial_mission_count: 0,
          unscheduled_mission_count: 0,
        },
      ],
      meta: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      },
    });
    expect(response.body.data[0]).not.toHaveProperty("missions");
  });

  it("denies unauthenticated planner-list access", async () => {
    await request(app.getHttpServer())
      .get("/api/campaigns/planner-list")
      .expect(401);
  });

  it("denies influencer access to planner-list even with query params", async () => {
    const authHeader = await loginAs("creator@northstar.example");

    const response = await request(app.getHttpServer())
      .get(
        "/api/campaigns/planner-list?search=spring&status=planned&schedule_state=scheduled&page=1&limit=10&sort_by=name&sort_direction=asc",
      )
      .set(authHeader)
      .expect(403);

    expect(response.body.message).toBe(
      "You do not have permission to access this resource.",
    );
  });

  it("keeps planner-list tenant-scoped when query params are present", async () => {
    const authHeader = await loginAs("admin@northstar.example");

    const response = await request(app.getHttpServer())
      .get(
        `/api/campaigns/planner-list?search=Spring&status=planned&company_id=${companyId}&client_id=${clientId}&schedule_state=scheduled&page=1&limit=10&sort_by=name&sort_direction=asc`,
      )
      .set(authHeader)
      .expect(200);

    expect(prisma.campaign.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organization_id: org1,
        }),
      }),
    );
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].id).toBe(campaignId);
    expect(response.body.data.find((campaign: any) => campaign.id === otherCampaignId)).toBeUndefined();
  });
});
