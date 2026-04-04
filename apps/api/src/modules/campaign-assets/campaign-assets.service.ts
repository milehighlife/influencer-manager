import { Injectable, NotFoundException } from "@nestjs/common";
import type { AssetCategory, Prisma } from "@prisma/client";

import {
  buildPaginatedResponse,
  getPagination,
} from "../../common/utils/pagination.util";
import { PrismaService } from "../../database/prisma.service";
import { CreateCampaignAssetDto } from "./dto/create-campaign-asset.dto";
import { QueryCampaignAssetsDto } from "./dto/query-campaign-assets.dto";
import { QueryClientAssetsDto } from "./dto/query-client-assets.dto";
import { UpdateCampaignAssetDto } from "./dto/update-campaign-asset.dto";

const DOMAIN_SERVICE_MAP: Record<string, string> = {
  "drive.google.com": "google_drive",
  "docs.google.com": "google_drive",
  "dropbox.com": "dropbox",
  "box.com": "box",
  "app.box.com": "box",
  "figma.com": "figma",
  "canva.com": "canva",
  "onedrive.live.com": "onedrive",
  "1drv.ms": "onedrive",
};

@Injectable()
export class CampaignAssetsService {
  constructor(private readonly prisma: PrismaService) {}

  detectLinkDomain(url: string): string {
    try {
      const hostname = new URL(url).hostname.replace(/^www\./, "");
      for (const [domain, service] of Object.entries(DOMAIN_SERVICE_MAP)) {
        if (hostname === domain || hostname.endsWith(`.${domain}`)) {
          return service;
        }
      }
      return "generic";
    } catch {
      return "generic";
    }
  }

