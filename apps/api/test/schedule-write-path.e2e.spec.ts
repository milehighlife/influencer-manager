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

type UserRecord = {
  id: string;
  email: string;
  full_name: string;
  organization_id: string;
  influencer_id: string | null;
  role: string;
  status: "active";
  password_hash: string;
  created_at: Date;
  updated_at: Date;
};

type CompanyRecord = {
  id: string;
  organization_id: string;
  client_id: string;
  name: string;
};

type CampaignRecord = {
  id: string;
  organization_id: string;
  company_id: string;
  name: string;
  description: string | null;
  campaign_type: string;
  status: string;
  start_date: Date | null;
  end_date: Date | null;
  budget: number | null;
  created_at: Date;
  updated_at: Date;
};

type MissionRecord = {
  id: string;
  organization_id: string;
  campaign_id: string;
  name: string;
  description: string | null;
  sequence_order: number;
  start_date: Date | null;
  end_date: Date | null;
  status: string;
  created_at: Date;
  updated_at: Date;
};

type ActionRecord = {
  id: string;
  organization_id: string;
  mission_id: string;
  title: string;
  platform: string;
  instructions: string | null;
  content_format: string;
  required_deliverables: number;
  approval_required: boolean;
  start_window: Date | null;
  end_window: Date | null;
  status: string;
  created_at: Date;
  updated_at: Date;
};

type TestState = {
  users: UserRecord[];
  companies: CompanyRecord[];
  campaigns: CampaignRecord[];
  missions: MissionRecord[];
  actions: ActionRecord[];
};

function cloneDate(value: Date | null) {
  return value ? new Date(value) : null;
}

function cloneCampaign(record: CampaignRecord) {
  return {
    ...record,
    start_date: cloneDate(record.start_date),
    end_date: cloneDate(record.end_date),
    created_at: new Date(record.created_at),
    updated_at: new Date(record.updated_at),
  };
}

function cloneMission(record: MissionRecord) {
  return {
    ...record,
    start_date: cloneDate(record.start_date),
    end_date: cloneDate(record.end_date),
    created_at: new Date(record.created_at),
    updated_at: new Date(record.updated_at),
  };
}

function cloneAction(record: ActionRecord) {
  return {
    ...record,
    start_window: cloneDate(record.start_window),
    end_window: cloneDate(record.end_window),
    created_at: new Date(record.created_at),
    updated_at: new Date(record.updated_at),
  };
}

function applyDefinedUpdate<T extends Record<string, unknown>>(
  target: T,
  update: Record<string, unknown>,
) {
  for (const [key, value] of Object.entries(update)) {
    if (value !== undefined) {
      target[key as keyof T] = value as T[keyof T];
    }
  }
}

