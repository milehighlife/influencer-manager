import { InfluencerStatus, SocialPlatform } from "@prisma/client";
import { IsEnum, IsOptional, IsString } from "class-validator";
import {
  INFLUENCER_SORT_FIELDS,
  SORT_DIRECTIONS,
} from "@influencer-manager/shared/types/mobile";

import { PaginationQueryDto } from "../../../common/dto/pagination-query.dto";

export class QueryInfluencersDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(SocialPlatform)
  primary_platform?: SocialPlatform;

  @IsOptional()
  @IsEnum(InfluencerStatus)
  status?: InfluencerStatus;

  @IsOptional()
  @IsEnum(INFLUENCER_SORT_FIELDS)
  sort_by?: (typeof INFLUENCER_SORT_FIELDS)[number];

  @IsOptional()
  @IsEnum(SORT_DIRECTIONS)
  sort_direction?: (typeof SORT_DIRECTIONS)[number];
}
