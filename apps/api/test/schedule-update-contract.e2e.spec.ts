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
    campaigns: [
      {
        id: "33333333-3333-3333-3333-333333333333",
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
        id: "55555555-5555-5555-5555-555555555555",
        organization_id: "11111111-1111-1111-1111-111111111111",
        company_id: "44444444-4444-4444-4444-444444444444",
        name: "Always On",
        description: null,
        campaign_type: "always_on",
        status: "active",
        start_date: null,
        end_date: null,
        budget: null,
        created_at: new Date("2026-02-25T00:00:00.000Z"),
        updated_at: new Date("2026-02-25T00:00:00.000Z"),
      },
      {
        id: "66666666-6666-6666-6666-666666666666",
        organization_id: "22222222-2222-2222-2222-222222222222",
        company_id: "77777777-7777-7777-7777-777777777777",
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
        id: "77777777-7777-7777-7777-777777777777",
        organization_id: "11111111-1111-1111-1111-111111111111",
        campaign_id: "33333333-3333-3333-3333-333333333333",
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
        id: "88888888-8888-8888-8888-888888888888",
        organization_id: "22222222-2222-2222-2222-222222222222",
        campaign_id: "66666666-6666-6666-6666-666666666666",
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
        id: "99999999-9999-9999-9999-999999999999",
        organization_id: "11111111-1111-1111-1111-111111111111",
        mission_id: "77777777-7777-7777-7777-777777777777",
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
        id: "10101010-1010-1010-1010-101010101010",
        organization_id: "22222222-2222-2222-2222-222222222222",
        mission_id: "88888888-8888-8888-8888-888888888888",
        title: "Other Org Reel",
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

describe("Nullable schedule update contract (e2e)", () => {
  let app: INestApplication;
  let state: TestState;

  const prisma: any = {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    campaign: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    mission: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    action: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    company: {
      findFirst: jest.fn(),
    },
    $transaction: jest.fn(),
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  };

  const resetMocks = () => {
    prisma.user.findUnique.mockClear();
    prisma.user.findFirst.mockClear();
    prisma.campaign.findFirst.mockClear();
    prisma.campaign.update.mockClear();
    prisma.mission.findFirst.mockClear();
    prisma.mission.findMany.mockClear();
    prisma.mission.update.mockClear();
    prisma.action.findFirst.mockClear();
    prisma.action.findMany.mockClear();
    prisma.action.update.mockClear();
    prisma.company.findFirst.mockClear();
    prisma.$transaction.mockClear();
  };

  const findUserByEmail = (email: string) =>
    state.users.find((user) => user.email === email) ?? null;

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
      return findUserByEmail(where.email);
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

    prisma.company.findFirst.mockResolvedValue({
      id: "44444444-4444-4444-4444-444444444444",
      organization_id: "11111111-1111-1111-1111-111111111111",
    });

    prisma.campaign.findFirst.mockImplementation(async ({ where }: any) => {
      const record = state.campaigns.find(
        (campaign) =>
          campaign.id === where.id &&
          campaign.organization_id === where.organization_id,
      );

      return record ? cloneCampaign(record) : null;
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
      const record = state.missions.find(
        (mission) =>
          mission.id === where.id &&
          mission.organization_id === where.organization_id,
      );

      return record ? cloneMission(record) : null;
    });

    prisma.mission.findMany.mockImplementation(async ({ where }: any) => {
      let missions = state.missions.filter(
        (mission) => mission.organization_id === where.organization_id,
      );

      if (where.campaign_id) {
        if (typeof where.campaign_id === "string") {
          missions = missions.filter(
            (mission) => mission.campaign_id === where.campaign_id,
          );
        } else if (where.campaign_id.in) {
          const ids = new Set(where.campaign_id.in as string[]);
          missions = missions.filter((mission) => ids.has(mission.campaign_id));
        }
      }

      if (where.NOT?.id) {
        missions = missions.filter((mission) => mission.id !== where.NOT.id);
      }

      return missions.map(cloneMission);
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
      const record = state.actions.find(
        (action) =>
          action.id === where.id &&
          action.organization_id === where.organization_id,
      );

      return record ? cloneAction(record) : null;
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
    resetMocks();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it.each(["admin@northstar.example", "manager@northstar.example"])(
    "allows internal role %s to patch campaigns with nullable payloads",
    async (email) => {
      const authHeader = await loginAs(email);

      const response = await request(app.getHttpServer())
        .patch("/api/campaigns/33333333-3333-3333-3333-333333333333")
        .set(authHeader)
        .send({
          start_date: null,
        })
        .expect(200);

      expect(response.body.start_date).toBeNull();
      expect(response.body.end_date).toBe("2026-03-31T00:00:00.000Z");
    },
  );

  it.each([
    "/api/campaigns/33333333-3333-3333-3333-333333333333",
    "/api/missions/77777777-7777-7777-7777-777777777777",
    "/api/actions/99999999-9999-9999-9999-999999999999",
  ])("denies influencer access to %s", async (path) => {
    const authHeader = await loginAs("creator@northstar.example");

    await request(app.getHttpServer())
      .patch(path)
      .set(authHeader)
      .send({ start_date: null, start_window: null })
      .expect(403);
  });

  it.each([
    "/api/campaigns/33333333-3333-3333-3333-333333333333",
    "/api/missions/77777777-7777-7777-7777-777777777777",
    "/api/actions/99999999-9999-9999-9999-999999999999",
  ])("denies unauthenticated access to %s", async (path) => {
    await request(app.getHttpServer())
      .patch(path)
      .send({ start_date: null, start_window: null })
      .expect(401);
  });

  it.each([
    "/api/campaigns/33333333-3333-3333-3333-333333333333",
    "/api/missions/77777777-7777-7777-7777-777777777777",
    "/api/actions/99999999-9999-9999-9999-999999999999",
  ])("blocks cross-tenant updates on %s", async (path) => {
    const authHeader = await loginAs("other-admin@other.example");

    await request(app.getHttpServer())
      .patch(path)
      .set(authHeader)
      .send({ name: "Cross-tenant edit" })
      .expect(404);
  });

  it("clears campaign start_date with explicit null", async () => {
    const authHeader = await loginAs("admin@northstar.example");

    const response = await request(app.getHttpServer())
      .patch("/api/campaigns/33333333-3333-3333-3333-333333333333")
      .set(authHeader)
      .send({ start_date: null })
      .expect(200);

    expect(response.body.start_date).toBeNull();
    expect(response.body.end_date).toBe("2026-03-31T00:00:00.000Z");
  });

  it("clears campaign end_date with explicit null", async () => {
    const authHeader = await loginAs("admin@northstar.example");

    const response = await request(app.getHttpServer())
      .patch("/api/campaigns/33333333-3333-3333-3333-333333333333")
      .set(authHeader)
      .send({ end_date: null })
      .expect(200);

    expect(response.body.start_date).toBe("2026-03-01T00:00:00.000Z");
    expect(response.body.end_date).toBeNull();
  });

  it("clears both campaign dates with explicit null", async () => {
    const authHeader = await loginAs("admin@northstar.example");

    const response = await request(app.getHttpServer())
      .patch("/api/campaigns/33333333-3333-3333-3333-333333333333")
      .set(authHeader)
      .send({ start_date: null, end_date: null })
      .expect(200);

    expect(response.body.start_date).toBeNull();
    expect(response.body.end_date).toBeNull();
  });

  it("leaves campaign dates unchanged when date fields are omitted", async () => {
    const authHeader = await loginAs("admin@northstar.example");

    const response = await request(app.getHttpServer())
      .patch("/api/campaigns/33333333-3333-3333-3333-333333333333")
      .set(authHeader)
      .send({ name: "Spring Launch Refresh" })
      .expect(200);

    expect(response.body.start_date).toBe("2026-03-01T00:00:00.000Z");
    expect(response.body.end_date).toBe("2026-03-31T00:00:00.000Z");
    expect(response.body.name).toBe("Spring Launch Refresh");
  });

  it("rejects invalid campaign date order at the route level", async () => {
    const authHeader = await loginAs("admin@northstar.example");

    const response = await request(app.getHttpServer())
      .patch("/api/campaigns/33333333-3333-3333-3333-333333333333")
      .set(authHeader)
      .send({
        start_date: "2026-03-20",
        end_date: "2026-03-10",
      })
      .expect(400);

    expect(response.body.message).toContain(
      "Campaign start date must be on or before the campaign end date.",
    );
  });

  it("allows same-day campaign boundaries", async () => {
    const authHeader = await loginAs("admin@northstar.example");

    const response = await request(app.getHttpServer())
      .patch("/api/campaigns/55555555-5555-5555-5555-555555555555")
      .set(authHeader)
      .send({
        start_date: "2026-03-20",
        end_date: "2026-03-20",
      })
      .expect(200);

    expect(response.body.start_date).toBe("2026-03-20T00:00:00.000Z");
    expect(response.body.end_date).toBe("2026-03-20T00:00:00.000Z");
  });

  it("rejects campaign updates that exclude scheduled mission boundaries", async () => {
    const authHeader = await loginAs("admin@northstar.example");

    const response = await request(app.getHttpServer())
      .patch("/api/campaigns/33333333-3333-3333-3333-333333333333")
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

  it("clears mission start_date with explicit null and preserves partial scheduling", async () => {
    const authHeader = await loginAs("admin@northstar.example");

    const response = await request(app.getHttpServer())
      .patch("/api/missions/77777777-7777-7777-7777-777777777777")
      .set(authHeader)
      .send({ start_date: null })
      .expect(200);

    expect(response.body.start_date).toBeNull();
    expect(response.body.end_date).toBe("2026-03-10T00:00:00.000Z");
  });

  it("clears mission end_date with explicit null and preserves partial scheduling", async () => {
    const authHeader = await loginAs("admin@northstar.example");

    const response = await request(app.getHttpServer())
      .patch("/api/missions/77777777-7777-7777-7777-777777777777")
      .set(authHeader)
      .send({ end_date: null })
      .expect(200);

    expect(response.body.start_date).toBe("2026-03-05T00:00:00.000Z");
    expect(response.body.end_date).toBeNull();
  });

  it("clears both mission dates with explicit null", async () => {
    const authHeader = await loginAs("admin@northstar.example");

    const response = await request(app.getHttpServer())
      .patch("/api/missions/77777777-7777-7777-7777-777777777777")
      .set(authHeader)
      .send({ start_date: null, end_date: null })
      .expect(200);

    expect(response.body.start_date).toBeNull();
    expect(response.body.end_date).toBeNull();
  });

  it("leaves mission dates unchanged when fields are omitted", async () => {
    const authHeader = await loginAs("admin@northstar.example");

    const response = await request(app.getHttpServer())
      .patch("/api/missions/77777777-7777-7777-7777-777777777777")
      .set(authHeader)
      .send({ name: "Creator Seeding Phase" })
      .expect(200);

    expect(response.body.start_date).toBe("2026-03-05T00:00:00.000Z");
    expect(response.body.end_date).toBe("2026-03-10T00:00:00.000Z");
    expect(response.body.name).toBe("Creator Seeding Phase");
  });

  it("clears action start_window with explicit null and preserves partial scheduling", async () => {
    const authHeader = await loginAs("admin@northstar.example");

    const response = await request(app.getHttpServer())
      .patch("/api/actions/99999999-9999-9999-9999-999999999999")
      .set(authHeader)
      .send({ start_window: null })
      .expect(200);

    expect(response.body.start_window).toBeNull();
    expect(response.body.end_window).toBe("2026-03-06T12:00:00.000Z");
  });

  it("clears action end_window with explicit null and preserves partial scheduling", async () => {
    const authHeader = await loginAs("admin@northstar.example");

    const response = await request(app.getHttpServer())
      .patch("/api/actions/99999999-9999-9999-9999-999999999999")
      .set(authHeader)
      .send({ end_window: null })
      .expect(200);

    expect(response.body.start_window).toBe("2026-03-06T10:00:00.000Z");
    expect(response.body.end_window).toBeNull();
  });

  it("clears both action windows with explicit null", async () => {
    const authHeader = await loginAs("admin@northstar.example");

    const response = await request(app.getHttpServer())
      .patch("/api/actions/99999999-9999-9999-9999-999999999999")
      .set(authHeader)
      .send({ start_window: null, end_window: null })
      .expect(200);

    expect(response.body.start_window).toBeNull();
    expect(response.body.end_window).toBeNull();
  });

  it("leaves action windows unchanged when fields are omitted", async () => {
    const authHeader = await loginAs("admin@northstar.example");

    const response = await request(app.getHttpServer())
      .patch("/api/actions/99999999-9999-9999-9999-999999999999")
      .set(authHeader)
      .send({ title: "Updated Reel Title" })
      .expect(200);

    expect(response.body.start_window).toBe("2026-03-06T10:00:00.000Z");
    expect(response.body.end_window).toBe("2026-03-06T12:00:00.000Z");
    expect(response.body.title).toBe("Updated Reel Title");
  });
});
