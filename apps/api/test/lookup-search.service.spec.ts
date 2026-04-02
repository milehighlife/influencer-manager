import { describe, expect, it, jest } from "@jest/globals";

import { ClientsService } from "../src/modules/clients/clients.service";
import { CompaniesService } from "../src/modules/companies/companies.service";
import { InfluencersService } from "../src/modules/influencers/influencers.service";

describe("lookup search services", () => {
  it("applies client name search with deterministic ordering", async () => {
    const prisma = {
      client: {
        findMany: jest.fn<() => Promise<unknown[]>>().mockResolvedValue([]),
        count: jest.fn<() => Promise<number>>().mockResolvedValue(0),
      },
      $transaction: jest.fn<() => Promise<[unknown, number]>>(),
    };

    (prisma.$transaction as jest.Mock).mockImplementation(
      async (...args: any[]) =>
        Promise.all(args[0] as Array<Promise<unknown>>) as Promise<[unknown, number]>,
    );

    const service = new ClientsService(prisma as never);
    await service.findAll("org-1", {
      page: 1,
      limit: 20,
      search: "north",
    } as never);

    expect(prisma.client.findMany).toHaveBeenCalledWith({
      where: {
        organization_id: "org-1",
        name: {
          contains: "north",
          mode: "insensitive",
        },
      },
      skip: 0,
      take: 20,
      orderBy: [{ name: "asc" }, { created_at: "desc" }],
    });
  });

  it("applies company search alongside client scoping", async () => {
    const prisma = {
      company: {
        findMany: jest.fn<() => Promise<unknown[]>>().mockResolvedValue([]),
        count: jest.fn<() => Promise<number>>().mockResolvedValue(0),
      },
      $transaction: jest.fn<() => Promise<[unknown, number]>>(),
    };

    (prisma.$transaction as jest.Mock).mockImplementation(
      async (...args: any[]) =>
        Promise.all(args[0] as Array<Promise<unknown>>) as Promise<[unknown, number]>,
    );

    const service = new CompaniesService(prisma as never);
    await service.findAll("org-1", {
      page: 1,
      limit: 20,
      client_id: "client-1",
      search: "shoe",
    } as never);

    expect(prisma.company.findMany).toHaveBeenCalledWith({
      where: {
        organization_id: "org-1",
        client_id: "client-1",
        name: {
          contains: "shoe",
          mode: "insensitive",
        },
      },
      skip: 0,
      take: 20,
      orderBy: [{ name: "asc" }, { created_at: "desc" }],
    });
  });

  it("applies influencer lookup search across creator identity fields", async () => {
    const prisma = {
      influencer: {
        findMany: jest.fn<() => Promise<unknown[]>>().mockResolvedValue([]),
        count: jest.fn<() => Promise<number>>().mockResolvedValue(0),
      },
      $transaction: jest.fn<() => Promise<[unknown, number]>>(),
    };

    (prisma.$transaction as jest.Mock).mockImplementation(
      async (...args: any[]) =>
        Promise.all(args[0] as Array<Promise<unknown>>) as Promise<[unknown, number]>,
    );

    const service = new InfluencersService(prisma as never);
    await service.findAll("org-1", {
      page: 1,
      limit: 20,
      search: "nina",
    } as never);

    expect(prisma.influencer.findMany).toHaveBeenCalledWith({
      where: {
        organization_id: "org-1",
        OR: [
          {
            name: {
              contains: "nina",
              mode: "insensitive",
            },
          },
          {
            audience_description: {
              contains: "nina",
              mode: "insensitive",
            },
          },
          {
            email: {
              contains: "nina",
              mode: "insensitive",
            },
          },
          {
            location: {
              contains: "nina",
              mode: "insensitive",
            },
          },
        ],
      },
      skip: 0,
      take: 20,
      orderBy: [{ name: "asc" }, { created_at: "desc" }],
    });
  });
});