function createInitialState(): TestState {
  return {
    users: [
      {
        id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        email: "admin@northstar.example",
        full_name: "Org Admin",
        organization_id: "11111111-1111-1111-1111-111111111111",
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
        organization_id: "11111111-1111-1111-1111-111111111111",
        influencer_id: null,
        role: "campaign_manager",
        status: "active",
        password_hash: "hash",
        created_at: new Date("2026-03-01T00:00:00.000Z"),
        updated_at: new Date("2026-03-01T00:00:00.000Z"),
      },
      {
        id: "cccccccc-cccc-cccc-cccc-cccccccccccc",
        email: "creator@northstar.example",
        full_name: "Creator",
        organization_id: "11111111-1111-1111-1111-111111111111",
        influencer_id: "99999999-9999-9999-9999-999999999999",
        role: "influencer",
        status: "active",
        password_hash: "hash",
        created_at: new Date("2026-03-01T00:00:00.000Z"),
        updated_at: new Date("2026-03-01T00:00:00.000Z"),
      },
      {
        id: "dddddddd-dddd-dddd-dddd-dddddddddddd",
        email: "other-admin@other.example",
        full_name: "Other Org Admin",
        organization_id: "22222222-2222-2222-2222-222222222222",
        influencer_id: null,
        role: "organization_admin",
        status: "active",
        password_hash: "hash",
        created_at: new Date("2026-03-01T00:00:00.000Z"),
        updated_at: new Date("2026-03-01T00:00:00.000Z"),
      },
    ],
    companies: [
      {
        id: "44444444-4444-4444-4444-444444444444",
        organization_id: "11111111-1111-1111-1111-111111111111",
        client_id: "12121212-1212-1212-1212-121212121212",
        name: "Glow Labs",
      },
      {
        id: "55555555-5555-5555-5555-555555555555",
        organization_id: "22222222-2222-2222-2222-222222222222",
        client_id: "13131313-1313-1313-1313-131313131313",
        name: "Peak Labs",
      },
    ],
    campaigns: [
      {
        id: "66666666-6666-6666-6666-666666666666",
        organization_id: "11111111-1111-1111-1111-111111111111",
        company_id: "44444444-4444-4444-4444-444444444444",
        name: "Spring Launch",
        description: null,
        campaign_type: "product_launch",
        status: "planned",
        start_date: new Date("2026-03-01T00:00:00.000Z"),
        end_date: new Date("2026-03-31T00:00:00.000Z"),
        budget: null,
        created_at: new Date("2026-02-20T00:00:00.000Z"),
        updated_at: new Date("2026-02-21T00:00:00.000Z"),
      },
      {
        id: "77777777-7777-7777-7777-777777777777",
        organization_id: "22222222-2222-2222-2222-222222222222",
        company_id: "55555555-5555-5555-5555-555555555555",
        name: "Other Org Campaign",
        description: null,
        campaign_type: "product_launch",
        status: "planned",
        start_date: new Date("2026-04-01T00:00:00.000Z"),
        end_date: new Date("2026-04-30T00:00:00.000Z"),
        budget: null,
        created_at: new Date("2026-03-01T00:00:00.000Z"),
        updated_at: new Date("2026-03-02T00:00:00.000Z"),
      },
    ],
    missions: [
      {
        id: "88888888-8888-8888-8888-888888888888",
        organization_id: "11111111-1111-1111-1111-111111111111",
        campaign_id: "66666666-6666-6666-6666-666666666666",
        name: "Creator Seeding",
        description: null,
        sequence_order: 1,
        start_date: new Date("2026-03-05T00:00:00.000Z"),
        end_date: new Date("2026-03-10T00:00:00.000Z"),
        status: "planned",
        created_at: new Date("2026-03-01T00:00:00.000Z"),
        updated_at: new Date("2026-03-01T00:00:00.000Z"),
      },
      {
        id: "99999999-9999-9999-9999-999999999999",
        organization_id: "11111111-1111-1111-1111-111111111111",
        campaign_id: "66666666-6666-6666-6666-666666666666",
        name: "Launch Push",
        description: null,
        sequence_order: 2,
        start_date: new Date("2026-03-12T00:00:00.000Z"),
        end_date: new Date("2026-03-18T00:00:00.000Z"),
        status: "planned",
        created_at: new Date("2026-03-01T00:00:00.000Z"),
        updated_at: new Date("2026-03-01T00:00:00.000Z"),
      },
      {
        id: "10101010-1010-1010-1010-101010101010",
        organization_id: "22222222-2222-2222-2222-222222222222",
        campaign_id: "77777777-7777-7777-7777-777777777777",
        name: "Other Org Mission",
        description: null,
        sequence_order: 1,
        start_date: new Date("2026-04-05T00:00:00.000Z"),
        end_date: new Date("2026-04-10T00:00:00.000Z"),
        status: "planned",
        created_at: new Date("2026-03-01T00:00:00.000Z"),
        updated_at: new Date("2026-03-01T00:00:00.000Z"),
      },
    ],
    actions: [
      {
        id: "11111111-2222-3333-4444-555555555555",
        organization_id: "11111111-1111-1111-1111-111111111111",
        mission_id: "88888888-8888-8888-8888-888888888888",
        title: "Instagram Reel",
        platform: "instagram",
        instructions: null,
        content_format: "reel",
        required_deliverables: 1,
        approval_required: true,
        start_window: new Date("2026-03-06T10:00:00.000Z"),
        end_window: new Date("2026-03-06T12:00:00.000Z"),
        status: "draft",
        created_at: new Date("2026-03-01T00:00:00.000Z"),
        updated_at: new Date("2026-03-01T00:00:00.000Z"),
      },
      {
        id: "22222222-3333-4444-5555-666666666666",
        organization_id: "11111111-1111-1111-1111-111111111111",
        mission_id: "88888888-8888-8888-8888-888888888888",
        title: "Launch Story",
        platform: "instagram",
        instructions: null,
        content_format: "story",
        required_deliverables: 1,
        approval_required: true,
        start_window: new Date("2026-03-06T14:00:00.000Z"),
        end_window: new Date("2026-03-06T16:00:00.000Z"),
        status: "draft",
        created_at: new Date("2026-03-01T00:00:00.000Z"),
        updated_at: new Date("2026-03-01T00:00:00.000Z"),
      },
      {
        id: "33333333-4444-5555-6666-777777777777",
        organization_id: "22222222-2222-2222-2222-222222222222",
        mission_id: "10101010-1010-1010-1010-101010101010",
        title: "Other Org Action",
        platform: "instagram",
        instructions: null,
        content_format: "reel",
        required_deliverables: 1,
        approval_required: true,
        start_window: new Date("2026-04-06T10:00:00.000Z"),
        end_window: new Date("2026-04-06T12:00:00.000Z"),
        status: "draft",
        created_at: new Date("2026-03-01T00:00:00.000Z"),
        updated_at: new Date("2026-03-01T00:00:00.000Z"),
      },
    ],
  };
}

