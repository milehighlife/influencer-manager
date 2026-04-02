import { ActionStatus } from "@prisma/client";
import { IsEnum, IsOptional } from "class-validator";

import { IsLooseUuid } from "../../../common/decorators/is-loose-uuid.decorator";
import { PaginationQueryDto } from "../../../common/dto/pagination-query.dto";

export class QueryActionsDto extends PaginationQueryDto {
  @IsOptional()
  @IsLooseUuid()
  mission_id?: string;

  @IsOptional()
  @IsLooseUuid()
  campaign_id?: string;

  @IsOptional()
  @IsLooseUuid()
  company_id?: string;

  @IsOptional()
  @IsLooseUuid()
  influencer_id?: string;

  @IsOptional()
  @IsEnum(ActionStatus)
  status?: ActionStatus;
}
