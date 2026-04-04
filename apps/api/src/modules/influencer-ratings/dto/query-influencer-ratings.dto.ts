import { IsOptional } from "class-validator";

import { IsLooseUuid } from "../../../common/decorators/is-loose-uuid.decorator";
import { PaginationQueryDto } from "../../../common/dto/pagination-query.dto";

export class QueryInfluencerRatingsDto extends PaginationQueryDto {
  @IsOptional()
  @IsLooseUuid()
  campaign_id?: string;

  @IsOptional()
  @IsLooseUuid()
  influencer_id?: string;

  @IsOptional()
  @IsLooseUuid()
  action_assignment_id?: string;
}
