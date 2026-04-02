import { BadRequestException } from "@nestjs/common";
import { describe, expect, it, jest } from "@jest/globals";

import { ActionsService } from "../src/modules/actions/actions.service";

function buildService() {
  const prisma = {
    mission: {
      findFirst: jest.fn<() => Promise<any>>(),
    },
    action: {
      findMany: jest.fn<() => Promise<unknown[]>>().mockResolvedValue([]),
      count: jest.fn<() => Promise<number>>().mockResolvedValue(0),
      findFirst: jest.fn<() => Promise<any>>(),
      create: jest.fn<() => Promise<any>>(),
      update: jest.fn<() => Promise<any>>(),
    },
    $transaction: jest
      .fn<(operations: Array<Promise<unknown>>) => Promise<unknown[]>>()
      .mockImplementation(async (operations) => Promise.all(operations)),
  };

  return {
    prisma,
    service: new ActionsService(prisma as never),
  };
}

describe("ActionsService", () => {
  it("combines mission, campaign, company, and influencer filters for planning queries", async () => {
    const { prisma, service } = buildService();

    await service.findAll("org-1", {
      mission_id: "mission-1",
      campaign_id: "campaign-1",
      company_id: "company-1",
      influencer_id: "influencer-1",
      page: 1,
      limit: 20,
    });

    expect(prisma.action.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organization_id: "org-1",
          mission_id: "mission-1",
          mission: {
            campaign_id: "campaign-1",
            campaign: {
              company_id: "company-1",
            },
          },
          action_assignments: {
            some: {
              influencer_id: "influencer-1",
            },
          },
        }),
      }),
    );
  });

  it("creates an action when its window stays inside the parent mission window", async () => {
    const { prisma, service } = buildService();
    prisma.mission.findFirst.mockResolvedValue({
      id: "mission-1",
      start_date: new Date("2026-03-10T00:00:00.000Z"),
      end_date: new Date("2026-03-18T00:00:00.000Z"),
    });
    prisma.action.findMany.mockResolvedValue([]);
    prisma.action.create.mockResolvedValue({ id: "action-1" });

    await service.create("org-1", {
      mission_id: "mission-1",
      title: "Demo reel",
      platform: "instagram",
      content_format: "reel",
      start_window: "2026-03-10T08:00:00.000Z",
      end_window: "2026-03-18T17:00:00.000Z",
    });

    expect(prisma.action.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          start_window: new Date("2026-03-10T08:00:00.000Z"),
          end_window: new Date("2026-03-18T17:00:00.000Z"),
        }),
      }),
    );
  });

  it("allows same-day alignment with mission boundaries", async () => {
    const { prisma, service } = buildService();
    prisma.mission.findFirst.mockResolvedValue({
      id: "mission-1",
      start_date: new Date("2026-03-10T00:00:00.000Z"),
      end_date: new Date("2026-03-18T00:00:00.000Z"),
    });
    prisma.action.findMany.mockResolvedValue([
      {
        id: "action-0",
        title: "Opening reel",
        start_window: new Date("2026-03-10T08:00:00.000Z"),
        end_window: new Date("2026-03-10T23:59:00.000Z"),
        created_at: new Date("2026-03-01T00:00:00.000Z"),
      },
    ]);
    prisma.action.create.mockResolvedValue({ id: "action-1" });

    await expect(
      service.create("org-1", {
        mission_id: "mission-1",
        title: "Boundary post",
        platform: "instagram",
        content_format: "reel",
        start_window: "2026-03-10T23:59:00.000Z",
        end_window: "2026-03-18T00:01:00.000Z",
      }),
    ).resolves.toEqual({ id: "action-1" });
  });

  it("rejects action windows when start is after end", async () => {
    const { prisma, service } = buildService();
    prisma.mission.findFirst.mockResolvedValue({
      id: "mission-1",
      start_date: new Date("2026-03-10T00:00:00.000Z"),
      end_date: new Date("2026-03-18T00:00:00.000Z"),
    });

    await expect(
      service.create("org-1", {
        mission_id: "mission-1",
        title: "Invalid reel",
        platform: "instagram",
        content_format: "reel",
        start_window: "2026-03-12T12:00:00.000Z",
        end_window: "2026-03-11T12:00:00.000Z",
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it("rejects action windows that begin before the mission starts", async () => {
    const { prisma, service } = buildService();
    prisma.mission.findFirst.mockResolvedValue({
      id: "mission-1",
      start_date: new Date("2026-03-10T00:00:00.000Z"),
      end_date: new Date("2026-03-18T00:00:00.000Z"),
    });

    await expect(
      service.create("org-1", {
        mission_id: "mission-1",
        title: "Early reel",
        platform: "instagram",
        content_format: "reel",
        start_window: "2026-03-09T12:00:00.000Z",
      }),
    ).rejects.toThrow("Action dates must stay within the parent mission window");
  });

  it("rejects action windows that end after the mission ends", async () => {
    const { prisma, service } = buildService();
    prisma.mission.findFirst.mockResolvedValue({
      id: "mission-1",
      start_date: new Date("2026-03-10T00:00:00.000Z"),
      end_date: new Date("2026-03-18T00:00:00.000Z"),
    });

    await expect(
      service.create("org-1", {
        mission_id: "mission-1",
        title: "Late reel",
        platform: "instagram",
        content_format: "reel",
        end_window: "2026-03-19T12:00:00.000Z",
      }),
    ).rejects.toThrow("Action dates must stay within the parent mission window");
  });

  it("preserves partial scheduling when only one valid action boundary is provided", async () => {
    const { prisma, service } = buildService();
    prisma.mission.findFirst.mockResolvedValue({
      id: "mission-1",
      start_date: new Date("2026-03-10T00:00:00.000Z"),
      end_date: new Date("2026-03-18T00:00:00.000Z"),
    });
    prisma.action.create.mockResolvedValue({ id: "action-1" });

    await expect(
      service.create("org-1", {
        mission_id: "mission-1",
        title: "Partial schedule reel",
        platform: "instagram",
        content_format: "reel",
        start_window: "2026-03-11T12:00:00.000Z",
      }),
    ).resolves.toEqual({ id: "action-1" });
  });

  it("rejects overlapping fully scheduled sibling actions on create", async () => {
    const { prisma, service } = buildService();
    prisma.mission.findFirst.mockResolvedValue({
      id: "mission-1",
      start_date: new Date("2026-03-10T00:00:00.000Z"),
      end_date: new Date("2026-03-18T00:00:00.000Z"),
    });
    prisma.action.findMany.mockResolvedValue([
      {
        id: "action-2",
        title: "Launch reel",
        start_window: new Date("2026-03-12T10:00:00.000Z"),
        end_window: new Date("2026-03-12T12:00:00.000Z"),
        created_at: new Date("2026-03-01T00:00:00.000Z"),
      },
    ]);

    await expect(
      service.create("org-1", {
        mission_id: "mission-1",
        title: "Conflict reel",
        platform: "instagram",
        content_format: "reel",
        start_window: "2026-03-12T11:00:00.000Z",
        end_window: "2026-03-12T13:00:00.000Z",
      }),
    ).rejects.toThrow('Action window overlaps with "Launch reel"');
  });

  it("rejects invalid action update windows outside the mission", async () => {
    const { prisma, service } = buildService();
    prisma.action.findFirst.mockResolvedValue({
      id: "action-1",
      mission_id: "mission-1",
      status: "draft",
      start_window: new Date("2026-03-11T12:00:00.000Z"),
      end_window: new Date("2026-03-12T12:00:00.000Z"),
    });
    prisma.mission.findFirst.mockResolvedValue({
      id: "mission-1",
      start_date: new Date("2026-03-10T00:00:00.000Z"),
      end_date: new Date("2026-03-18T00:00:00.000Z"),
    });

    await expect(
      service.update("org-1", "action-1", {
        end_window: "2026-03-19T12:00:00.000Z",
      }),
    ).rejects.toThrow("Action dates must stay within the parent mission window");
  });

  it("allows valid action updates inside the mission window", async () => {
    const { prisma, service } = buildService();
    prisma.action.findFirst.mockResolvedValue({
      id: "action-1",
      mission_id: "mission-1",
      status: "draft",
      start_window: new Date("2026-03-11T12:00:00.000Z"),
      end_window: new Date("2026-03-12T12:00:00.000Z"),
    });
    prisma.mission.findFirst.mockResolvedValue({
      id: "mission-1",
      start_date: new Date("2026-03-10T00:00:00.000Z"),
      end_date: new Date("2026-03-18T00:00:00.000Z"),
    });
    prisma.action.findMany.mockResolvedValue([]);
    prisma.action.update.mockResolvedValue({ id: "action-1" });

    await expect(
      service.update("org-1", "action-1", {
        start_window: "2026-03-10T08:00:00.000Z",
        end_window: "2026-03-18T18:00:00.000Z",
      }),
    ).resolves.toEqual({ id: "action-1" });
  });

  it("rejects overlapping sibling actions on update", async () => {
    const { prisma, service } = buildService();
    prisma.action.findFirst.mockResolvedValue({
      id: "action-1",
      mission_id: "mission-1",
      status: "draft",
      start_window: new Date("2026-03-11T12:00:00.000Z"),
      end_window: new Date("2026-03-11T14:00:00.000Z"),
    });
    prisma.mission.findFirst.mockResolvedValue({
      id: "mission-1",
      start_date: new Date("2026-03-10T00:00:00.000Z"),
      end_date: new Date("2026-03-18T00:00:00.000Z"),
    });
    prisma.action.findMany.mockResolvedValue([
      {
        id: "action-2",
        title: "Existing live window",
        start_window: new Date("2026-03-11T15:00:00.000Z"),
        end_window: new Date("2026-03-11T17:00:00.000Z"),
        created_at: new Date("2026-03-01T00:00:00.000Z"),
      },
    ]);

    await expect(
      service.update("org-1", "action-1", {
        start_window: "2026-03-11T16:00:00.000Z",
        end_window: "2026-03-11T18:00:00.000Z",
      }),
    ).rejects.toThrow('Action window overlaps with "Existing live window"');
  });

  it("persists explicit null clears for action windows", async () => {
    const { prisma, service } = buildService();
    prisma.action.findFirst.mockResolvedValue({
      id: "action-1",
      mission_id: "mission-1",
      status: "draft",
      start_window: new Date("2026-03-11T12:00:00.000Z"),
      end_window: new Date("2026-03-11T14:00:00.000Z"),
    });
    prisma.mission.findFirst.mockResolvedValue({
      id: "mission-1",
      start_date: new Date("2026-03-10T00:00:00.000Z"),
      end_date: new Date("2026-03-18T00:00:00.000Z"),
    });
    prisma.action.update.mockResolvedValue({ id: "action-1" });

    await expect(
      service.update("org-1", "action-1", {
        start_window: null,
        end_window: null,
      }),
    ).resolves.toEqual({ id: "action-1" });

    expect(prisma.action.update).toHaveBeenCalledWith({
      where: { id: "action-1" },
      data: expect.objectContaining({
        start_window: null,
        end_window: null,
      }),
    });
  });
});
