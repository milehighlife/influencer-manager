import { AssetCategory, AssetSourceType } from "@prisma/client";
import { Type } from "class-transformer";
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
} from "class-validator";

export class CreateCampaignAssetDto {
  @IsString()
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsEnum(AssetSourceType)
  source_type!: AssetSourceType;

  @IsUrl()
  file_url!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  file_name?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  file_size_bytes?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  mime_type?: string;

  @IsOptional()
  @IsEnum(AssetCategory)
  category?: AssetCategory;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sort_order?: number;
}
