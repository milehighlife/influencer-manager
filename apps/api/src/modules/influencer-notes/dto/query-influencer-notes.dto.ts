import { IsOptional } from "class-validator";

import { IsLooseUuid } from "../../../common/decorators/is-loose-uuid.decorator";
import { PaginationQueryDto } from "../../../common/dto/pagination-query.dto";

export class QueryInfluencerNotesDto extends PaginationQueryDto {
  @IsOptional()
  @IsLooseUuid()
  influencer_id?: string;

  @IsOptional()
  @IsLooseUuid()
  author_user_id?: string;
}
