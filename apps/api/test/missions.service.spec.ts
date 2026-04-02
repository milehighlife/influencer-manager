import { BadRequestException } from "@nestjs/common";
import { describe, expect, it, jest } from "@jest/globals";

import { MissionsService } from "../src/modules/missions/missions.service";

function makeCampaign(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "campaign-1",
    organization_id: "org-1",
    start_date: new Date("2026-03-01T00:00:00.000Z"),
    end_date: new Date("2026-03-31T00:00:00.000Z"),
    ...overrides,
  };
}

function makeMission(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "mission-1",
    organization_id: "org-1",
    campaign_id: "campaign-1",
    name: "Awareness",
    description: null,
    sequence_order: 1,
    start_date: new Date("2026-03-01T00:00:00.000Z"),
    end_date: new Date("2026-03-10T00:00:00.000Z"),
    status: "planned",
    created_at: new Date("2026-03-01T00:00:00.000Z"),
    updated_at: new Date("2026-03-01T00:00:00.000Z"),
    ...overrides,
  };
}

describe("MissionsService", () => {
  it("allows same-day handoff between sequential missions", async () => {
    const prisma = {
      campaign: {
        findFirst: jest.fn<() => Promise<unknown>>().mockResolvedValue(makeCampaign()),
      },
      mission: {
        findMany: jest
          .fn<() => Promise<unknown[]>>()
          .mockResolvedValue([
            makeMission({
              id: "mission-1",
              sequence_order: 1,
              start_date: new Date("2026-03-01T00:00:00.000Z"),
              end_date: new Date("2026-03-10T00:00:00.000Z"),
            }),
          ]),
        create: jest.fn<() => Promise<unknown>>().mockResolvedValue({ id: "mission-2" }),
      },
    };

    const service = new MissionsService(prisma as never);

    await expect(
      service.create("org-1", {
        campaign_id: "campaign-1",
        name: "Demo Wave",
        sequence_order: 2,
        start_date: "2026-03-10",
        end_date: "2026-03-15",
      }),
    ).resolves.toMatchObject({ id: "mission-2" });
  });

  it("blocks start dates after end dates", async () => {
    const prisma = {
      campaign: {
        findFirst: jest.fn<() => Promise<unknown>>().mockResolvedValue(makeCampaign()),
      },
    };

    const service = new MissionsService(prisma as never);

    await expect(
      service.create("org-1", {
        campaign_id: "campaign-1",
        name: "Bad dates",
        sequence_order: 1,
        start_date: "2026-03-12",
        end_date: "2026-03-10",
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it("blocks mission dates outside the campaign window", async () => {
    const prisma = {
      campaign: {
        findFirst: jest.fn<() => Promise<unknown>>().mockResolvedValue(makeCampaign()),
      },
    };

    const service = new MissionsService(prisma as never);

    await expect(
      service.create("org-1", {
        campaign_id: "campaign-1",
        name: "Early mission",
        sequence_order: 1,
        start_date: "2026-02-27",
        end_date: "2026-03-05",
      }),
    ).rejects.toThrow("Mission dates must stay within the campaign date window.");
  });

  it("blocks overlap with a previous mission", async () => {
    const prisma = {
      campaign: {
        findFirst: jest.fn<() => Promise<unknown>>().mockResolvedValue(makeCampaign()),
      },
      mission: {
        findMany: jest
          .fn<() => Promise<unknown[]>>()
          .mockResolvedValue([
            makeMission({
              id: "mission-1",
              name: "Awareness",
              sequence_order: 1,
              start_date: new Date("2026-03-01T00:00:00.000Z"),
              end_date: new Date("2026-03-10T00:00:00.000Z"),
            }),
          ]),
      },
    };

    const service = new MissionsService(prisma as never);

    await expect(
      service.create("org-1", {
        campaign_id: "campaign-1",
        name: "Demo Wave",
        sequence_order: 2,
        start_date: "2026-03-09",
        end_date: "2026-03-15",
      }),
    ).rejects.toThrow(
      'Mission dates overlap with "Awareness" from 2026-03-01 to 2026-03-10.',
    );
  });

  it("blocks overlap with a next mission during update", async () => {
    const prisma = {
      campaign: {
        findFirst: jest.fn<() => Promise<unknown>>().mockResolvedValue(makeCampaign()),
      },
      mission: {
        findFirst: jest
          .fn<() => Promise<unknown>>()
          .mockResolvedValue(
            makeMission({
              id: "mission-1",
              sequence_order: 1,
              start_date: new Date("2026-03-01T00:00:00.000Z"),
              end_date: new Date("2026-03-10T00:00:00.000Z"),
            }),
          ),
        findMany: jest
          .fn<() => Promise<unknown[]>>()
          .mockResolvedValue([
            makeMission({
              id: "mission-2",
              name: "Product Demo Series",
              sequence_order: 2,
              start_date: new Date("2026-03-15T00:00:00.000Z"),
              end_date: new Date("2026-03-18T00:00:00.000Z"),
            }),
          ]),
      },
    };

    const service = new MissionsService(prisma as never);

    await expect(
      service.update("org-1", "mission-1", {
        end_date: "2026-03-16",
      }),
    ).rejects.toThrow(
      'Mission dates overlap with "Product Demo Series" from 2026-03-15 to 2026-03-18.',
    );
  });

  it("blocks sequence conflicts caused by resequencing", async () => {
    const prisma = {
      campaign: {
        findFirst: jest.fn<() => Promise<unknown>>().mockResolvedValue(makeCampaign()),
      },
      mission: {
        findFirst: jest
          .fn<() => Promise<unknown>>()
          .mockResolvedValue(
            makeMission({
              id: "mission-2",
              name: "Product Demo Series",
              sequence_order: 2,
              start_date: new Date("2026-03-20T00:00:00.000Z"),
              end_date: new Date("2026-03-25T00:00:00.000Z"),
            }),
          ),
        findMany: jest
          .fn<() => Promise<unknown[]>>()
          .mockResolvedValue([
            makeMission({
              id: "mission-1",
              name: "Awareness",
              sequence_order: 1,
              start_date: new Date("2026-03-01T00:00:00.000Z"),
              end_date: new Date("2026-03-10T00:00:00.000Z"),
            }),
          ]),
      },
    };

    const service = new MissionsService(prisma as never);

    await expect(
      service.update("org-1", "mission-2", {
        sequence_order: 0,
      }),
    ).rejects.toThrow(
      'Mission sequence conflicts with "Awareness". Earlier missions must finish before later missions begin.',
    );
  });

  it("allows valid non-overlapping ordered mission updates", async () => {
    const prisma = {
      campaign: {
        findFirst: jest.fn<() => Promise<unknown>>().mockResolvedValue(makeCampaign()),
      },
      mission: {
        findFirst: jest
          .fn<() => Promise<unknown>>()
          .mockResolvedValue(
            makeMission({
              id: "mission-2",
              name: "Product Demo Series",
              sequence_order: 2,
              start_date: new Date("2026-03-12T00:00:00.000Z"),
              end_date: new Date("2026-03-18T00:00:00.000Z"),
            }),
          ),
        findMany: jest
          .fn<() => Promise<unknown[]>>()
          .mockResolvedValue([
            makeMission({
              id: "mission-1",
              name: "Awareness",
              sequence_order: 1,
              start_date: new Date("2026-03-01T00:00:00.000Z"),
              end_date: new Date("2026-03-10T00:00:00.000Z"),
            }),
            makeMission({
              id: "mission-3",
              name: "Conversion Push",
              sequence_order: 3,
              start_date: new Date("2026-03-18T00:00:00.000Z"),
              end_date: new Date("2026-03-24T00:00:00.000Z"),
            }),
          ]),
        update: jest.fn<() => Promise<unknown>>().mockResolvedValue({ id: "mission-2" }),
      },
    };

    const service = new MissionsService(prisma as never);

    await expect(
      service.update("org-1", "mission-2", {
        start_date: "2026-03-10",
        end_date: "2026-03-18",
      }),
    ).resolves.toMatchObject({ id: "mission-2" });
  });

  it("persists explicit null clears for mission dates", async () => {
    const prisma = {
      campaign: {
        findFirst: jest.fn<() => Promise<unknown>>().mockResolvedValue(makeCampaign()),
      },
      mission: {
        findFirst: jest.fn<() => Promise<unknown>>().mockResolvedValue(makeMission()),
        findMany: jest.fn<() => Promise<unknown[]>>().mockResolvedValue([]),
        update: jest.fn<() => Promise<unknown>>().mockResolvedValue({ id: "mission-1" }),
      },
    };

    const service = new MissionsService(prisma as never);

    await expect(
      service.update("org-1", "mission-1", {
        start_date: null,
        end_date: null,
      }),
    ).resolves.toMatchObject({ id: "mission-1" });

    expect(prisma.mission.update).toHaveBeenCalledWith({
      where: { id: "mission-1" },
      data: expect.objectContaining({
        start_date: null,
        end_date: null,
      }),
    });
  });
});