describe("Planner write-path schedule truth (e2e)", () => {
  let app: INestApplication;
  let state: TestState;

  const prisma: any = {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    company: {
      findFirst: jest.fn(),
    },
    campaign: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    mission: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    action: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
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
      return state.users.find((user) => user.email === where.email) ?? null;
    });

    prisma.user.findFirst.mockImplementation(async ({ where }: any) => {
      return (
        state.users.find(
          (user) =>
            user.id === where.id &&
            user.organization_id === where.organization_id &&
            user.status === where.status,
        ) ?? null
      );
    });

    prisma.company.findFirst.mockImplementation(async ({ where }: any) => {
      return (
        state.companies.find(
          (company) =>
            company.id === where.id &&
            company.organization_id === where.organization_id,
        ) ?? null
      );
    });

    prisma.campaign.findFirst.mockImplementation(async ({ where }: any) => {
      const campaign = state.campaigns.find(
        (record) =>
          record.id === where.id &&
          record.organization_id === where.organization_id,
      );

      return campaign ? cloneCampaign(campaign) : null;
    });

    prisma.campaign.create.mockImplementation(async ({ data }: any) => {
      const record: CampaignRecord = {
        id: `campaign-created-${state.campaigns.length + 1}`,
        organization_id: data.organization_id,
        company_id: data.company_id,
        name: data.name,
        description: data.description ?? null,
        campaign_type: data.campaign_type,
        status: data.status ?? "planned",
        start_date: data.start_date ?? null,
        end_date: data.end_date ?? null,
        budget: data.budget ?? null,
        created_at: new Date("2026-03-15T00:00:00.000Z"),
        updated_at: new Date("2026-03-15T00:00:00.000Z"),
      };

      state.campaigns.push(record);

      return cloneCampaign(record);
    });

    prisma.campaign.update.mockImplementation(async ({ where, data }: any) => {
      const record = state.campaigns.find((campaign) => campaign.id === where.id);

      if (!record) {
        return null;
      }

      applyDefinedUpdate(record, data);
      record.updated_at = new Date("2026-03-15T00:00:00.000Z");

      return cloneCampaign(record);
    });

    prisma.mission.findFirst.mockImplementation(async ({ where }: any) => {
      const mission = state.missions.find(
        (record) =>
          record.id === where.id &&
          record.organization_id === where.organization_id,
      );

      return mission ? cloneMission(mission) : null;
    });

    prisma.mission.findMany.mockImplementation(async ({ where }: any) => {
      let missions = state.missions.filter(
        (mission) => mission.organization_id === where.organization_id,
      );

      if (where.campaign_id) {
        missions = missions.filter(
          (mission) => mission.campaign_id === where.campaign_id,
        );
      }

      if (where.NOT?.id) {
        missions = missions.filter((mission) => mission.id !== where.NOT.id);
      }

      return missions.map(cloneMission);
    });

    prisma.mission.create.mockImplementation(async ({ data }: any) => {
      const record: MissionRecord = {
        id: `mission-created-${state.missions.length + 1}`,
        organization_id: data.organization_id,
        campaign_id: data.campaign_id,
        name: data.name,
        description: data.description ?? null,
        sequence_order: data.sequence_order,
        start_date: data.start_date ?? null,
        end_date: data.end_date ?? null,
        status: data.status ?? "planned",
        created_at: new Date("2026-03-15T00:00:00.000Z"),
        updated_at: new Date("2026-03-15T00:00:00.000Z"),
      };

      state.missions.push(record);

      return cloneMission(record);
    });

    prisma.mission.update.mockImplementation(async ({ where, data }: any) => {
      const record = state.missions.find((mission) => mission.id === where.id);

      if (!record) {
        return null;
      }

      applyDefinedUpdate(record, data);
      record.updated_at = new Date("2026-03-15T00:00:00.000Z");

      return cloneMission(record);
    });

    prisma.action.findFirst.mockImplementation(async ({ where }: any) => {
      const action = state.actions.find(
        (record) =>
          record.id === where.id &&
          record.organization_id === where.organization_id,
      );

      return action ? cloneAction(action) : null;
    });

    prisma.action.findMany.mockImplementation(async ({ where }: any) => {
      let actions = state.actions.filter(
        (action) => action.organization_id === where.organization_id,
      );

      if (where.mission_id) {
        actions = actions.filter((action) => action.mission_id === where.mission_id);
      }

      if (where.NOT?.id) {
        actions = actions.filter((action) => action.id !== where.NOT.id);
      }

      return actions.map(cloneAction);
    });

    prisma.action.create.mockImplementation(async ({ data }: any) => {
      const record: ActionRecord = {
        id: `action-created-${state.actions.length + 1}`,
        organization_id: data.organization_id,
        mission_id: data.mission_id,
        title: data.title,
        platform: data.platform,
        instructions: data.instructions ?? null,
        content_format: data.content_format,
        required_deliverables: data.required_deliverables ?? 1,
        approval_required: data.approval_required ?? false,
        start_window: data.start_window ?? null,
        end_window: data.end_window ?? null,
        status: data.status ?? "draft",
        created_at: new Date("2026-03-15T00:00:00.000Z"),
        updated_at: new Date("2026-03-15T00:00:00.000Z"),
      };

      state.actions.push(record);

      return cloneAction(record);
    });

    prisma.action.update.mockImplementation(async ({ where, data }: any) => {
      const record = state.actions.find((action) => action.id === where.id);

      if (!record) {
        return null;
      }

      applyDefinedUpdate(record, data);
      record.updated_at = new Date("2026-03-15T00:00:00.000Z");

      return cloneAction(record);
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
    state = createInitialState();
    jest.clearAllMocks();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it("rejects campaign create when start_date is after end_date", async () => {
    const authHeader = await loginAs("admin@northstar.example");

    const response = await request(app.getHttpServer())
      .post("/api/campaigns")
      .set(authHeader)
      .send({
        company_id: "44444444-4444-4444-4444-444444444444",
        name: "Invalid Campaign",
        campaign_type: "product_launch",
        start_date: "2026-03-20",
        end_date: "2026-03-10",
      })
      .expect(400);

    expect(response.body.message).toContain(
      "Campaign start date must be on or before the campaign end date.",
    );
  });

  it("allows same-day campaign create boundaries", async () => {
    const authHeader = await loginAs("admin@northstar.example");

    const response = await request(app.getHttpServer())
      .post("/api/campaigns")
      .set(authHeader)
      .send({
        company_id: "44444444-4444-4444-4444-444444444444",
        name: "Same Day Campaign",
        campaign_type: "product_launch",
        start_date: "2026-03-20",
        end_date: "2026-03-20",
      })
      .expect(201);

    expect(response.body.start_date).toBe("2026-03-20T00:00:00.000Z");
    expect(response.body.end_date).toBe("2026-03-20T00:00:00.000Z");
  });

  it("rejects campaign updates that exclude scheduled mission boundaries", async () => {
    const authHeader = await loginAs("manager@northstar.example");

    const response = await request(app.getHttpServer())
      .patch("/api/campaigns/66666666-6666-6666-6666-666666666666")
      .set(authHeader)
      .send({
        start_date: "2026-03-07",
        end_date: "2026-03-31",
      })
      .expect(400);

    expect(response.body.message).toContain(
      'Campaign dates must include mission "Creator Seeding" from 2026-03-05 to 2026-03-10.',
    );
  });

  it("denies influencer campaign writes", async () => {
    const authHeader = await loginAs("creator@northstar.example");

    await request(app.getHttpServer())
      .post("/api/campaigns")
      .set(authHeader)
      .send({
        company_id: "44444444-4444-4444-4444-444444444444",
        name: "Blocked Campaign",
        campaign_type: "product_launch",
      })
      .expect(403);
  });

  it("blocks cross-tenant campaign updates", async () => {
    const authHeader = await loginAs("other-admin@other.example");

    await request(app.getHttpServer())
      .patch("/api/campaigns/66666666-6666-6666-6666-666666666666")
      .set(authHeader)
      .send({ name: "Cross Tenant Edit" })
      .expect(404);
  });

  it("denies unauthenticated campaign writes", async () => {
    await request(app.getHttpServer())
      .post("/api/campaigns")
      .send({
        company_id: "44444444-4444-4444-4444-444444444444",
        name: "No Auth Campaign",
        campaign_type: "product_launch",
      })
      .expect(401);
  });

  it("rejects mission create outside campaign bounds", async () => {
    const authHeader = await loginAs("admin@northstar.example");

    const response = await request(app.getHttpServer())
      .post("/api/missions")
      .set(authHeader)
      .send({
        campaign_id: "66666666-6666-6666-6666-666666666666",
        name: "Too Early Mission",
        sequence_order: 3,
        start_date: "2026-02-28",
        end_date: "2026-03-04",
      })
      .expect(400);

    expect(response.body.message).toContain(
      "Mission dates must stay within the campaign date window.",
    );
  });

  it("rejects mission create overlap with sibling missions", async () => {
    const authHeader = await loginAs("admin@northstar.example");

    const response = await request(app.getHttpServer())
      .post("/api/missions")
      .set(authHeader)
      .send({
        campaign_id: "66666666-6666-6666-6666-666666666666",
        name: "Overlap Mission",
        sequence_order: 2,
        start_date: "2026-03-09",
        end_date: "2026-03-15",
      })
      .expect(400);

    expect(response.body.message).toContain(
      'Mission dates overlap with "Creator Seeding" from 2026-03-05 to 2026-03-10.',
    );
  });

  it("allows same-day mission handoff on create", async () => {
    const authHeader = await loginAs("admin@northstar.example");

    const response = await request(app.getHttpServer())
      .post("/api/missions")
      .set(authHeader)
      .send({
        campaign_id: "66666666-6666-6666-6666-666666666666",
        name: "Conversion Push",
        sequence_order: 3,
        start_date: "2026-03-18",
        end_date: "2026-03-22",
      })
      .expect(201);

    expect(response.body.start_date).toBe("2026-03-18T00:00:00.000Z");
    expect(response.body.end_date).toBe("2026-03-22T00:00:00.000Z");
  });

  it("allows partial mission scheduling on create", async () => {
    const authHeader = await loginAs("admin@northstar.example");

    const response = await request(app.getHttpServer())
      .post("/api/missions")
      .set(authHeader)
      .send({
        campaign_id: "66666666-6666-6666-6666-666666666666",
        name: "Partial Mission",
        sequence_order: 3,
        start_date: "2026-03-19",
      })
      .expect(201);

    expect(response.body.start_date).toBe("2026-03-19T00:00:00.000Z");
    expect(response.body.end_date).toBeNull();
  });

  it("rejects mission update overlap with next mission", async () => {
    const authHeader = await loginAs("manager@northstar.example");

    const response = await request(app.getHttpServer())
      .patch("/api/missions/88888888-8888-8888-8888-888888888888")
      .set(authHeader)
      .send({
        end_date: "2026-03-15",
      })
      .expect(400);

    expect(response.body.message).toContain(
      'Mission dates overlap with "Launch Push" from 2026-03-12 to 2026-03-18.',
    );
  });

  it("rejects mission update outside campaign bounds", async () => {
    const authHeader = await loginAs("manager@northstar.example");

    const response = await request(app.getHttpServer())
      .patch("/api/missions/88888888-8888-8888-8888-888888888888")
      .set(authHeader)
      .send({
        end_date: "2026-04-02",
      })
      .expect(400);

    expect(response.body.message).toContain(
      "Mission dates must stay within the campaign date window.",
    );
  });

  it("denies influencer mission writes", async () => {
    const authHeader = await loginAs("creator@northstar.example");

    await request(app.getHttpServer())
      .post("/api/missions")
      .set(authHeader)
      .send({
        campaign_id: "66666666-6666-6666-6666-666666666666",
        name: "Blocked Mission",
        sequence_order: 3,
      })
      .expect(403);
  });

  it("blocks cross-tenant mission create against another org campaign", async () => {
    const authHeader = await loginAs("other-admin@other.example");

    await request(app.getHttpServer())
      .post("/api/missions")
      .set(authHeader)
      .send({
        campaign_id: "66666666-6666-6666-6666-666666666666",
        name: "Cross Tenant Mission",
        sequence_order: 3,
      })
      .expect(404);
  });

  it("rejects action create outside mission bounds", async () => {
    const authHeader = await loginAs("admin@northstar.example");

    const response = await request(app.getHttpServer())
      .post("/api/actions")
      .set(authHeader)
      .send({
        mission_id: "88888888-8888-8888-8888-888888888888",
        title: "Too Early Reel",
        platform: "instagram",
        content_format: "reel",
        start_window: "2026-03-04T10:00:00.000Z",
      })
      .expect(400);

    expect(response.body.message).toContain(
      "Action dates must stay within the parent mission window",
    );
  });

  it("rejects action create sibling conflict", async () => {
    const authHeader = await loginAs("admin@northstar.example");

    const response = await request(app.getHttpServer())
      .post("/api/actions")
      .set(authHeader)
      .send({
        mission_id: "88888888-8888-8888-8888-888888888888",
        title: "Conflict Reel",
        platform: "instagram",
        content_format: "reel",
        start_window: "2026-03-06T11:00:00.000Z",
        end_window: "2026-03-06T13:00:00.000Z",
      })
      .expect(400);

    expect(response.body.message).toContain(
      'Action window overlaps with "Instagram Reel"',
    );
  });

  it("allows same-day action handoff on create", async () => {
    const authHeader = await loginAs("admin@northstar.example");

    const response = await request(app.getHttpServer())
      .post("/api/actions")
      .set(authHeader)
      .send({
        mission_id: "88888888-8888-8888-8888-888888888888",
        title: "Boundary Reel",
        platform: "instagram",
        content_format: "reel",
        start_window: "2026-03-06T12:00:00.000Z",
        end_window: "2026-03-06T13:00:00.000Z",
      })
      .expect(201);

    expect(response.body.start_window).toBe("2026-03-06T12:00:00.000Z");
    expect(response.body.end_window).toBe("2026-03-06T13:00:00.000Z");
  });

  it("allows partial action scheduling on create", async () => {
    const authHeader = await loginAs("admin@northstar.example");

    const response = await request(app.getHttpServer())
      .post("/api/actions")
      .set(authHeader)
      .send({
        mission_id: "88888888-8888-8888-8888-888888888888",
        title: "Partial Reel",
        platform: "instagram",
        content_format: "reel",
        start_window: "2026-03-07T10:00:00.000Z",
      })
      .expect(201);

    expect(response.body.start_window).toBe("2026-03-07T10:00:00.000Z");
    expect(response.body.end_window).toBeNull();
  });

  it("rejects action update sibling conflict", async () => {
    const authHeader = await loginAs("manager@northstar.example");

    const response = await request(app.getHttpServer())
      .patch("/api/actions/11111111-2222-3333-4444-555555555555")
      .set(authHeader)
      .send({
        start_window: "2026-03-06T15:00:00.000Z",
        end_window: "2026-03-06T17:00:00.000Z",
      })
      .expect(400);

    expect(response.body.message).toContain(
      'Action window overlaps with "Launch Story"',
    );
  });

  it("rejects action update outside mission bounds", async () => {
    const authHeader = await loginAs("manager@northstar.example");

    const response = await request(app.getHttpServer())
      .patch("/api/actions/11111111-2222-3333-4444-555555555555")
      .set(authHeader)
      .send({
        end_window: "2026-03-11T10:00:00.000Z",
      })
      .expect(400);

    expect(response.body.message).toContain(
      "Action dates must stay within the parent mission window",
    );
  });

  it("denies influencer action writes", async () => {
    const authHeader = await loginAs("creator@northstar.example");

    await request(app.getHttpServer())
      .post("/api/actions")
      .set(authHeader)
      .send({
        mission_id: "88888888-8888-8888-8888-888888888888",
        title: "Blocked Action",
        platform: "instagram",
        content_format: "reel",
      })
      .expect(403);
  });

  it("blocks cross-tenant action create against another org mission", async () => {
    const authHeader = await loginAs("other-admin@other.example");

    await request(app.getHttpServer())
      .post("/api/actions")
      .set(authHeader)
      .send({
        mission_id: "88888888-8888-8888-8888-888888888888",
        title: "Cross Tenant Action",
        platform: "instagram",
        content_format: "reel",
      })
      .expect(404);
  });
});
