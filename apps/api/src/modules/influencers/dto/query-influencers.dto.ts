import { InfluencerStatus, SocialPlatform } from "@prisma/client";
import { IsEnum, IsOptional, IsString } from "class-validator";

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
}
