import { AssetSourceType } from "@prisma/client";
import { IsEnum, IsOptional, IsString } from "class-validator";

import { PaginationQueryDto } from "../../../common/dto/pagination-query.dto";
import { IsLooseUuid } from "../../../common/decorators/is-loose-uuid.decorator";

export class QueryClientAssetsDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsLooseUuid()
  company_id?: string;

  @IsOptional()
  @IsLooseUuid()
  campaign_id?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsEnum(AssetSourceType)
  source_type?: AssetSourceType;

  @IsOptional()
  @IsString()
  start_date?: string;

  @IsOptional()
  @IsString()
  end_date?: string;

  @IsOptional()
  @IsString()
  sort_by?: string;

  @IsOptional()
  @IsString()
  sort_direction?: string;
}
