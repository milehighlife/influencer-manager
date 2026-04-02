import { IsDateString, IsOptional } from "class-validator";

import { IsLooseUuid } from "../../../common/decorators/is-loose-uuid.decorator";
import { PaginationQueryDto } from "../../../common/dto/pagination-query.dto";

export class QueryPerformanceSnapshotsDto extends PaginationQueryDto {
  @IsOptional()
  @IsLooseUuid()
  post_id?: string;

  @IsOptional()
  @IsDateString()
  captured_after?: string;

  @IsOptional()
  @IsDateString()
  captured_before?: string;
}
