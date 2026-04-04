import { BadRequestException } from "@nestjs/common";
import { describe, expect, it, jest } from "@jest/globals";

import { CampaignsService } from "../src/modules/campaigns/campaigns.service";

describe("CampaignsService", () => {
  it("builds a planner list read model with company context and mission stats", async () => {
    const prisma = {
      campaign: {
        findMany: jest.fn<() => Promise<unknown[]>>().mockResolvedValue([
          {
            id: "campaign-1",
            company_id: "company-1",
            name: "Spring Launch",
            status: "planned",
            start_date: new Date("2026-03-01T00:00:00.000Z"),
            end_date: new Date("2026-03-31T00:00:00.000Z"),
            created_at: new Date("2026-02-20T00:00:00.000Z"),
            updated_at: new Date("2026-02-21T00:00:00.000Z"),
            company: {
              id: "company-1",
              name: "Glow Labs",
              client_id: "client-1",
              client: {
                id: "client-1",
                name: "Northstar Retail",
              },
            },
          },
        ]),
        count: jest.fn<() => Promise<number>>().mockResolvedValue(1),
      },
      $transaction: jest.fn<() => Promise<[unknown, number]>>(),
      mission: {
        findMany: jest.fn<() => Promise<unknown[]>>().mockResolvedValue([
          {
            campaign_id: "campaign-1",
            start_date: new Date("2026-03-01T00:00:00.000Z"),
            end_date: new Date("2026-03-10T00:00:00.000Z"),
          },
          {
            campaign_id: "campaign-1",
            start_date: new Date("2026-03-12T00:00:00.000Z"),
            end_date: null,
          },
          {
            campaign_id: "campaign-1",
            start_date: null,
            end_date: null,
          },
        ]),
      },
    };

    (prisma.$transaction as jest.Mock).mockImplementation(
      async (...args: any[]) =>
        Promise.all(args[0] as Array<Promise<unknown>>) as Promise<[unknown, number]>,
    );

    const service = new CampaignsService(prisma as never, { logUserEvent: jest.fn() } as never);
    const result = await service.findPlannerList("org-1", { page: 1, limit: 20 });

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(prisma.mission.findMany).toHaveBeenCalledWith({
      where: {
        organization_id: "org-1",
        campaign_id: {
          in: ["campaign-1"],
        },
      },
      select: {
        campaign_id: true,
        start_date: true,
        end_date: true,
      },
    });
    expect(result.data[0]).toMatchObject({
      id: "campaign-1",
      name: "Spring Launch",
      company: {
        id: "company-1",
        name: "Glow Labs",
        client_id: "client-1",
        client_name: "Northstar Retail",
      },
      mission_count: 3,
      scheduled_mission_count: 1,
      partial_mission_count: 1,
      unscheduled_mission_count: 1,
    });
  });

  it("builds a frontend-friendly planning view with nested assignments", async () => {
    const prisma = {
      campaign: {
        findFirst: jest.fn<() => Promise<unknown>>().mockResolvedValue({
          id: "campaign-1",
          organization_id: "org-1",
          name: "Spring Launch",
          company_id: "company-1",
          campaign_type: "product_launch",
          status: "planned",
          description: null,
          start_date: null,
          end_date: null,
          budget: null,
          created_at: new Date("2026-03-01T00:00:00.000Z"),
          updated_at: new Date("2026-03-01T00:00:00.000Z"),
          company: {
            id: "company-1",
            client_id: "client-1",
            name: "Glow Labs",
            description: null,
            status: "active",
            created_at: new Date("2026-03-01T00:00:00.000Z"),
            updated_at: new Date("2026-03-01T00:00:00.000Z"),
          },
          missions: [
            {
              id: "mission-1",
              organization_id: "org-1",
              campaign_id: "campaign-1",
              name: "Awareness",
              description: null,
              sequence_order: 1,
              status: "planned",
              start_date: null,
              end_date: null,
              created_at: new Date("2026-03-01T00:00:00.000Z"),
              updated_at: new Date("2026-03-01T00:00:00.000Z"),
              actions: [
                {
                  id: "action-1",
                  organization_id: "org-1",
                  mission_id: "mission-1",
                  title: "Instagram Reel",
                  platform: "instagram",
                  instructions: null,
                  content_format: "reel",
                  required_deliverables: 1,
                  approval_required: true,
                  start_window: null,
                  end_window: null,
                  status: "scheduled",
                  created_at: new Date("2026-03-01T00:00:00.000Z"),
                  updated_at: new Date("2026-03-01T00:00:00.000Z"),
                  action_assignments: [
                    {
                      id: "assignment-1",
                      organization_id: "org-1",
                      action_id: "action-1",
                      influencer_id: "influencer-1",
                      assignment_status: "assigned",
                      assigned_at: new Date("2026-03-02T00:00:00.000Z"),
                      due_date: null,
                      completion_date: null,
                      deliverable_count_expected: 1,
                      deliverable_count_submitted: 0,
                      created_at: new Date("2026-03-02T00:00:00.000Z"),
                      updated_at: new Date("2026-03-02T00:00:00.000Z"),
                      influencer: {
                        id: "influencer-1",
                        name: "Ari Lane",
                        email: "ari@example.com",
                        primary_platform: "instagram",
                        location: "Los Angeles",
                        status: "active",
                      },
                    },
                  ],
                },
              ],
            },
          ],
        }),
      },
    };

    const service = new CampaignsService(prisma as never, { logUserEvent: jest.fn() } as never);
    const result = await service.getPlanningView("org-1", "campaign-1");

    expect(prisma.campaign.findFirst).toHaveBeenCalled();
    expect(result.missions).toHaveLength(1);
    expect(result.missions[0].actions[0]).not.toHaveProperty("action_assignments");
    expect(result.missions[0].actions[0].assignments[0]).toMatchObject({
      id: "assignment-1",
      influencer_summary: {
        id: "influencer-1",
        name: "Ari Lane",
      },
    });
    expect(result.missions[0].actions[0].assignments[0]).not.toHaveProperty(
      "influencer",
    );
  });

  it("applies planner-list pagination, sorting, and filter constraints in one query", async () => {
    const prisma = {
      campaign: {
        findMany: jest.fn<() => Promise<unknown[]>>().mockResolvedValue([]),
        count: jest.fn<() => Promise<number>>().mockResolvedValue(0),
      },
      $transaction: jest.fn<() => Promise<[unknown, number]>>(),
      mission: {
        findMany: jest.fn<() => Promise<unknown[]>>().mockResolvedValue([]),
      },
    };

    (prisma.$transaction as jest.Mock).mockImplementation(
      async (...args: any[]) =>
        Promise.all(args[0] as Array<Promise<unknown>>) as Promise<[unknown, number]>,
    );

    const service = new CampaignsService(prisma as never, { logUserEvent: jest.fn() } as never);
    await service.findPlannerList("org-1", {
      page: 2,
      limit: 10,
      company_id: "company-1",
      client_id: "client-1",
      status: "planned",
      sort_by: "name",
      sort_direction: "asc",
    });

    expect(prisma.campaign.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organization_id: "org-1",
          AND: [
            { company_id: "company-1" },
            {
              company: {
                is: {
                  client_id: "client-1",
                },
              },
            },
            { status: "planned" },
          ],
        },
        skip: 10,
        take: 10,
        orderBy: [{ name: "asc" }, { updated_at: "desc" }, { id: "asc" }],
      }),
    );
    expect(prisma.campaign.count).toHaveBeenCalledWith({
      where: {
        organization_id: "org-1",
        AND: [
          { company_id: "company-1" },
          {
            company: {
              is: {
                client_id: "client-1",
              },
            },
          },
          { status: "planned" },
        ],
      },
    });
  });

  it("adds server-side text search across campaign, company, and client names", async () => {
    const prisma = {
      campaign: {
        findMany: jest.fn<() => Promise<unknown[]>>().mockResolvedValue([]),
        count: jest.fn<() => Promise<number>>().mockResolvedValue(0),
      },
      $transaction: jest.fn<() => Promise<[unknown, number]>>(),
      mission: {
        findMany: jest.fn<() => Promise<unknown[]>>().mockResolvedValue([]),
      },
    };

    (prisma.$transaction as jest.Mock).mockImplementation(
      async (...args: any[]) =>
        Promise.all(args[0] as Array<Promise<unknown>>) as Promise<[unknown, number]>,
    );

    const service = new CampaignsService(prisma as never, { logUserEvent: jest.fn() } as never);
    await service.findPlannerList("org-1", {
      page: 1,
      limit: 20,
      search: "northstar",
      sort_by: "updated_at",
      sort_direction: "desc",
    });

    expect(prisma.campaign.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organization_id: "org-1",
          AND: [
            {
              OR: [
                {
                  name: {
                    contains: "northstar",
                    mode: "insensitive",
                  },
                },
                {
                  company: {
                    is: {
                      name: {
                        contains: "northstar",
                        mode: "insensitive",
                      },
                    },
                  },
                },
                {
                  company: {
                    is: {
                      client: {
                        is: {
                          name: {
                            contains: "northstar",
                            mode: "insensitive",
                          },
                        },
                      },
                    },
                  },
                },
              ],
            },
          ],
        },
        orderBy: [{ updated_at: "desc" }, { id: "asc" }],
      }),
    );
  });

  it("filters planner-list campaigns to fully scheduled mission plans", async () => {
    const prisma = {
      campaign: {
        findMany: jest.fn<() => Promise<unknown[]>>().mockResolvedValue([]),
        count: jest.fn<() => Promise<number>>().mockResolvedValue(0),
      },
      $transaction: jest.fn<() => Promise<[unknown, number]>>(),
      mission: {
        findMany: jest.fn<() => Promise<unknown[]>>().mockResolvedValue([]),
      },
    };

    (prisma.$transaction as jest.Mock).mockImplementation(
      async (...args: any[]) =>
        Promise.all(args[0] as Array<Promise<unknown>>) as Promise<[unknown, number]>,
    );

    const service = new CampaignsService(prisma as never, { logUserEvent: jest.fn() } as never);
    await service.findPlannerList("org-1", {
      page: 1,
      limit: 20,
      schedule_state: "scheduled",
    });

    expect(prisma.campaign.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organization_id: "org-1",
          AND: [
            {
              missions: {
                some: {},
                every: {
                  start_date: { not: null },
                  end_date: { not: null },
                },
              },
            },
          ],
        },
      }),
    );
  });

  it("filters planner-list campaigns to unscheduled mission plans including zero-mission campaigns", async () => {
    const prisma = {
      campaign: {
        findMany: jest.fn<() => Promise<unknown[]>>().mockResolvedValue([]),
        count: jest.fn<() => Promise<number>>().mockResolvedValue(0),
      },
      $transaction: jest.fn<() => Promise<[unknown, number]>>(),
      mission: {
        findMany: jest.fn<() => Promise<unknown[]>>().mockResolvedValue([]),
      },
    };

    (prisma.$transaction as jest.Mock).mockImplementation(
      async (...args: any[]) =>
        Promise.all(args[0] as Array<Promise<unknown>>) as Promise<[unknown, number]>,
    );

    const service = new CampaignsService(prisma as never, { logUserEvent: jest.fn() } as never);
    await service.findPlannerList("org-1", {
      page: 1,
      limit: 20,
      schedule_state: "unscheduled",
      status: "draft",
      search: "launch",
    });

    const where = ((prisma.campaign.findMany as jest.Mock).mock.calls[0][0] as any)
      .where;
    expect(prisma.campaign.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organization_id: "org-1",
        }),
      }),
    );
    expect(where.AND).toEqual(
      expect.arrayContaining([
        { status: "draft" },
        {
          OR: [
            {
              name: {
                contains: "launch",
                mode: "insensitive",
              },
            },
            {
              company: {
                is: {
                  name: {
                    contains: "launch",
                    mode: "insensitive",
                  },
                },
              },
            },
            {
              company: {
                is: {
                  client: {
                    is: {
                      name: {
                        contains: "launch",
                        mode: "insensitive",
                      },
                    },
                  },
                },
              },
            },
          ],
        },
        {
          OR: [
            {
              missions: {
                none: {},
              },
            },
            {
              missions: {
                some: {},
                every: {
                  start_date: null,
                  end_date: null,
                },
              },
            },
          ],
        },
      ]),
    );
  });

  it("filters planner-list campaigns to partially scheduled mission plans", async () => {
    const prisma = {
      campaign: {
        findMany: jest.fn<() => Promise<unknown[]>>().mockResolvedValue([]),
        count: jest.fn<() => Promise<number>>().mockResolvedValue(0),
      },
      $transaction: jest.fn<() => Promise<[unknown, number]>>(),
      mission: {
        findMany: jest.fn<() => Promise<unknown[]>>().mockResolvedValue([]),
      },
    };

    (prisma.$transaction as jest.Mock).mockImplementation(
      async (...args: any[]) =>
        Promise.all(args[0] as Array<Promise<unknown>>) as Promise<[unknown, number]>,
    );

    const service = new CampaignsService(prisma as never, { logUserEvent: jest.fn() } as never);
    await service.findPlannerList("org-1", {
      page: 1,
      limit: 20,
      schedule_state: "partial",
    });

    expect(prisma.campaign.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organization_id: "org-1",
          AND: [
            {
              AND: [
                {
                  missions: {
                    some: {},
                  },
                },
                {
                  NOT: {
                    missions: {
                      some: {},
                      every: {
                        start_date: { not: null },
                        end_date: { not: null },
                      },
                    },
                  },
                },
                {
                  NOT: {
                    missions: {
                      some: {},
                      every: {
                        start_date: null,
                        end_date: null,
                      },
                    },
                  },
                },
              ],
            },
          ],
        },
      }),
    );
  });

  it("rejects campaigns when start date is after end date", async () => {
    const prisma = {
      company: {
        findFirst: jest.fn<() => Promise<unknown>>().mockResolvedValue({ id: "company-1" }),
      },
    };

    const service = new CampaignsService(prisma as never, { logUserEvent: jest.fn() } as never);

    await expect(
      service.create("org-1", {
        company_id: "company-1",
        name: "Invalid campaign",
        campaign_type: "product_launch",
        start_date: "2026-03-20",
        end_date: "2026-03-10",
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it("blocks campaign window updates that exclude an existing mission", async () => {
    const prisma = {
      campaign: {
        findFirst: jest.fn<() => Promise<unknown>>().mockResolvedValue({
          id: "campaign-1",
          organization_id: "org-1",
          company_id: "company-1",
          name: "Spring Launch",
          status: "planned",
          start_date: new Date("2026-03-01T00:00:00.000Z"),
          end_date: new Date("2026-03-31T00:00:00.000Z"),
        }),
      },
      mission: {
        findMany: jest.fn<() => Promise<unknown[]>>().mockResolvedValue([
          {
            id: "mission-1",
            name: "Awareness",
            start_date: new Date("2026-03-05T00:00:00.000Z"),
            end_date: new Date("2026-03-12T00:00:00.000Z"),
          },
        ]),
      },
    };

    const service = new CampaignsService(prisma as never, { logUserEvent: jest.fn() } as never);

    await expect(
      service.update("org-1", "campaign-1", {
        start_date: "2026-03-10",
      }),
    ).rejects.toThrow(
      'Campaign dates must include mission "Awareness" from 2026-03-05 to 2026-03-12.',
    );
  });

  it("persists explicit null clears for campaign dates", async () => {
    const prisma = {
      campaign: {
        findFirst: jest.fn<() => Promise<unknown>>().mockResolvedValue({
          id: "campaign-1",
          organization_id: "org-1",
          company_id: "company-1",
          name: "Spring Launch",
          status: "planned",
          start_date: new Date("2026-03-01T00:00:00.000Z"),
          end_date: new Date("2026-03-31T00:00:00.000Z"),
        }),
        update: jest.fn<() => Promise<unknown>>().mockResolvedValue({ id: "campaign-1" }),
      },
      mission: {
        findMany: jest.fn<() => Promise<unknown[]>>().mockResolvedValue([]),
      },
    };

    const service = new CampaignsService(prisma as never, { logUserEvent: jest.fn() } as never);

    await expect(
      service.update("org-1", "campaign-1", {
        start_date: null,
        end_date: null,
      }),
    ).resolves.toEqual({ id: "campaign-1" });

    expect(prisma.campaign.update).toHaveBeenCalledWith({
      where: { id: "campaign-1" },
      data: expect.objectContaining({
        start_date: null,
        end_date: null,
      }),
    });
  });
});
