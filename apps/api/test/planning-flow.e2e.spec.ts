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
import request from "supertest";

jest.mock("../src/common/utils/password.util", () => ({
  verifyPassword: jest.fn(),
}));

import { AppModule } from "../src/app.module";
import { verifyPassword } from "../src/common/utils/password.util";
import { QueueService } from "../src/jobs/queue.service";
import { PrismaService } from "../src/database/prisma.service";

describe("Planning flow (e2e)", () => {
  let app: INestApplication;

  const organizationId = "11111111-1111-1111-1111-111111111111";
  const userId = "22222222-2222-2222-2222-222222222222";
  const campaignId = "33333333-3333-3333-3333-333333333333";
  const missionId = "44444444-4444-4444-4444-444444444444";
  const actionId = "55555555-5555-5555-5555-555555555555";
  const assignmentId = "66666666-6666-6666-6666-666666666666";
  const companyId = "77777777-7777-7777-7777-777777777777";
  const clientId = "88888888-8888-8888-8888-888888888888";
  const influencerId = "99999999-9999-9999-9999-999999999999";

  const campaignDate = new Date("2026-03-01T00:00:00.000Z");
  const planningMissionDate = new Date("2026-03-05T00:00:00.000Z");
  const actionStartWindow = new Date("2026-03-08T15:00:00.000Z");
  const assignedAt = new Date("2026-03-09T10:00:00.000Z");
  const dueDate = new Date("2026-03-16T18:00:00.000Z");
  const summarySnapshotAt = new Date("2026-03-12T16:30:00.000Z");

  const prisma: any = {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    campaign: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
    },
    mission: {
      findFirst: jest.fn(),
    },
    action: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    actionAssignment: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    campaignPerformanceSummary: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  };

  beforeAll(async () => {
    const activeUser = {
      id: userId,
      email: "avery.chen@northstar.example",
      full_name: "Avery Chen",
      organization_id: organizationId,
      role: "organization_admin",
      status: "active",
      password_hash: "mock-password-hash",
      created_at: new Date("2026-03-01T12:00:00.000Z"),
      updated_at: new Date("2026-03-01T12:00:00.000Z"),
    };

    (verifyPassword as jest.MockedFunction<typeof verifyPassword>).mockResolvedValue(
      true,
    );

    const campaign = {
      id: campaignId,
      organization_id: organizationId,
      company_id: companyId,
      name: "Arachnid Creator Launch",
      description: "Launch campaign for the Arachnid release.",
      start_date: campaignDate,
      end_date: new Date("2026-04-01T00:00:00.000Z"),
      budget: 25000,
      status: "active",
      campaign_type: "product_launch",
      created_at: campaignDate,
      updated_at: campaignDate,
    };

    const planningView = {
      ...campaign,
      company: {
        id: companyId,
        client_id: clientId,
        name: "Innova Discs",
        description: "Flagship disc golf brand.",
        status: "active",
        created_at: campaignDate,
        updated_at: campaignDate,
      },
      missions: [
        {
          id: missionId,
          organization_id: organizationId,
          campaign_id: campaignId,
          name: "Creator Seeding",
          description: "Send the new mold to launch creators.",
          sequence_order: 1,
          start_date: planningMissionDate,
          end_date: new Date("2026-03-20T00:00:00.000Z"),
          status: "active",
          created_at: planningMissionDate,
          updated_at: planningMissionDate,
          actions: [
            {
              id: actionId,
              organization_id: organizationId,
              mission_id: missionId,
              platform: "instagram",
              title: "Arachnid first-throw reel",
              instructions: "Post a first-throw reaction reel.",
              content_format: "reel",
              required_deliverables: 1,
              approval_required: true,
              start_window: actionStartWindow,
              end_window: new Date("2026-03-14T20:00:00.000Z"),
              status: "active",
              created_at: actionStartWindow,
              updated_at: actionStartWindow,
              action_assignments: [
                {
                  id: assignmentId,
                  organization_id: organizationId,
                  action_id: actionId,
                  influencer_id: influencerId,
                  assignment_status: "approved",
                  assigned_at: assignedAt,
                  due_date: dueDate,
                  completion_date: null,
                  deliverable_count_expected: 1,
                  deliverable_count_submitted: 1,
                  created_at: assignedAt,
                  updated_at: assignedAt,
                  influencer: {
                    id: influencerId,
                    name: "Nova Blake",
                    email: "nova@example.com",
                    primary_platform: "instagram",
                    location: "Austin, TX",
                    status: "active",
                  },
                },
              ],
            },
          ],
        },
      ],
    };

    prisma.user.findUnique.mockImplementation(async ({ where }: any) => {
      return where.email === activeUser.email ? activeUser : null;
    });

    prisma.user.findFirst.mockImplementation(
      async ({ where }: any) => {
      return where.id === activeUser.id &&
        where.organization_id === organizationId &&
        where.status === "active"
        ? activeUser
        : null;
      },
    );

    prisma.campaign.findMany.mockResolvedValue([campaign]);
    prisma.campaign.count.mockResolvedValue(1);
    prisma.campaign.findFirst.mockImplementation(
      async ({ where, include }: any) => {
        if (where.id !== campaignId || where.organization_id !== organizationId) {
          return null;
        }

        if (include) {
          return planningView;
        }

        return campaign;
      },
    );

    prisma.mission.findFirst.mockImplementation(async ({ where }: any) => {
      if (where.id !== missionId || where.organization_id !== organizationId) {
        return null;
      }

      return {
        id: missionId,
        organization_id: organizationId,
        campaign_id: campaignId,
        name: "Creator Seeding",
        description: "Send the new mold to launch creators.",
        sequence_order: 1,
        start_date: planningMissionDate,
        end_date: new Date("2026-03-20T00:00:00.000Z"),
        status: "active",
        created_at: planningMissionDate,
        updated_at: planningMissionDate,
      };
    });

    prisma.action.findFirst.mockImplementation(
      async ({ where, include }: any) => {
        if (where.id !== actionId || where.organization_id !== organizationId) {
          return null;
        }

        return {
          id: actionId,
          organization_id: organizationId,
          mission_id: missionId,
          platform: "instagram",
          title: "Arachnid first-throw reel",
          instructions: "Post a first-throw reaction reel.",
          content_format: "reel",
          required_deliverables: 1,
          approval_required: true,
          start_window: actionStartWindow,
          end_window: new Date("2026-03-14T20:00:00.000Z"),
          status: "active",
          created_at: actionStartWindow,
          updated_at: actionStartWindow,
          ...(include
            ? {
                mission: {
                  id: missionId,
                  campaign_id: campaignId,
                  name: "Creator Seeding",
                  sequence_order: 1,
                  status: "active",
                },
              }
            : {}),
        };
      },
    );

    prisma.action.findMany.mockImplementation(async ({ where }: any) => {
      if (where.organization_id !== organizationId || where.mission_id !== missionId) {
        return [];
      }

      return [
        {
          id: actionId,
          organization_id: organizationId,
          mission_id: missionId,
          platform: "instagram",
          title: "Arachnid first-throw reel",
          instructions: "Post a first-throw reaction reel.",
          content_format: "reel",
          required_deliverables: 1,
          approval_required: true,
          start_window: actionStartWindow,
          end_window: new Date("2026-03-14T20:00:00.000Z"),
          status: "active",
          created_at: actionStartWindow,
          updated_at: actionStartWindow,
          _count: {
            action_assignments: 1,
          },
        },
      ];
    });

    prisma.actionAssignment.findFirst.mockImplementation(
      async ({ where }: any) => {
        if (where.id !== assignmentId || where.organization_id !== organizationId) {
          return null;
        }

        return {
          id: assignmentId,
          organization_id: organizationId,
          action_id: actionId,
          influencer_id: influencerId,
          assignment_status: "approved",
          assigned_at: assignedAt,
          due_date: dueDate,
          completion_date: null,
          deliverable_count_expected: 1,
          deliverable_count_submitted: 1,
          created_at: assignedAt,
          updated_at: assignedAt,
        };
      },
    );

    prisma.actionAssignment.findMany.mockImplementation(
      async ({ where }: any) => {
        if (
          where.organization_id !== organizationId ||
          where.action_id !== actionId
        ) {
          return [];
        }

        return [
          {
            id: assignmentId,
            organization_id: organizationId,
            action_id: actionId,
            influencer_id: influencerId,
            assignment_status: "approved",
            assigned_at: assignedAt,
            due_date: dueDate,
            completion_date: null,
            deliverable_count_expected: 1,
            deliverable_count_submitted: 1,
            created_at: assignedAt,
            updated_at: assignedAt,
            influencer: {
              id: influencerId,
              name: "Nova Blake",
              email: "nova@example.com",
              primary_platform: "instagram",
              location: "Austin, TX",
              status: "active",
            },
          },
        ];
      },
    );

    prisma.campaignPerformanceSummary.findUnique.mockResolvedValue({
      id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      organization_id: organizationId,
      campaign_id: campaignId,
      total_impressions: 741000,
      total_engagement: 48250,
      engagement_rate: 48250 / 741000,
      total_posts: 1,
      total_influencers: 1,
      last_snapshot_at: summarySnapshotAt,
      created_at: summarySnapshotAt,
      updated_at: summarySnapshotAt,
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

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it("covers login through reporting for the planning workflow", async () => {
    const loginResponse = await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({
        email: "avery.chen@northstar.example",
        password: "AdminPass123!",
      })
      .expect(201);

    expect(loginResponse.body.user).toMatchObject({
      id: userId,
      organizationId,
      role: "organization_admin",
    });
    expect(loginResponse.body.access_token).toEqual(expect.any(String));

    const authHeader = {
      Authorization: `Bearer ${loginResponse.body.access_token}`,
    };

    const campaignsResponse = await request(app.getHttpServer())
      .get("/api/campaigns")
      .set(authHeader)
      .expect(200);

    expect(campaignsResponse.body).toMatchObject({
      data: [
        {
          id: campaignId,
          name: "Arachnid Creator Launch",
          company_id: companyId,
          status: "active",
        },
      ],
      meta: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      },
    });

    const planningViewResponse = await request(app.getHttpServer())
      .get(`/api/campaigns/${campaignId}/planning-view`)
      .set(authHeader)
      .expect(200);

    expect(planningViewResponse.body).toMatchObject({
      id: campaignId,
      company: {
        id: companyId,
        name: "Innova Discs",
      },
      missions: [
        {
          id: missionId,
          name: "Creator Seeding",
          actions: [
            {
              id: actionId,
              title: "Arachnid first-throw reel",
              assignments: [
                {
                  id: assignmentId,
                  influencer_summary: {
                    id: influencerId,
                    name: "Nova Blake",
                  },
                },
              ],
            },
          ],
        },
      ],
    });

    const missionActionsResponse = await request(app.getHttpServer())
      .get(`/api/missions/${missionId}/actions`)
      .set(authHeader)
      .expect(200);

    expect(missionActionsResponse.body).toMatchObject([
      {
        id: actionId,
        mission_id: missionId,
        title: "Arachnid first-throw reel",
        _count: {
          action_assignments: 1,
        },
      },
    ]);

    const actionAssignmentsResponse = await request(app.getHttpServer())
      .get(`/api/actions/${actionId}/assignments`)
      .set(authHeader)
      .expect(200);

    expect(actionAssignmentsResponse.body).toMatchObject({
      action: {
        id: actionId,
        mission: {
          id: missionId,
          campaign_id: campaignId,
        },
      },
      assignments: [
        {
          id: assignmentId,
          influencer: {
            id: influencerId,
            name: "Nova Blake",
          },
        },
      ],
    });

    const assignmentResponse = await request(app.getHttpServer())
      .get(`/api/action-assignments/${assignmentId}`)
      .set(authHeader)
      .expect(200);

    expect(assignmentResponse.body).toMatchObject({
      id: assignmentId,
      action_id: actionId,
      influencer_id: influencerId,
      assignment_status: "approved",
    });

    const summaryResponse = await request(app.getHttpServer())
      .get(`/api/reports/campaigns/${campaignId}/summary`)
      .set(authHeader)
      .expect(200);

    expect(summaryResponse.body).toMatchObject({
      scope: {
        type: "campaign",
        id: campaignId,
      },
      total_impressions: 741000,
      total_engagement: 48250,
      total_posts: 1,
      total_influencers: 1,
      filters_applied: {},
    });
  });
});
