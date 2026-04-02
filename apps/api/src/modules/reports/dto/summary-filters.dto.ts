import { SocialPlatform } from "@prisma/client";
import { IsDateString, IsEnum, IsOptional } from "class-validator";

import { IsLooseUuid } from "../../../common/decorators/is-loose-uuid.decorator";

export class SummaryFiltersDto {
  @IsOptional()
  @IsDateString()
  date_from?: string;

  @IsOptional()
  @IsDateString()
  date_to?: string;

  @IsOptional()
  @IsEnum(SocialPlatform)
  platform?: SocialPlatform;

  @IsOptional()
  @IsLooseUuid()
  campaign_id?: string;

  @IsOptional()
  @IsLooseUuid()
  influencer_id?: string;
}