  private async findCampaignOrFail(organizationId: string, campaignId: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id: campaignId, organization_id: organizationId },
      select: { id: true, company_id: true, company: { select: { client_id: true } } },
    });

    if (!campaign) {
      throw new NotFoundException("Campaign not found.");
    }

    return campaign;
  }

  private async findAssetOrFail(
    organizationId: string,
    campaignId: string,
    assetId: string,
  ) {
    const asset = await this.prisma.campaignAsset.findFirst({
      where: {
        id: assetId,
        organization_id: organizationId,
        campaign_id: campaignId,
      },
    });

    if (!asset) {
      throw new NotFoundException("Campaign asset not found.");
    }

    return asset;
  }

  async create(
    organizationId: string,
    campaignId: string,
    userId: string,
    dto: CreateCampaignAssetDto,
  ) {
    const campaign = await this.findCampaignOrFail(organizationId, campaignId);

    return this.prisma.campaignAsset.create({
      data: {
        organization_id: organizationId,
        campaign_id: campaignId,
        client_id: campaign.company.client_id,
        company_id: campaign.company_id,
        uploaded_by_id: userId,
        ...dto,
      },
      include: {
        action_links: true,
      },
    });
  }

  async findAll(
    organizationId: string,
    campaignId: string,
    query: QueryCampaignAssetsDto,
  ) {
    await this.findCampaignOrFail(organizationId, campaignId);

    const { page, limit, skip, take } = getPagination(query);

    const where: Prisma.CampaignAssetWhereInput = {
      organization_id: organizationId,
      campaign_id: campaignId,
    };

    if (query.category) {
      where.category = query.category;
    }

    if (query.source_type) {
      where.source_type = query.source_type;
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.campaignAsset.findMany({
        where,
        skip,
        take,
        orderBy: [{ sort_order: "asc" }, { created_at: "desc" }],
        include: {
          action_links: true,
        },
      }),
      this.prisma.campaignAsset.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, page, limit);
  }

  async update(
    organizationId: string,
    campaignId: string,
    assetId: string,
    dto: UpdateCampaignAssetDto,
  ) {
    await this.findAssetOrFail(organizationId, campaignId, assetId);

    return this.prisma.campaignAsset.update({
      where: { id: assetId },
      data: dto,
      include: {
        action_links: true,
      },
    });
  }

  async remove(organizationId: string, campaignId: string, assetId: string) {
    await this.findAssetOrFail(organizationId, campaignId, assetId);
    await this.prisma.campaignAsset.delete({ where: { id: assetId } });

    return { id: assetId };
  }

  async linkActions(
    organizationId: string,
    campaignId: string,
    assetId: string,
    actionIds: string[],
  ) {
    await this.findAssetOrFail(organizationId, campaignId, assetId);

    await this.prisma.$transaction([
      this.prisma.campaignAssetAction.deleteMany({
        where: { campaign_asset_id: assetId },
      }),
      ...(actionIds.length > 0
        ? [
            this.prisma.campaignAssetAction.createMany({
              data: actionIds.map((action_id) => ({
                campaign_asset_id: assetId,
                action_id,
              })),
            }),
          ]
        : []),
    ]);

    return this.prisma.campaignAsset.findUnique({
      where: { id: assetId },
      include: { action_links: true },
    });
  }

  async reorder(
    organizationId: string,
    campaignId: string,
    items: Array<{ id: string; sort_order: number }>,
  ) {
    await this.findCampaignOrFail(organizationId, campaignId);

    await this.prisma.$transaction(
      items.map((item) =>
        this.prisma.campaignAsset.updateMany({
          where: {
            id: item.id,
            organization_id: organizationId,
            campaign_id: campaignId,
          },
          data: { sort_order: item.sort_order },
        }),
      ),
    );

    return { updated: items.length };
  }

  async findClientAssets(
    organizationId: string,
    clientId: string,
    query: QueryClientAssetsDto,
  ) {
    const client = await this.prisma.client.findFirst({
      where: { id: clientId, organization_id: organizationId },
    });

    if (!client) {
      throw new NotFoundException("Client not found.");
    }

    const { page, limit, skip, take } = getPagination(query);
    const filters: Prisma.CampaignAssetWhereInput[] = [];

    filters.push({
      organization_id: organizationId,
      client_id: clientId,
    });

    if (query.company_id) {
      filters.push({ company_id: query.company_id });
    }

    if (query.campaign_id) {
      filters.push({ campaign_id: query.campaign_id });
    }

    if (query.category) {
      const categories = query.category
        .split(",")
        .map((c) => c.trim())
        .filter((c) => c) as AssetCategory[];
      if (categories.length > 0) {
        filters.push({ category: { in: categories } });
      }
    }

    if (query.source_type) {
      filters.push({ source_type: query.source_type });
    }

    if (query.start_date) {
      filters.push({ created_at: { gte: new Date(query.start_date) } });
    }

    if (query.end_date) {
      filters.push({ created_at: { lte: new Date(query.end_date) } });
    }

    if (query.search) {
      const search = query.search.trim();
      filters.push({
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { file_name: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
          { tags: { has: search } },
          {
            campaign: {
              is: { name: { contains: search, mode: "insensitive" } },
            },
          },
          {
            company: {
              is: { name: { contains: search, mode: "insensitive" } },
            },
          },
        ],
      });
    }

    const where: Prisma.CampaignAssetWhereInput = { AND: filters };

    const sortBy = query.sort_by ?? "created_at";
    const sortDirection = query.sort_direction === "asc" ? "asc" : "desc";
    const orderBy: Prisma.CampaignAssetOrderByWithRelationInput =
      sortBy === "name"
        ? { name: sortDirection }
        : sortBy === "file_size_bytes"
          ? { file_size_bytes: sortDirection }
          : sortBy === "sort_order"
            ? { sort_order: sortDirection }
            : { created_at: sortDirection };

    const [data, total, aggregation] = await this.prisma.$transaction([
      this.prisma.campaignAsset.findMany({
        where,
        skip,
        take,
        orderBy: [orderBy, { id: "asc" }],
        include: {
          campaign: { select: { id: true, name: true } },
          company: { select: { id: true, name: true } },
          action_links: true,
        },
      }),
      this.prisma.campaignAsset.count({ where }),
      this.prisma.campaignAsset.aggregate({
        where,
        _count: { id: true },
        _sum: { file_size_bytes: true },
      }),
    ]);

    const items = data.map((asset) => ({
      ...asset,
      campaign_name: asset.campaign.name,
      company_name: asset.company.name,
    }));

    return {
      ...buildPaginatedResponse(items, total, page, limit),
      summary: {
        total_assets: aggregation._count.id,
        total_file_size: aggregation._sum.file_size_bytes ?? 0,
      },
    };
  }
}
