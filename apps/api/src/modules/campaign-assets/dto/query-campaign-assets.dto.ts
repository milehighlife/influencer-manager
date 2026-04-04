import { AssetCategory, AssetSourceType } from "@prisma/client";
import { IsEnum, IsOptional } from "class-validator";

import { PaginationQueryDto } from "../../../common/dto/pagination-query.dto";

export class QueryCampaignAssetsDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(AssetCategory)
  category?: AssetCategory;

  @IsOptional()
  @IsEnum(AssetSourceType)
  source_type?: AssetSourceType;
}
