import { CampaignStatus } from "@prisma/client";
import { IsEnum, IsOptional, IsString } from "class-validator";
import {
  CAMPAIGN_PLANNER_SCHEDULE_STATES,
  CAMPAIGN_PLANNER_SORT_FIELDS,
  SORT_DIRECTIONS,
} from "@influencer-manager/shared/types/mobile";

import { IsLooseUuid } from "../../../common/decorators/is-loose-uuid.decorator";
import { PaginationQueryDto } from "../../../common/dto/pagination-query.dto";

export class QueryCampaignsDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsLooseUuid()
  company_id?: string;

  @IsOptional()
  @IsLooseUuid()
  client_id?: string;

  @IsOptional()
  @IsEnum(CampaignStatus)
  status?: CampaignStatus;

  @IsOptional()
  @IsEnum(CAMPAIGN_PLANNER_SCHEDULE_STATES)
  schedule_state?: (typeof CAMPAIGN_PLANNER_SCHEDULE_STATES)[number];

  @IsOptional()
  @IsEnum(CAMPAIGN_PLANNER_SORT_FIELDS)
  sort_by?: (typeof CAMPAIGN_PLANNER_SORT_FIELDS)[number];

  @IsOptional()
  @IsEnum(SORT_DIRECTIONS)
  sort_direction?: (typeof SORT_DIRECTIONS)[number];
}
