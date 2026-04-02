import { SocialPlatform } from "@prisma/client";
import { IsEnum, IsOptional } from "class-validator";

import { IsLooseUuid } from "../../../common/decorators/is-loose-uuid.decorator";
import { PaginationQueryDto } from "../../../common/dto/pagination-query.dto";

export class QueryPostsDto extends PaginationQueryDto {
  @IsOptional()
  @IsLooseUuid()
  deliverable_id?: string;

  @IsOptional()
  @IsLooseUuid()
  action_assignment_id?: string;

  @IsOptional()
  @IsEnum(SocialPlatform)
  platform?: SocialPlatform;
}
