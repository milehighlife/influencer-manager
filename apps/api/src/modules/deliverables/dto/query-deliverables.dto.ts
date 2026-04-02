import { DeliverableStatus } from "@prisma/client";
import { IsEnum, IsOptional } from "class-validator";

import { IsLooseUuid } from "../../../common/decorators/is-loose-uuid.decorator";
import { PaginationQueryDto } from "../../../common/dto/pagination-query.dto";

export class QueryDeliverablesDto extends PaginationQueryDto {
  @IsOptional()
  @IsLooseUuid()
  action_assignment_id?: string;

  @IsOptional()
  @IsEnum(DeliverableStatus)
  status?: DeliverableStatus;
}
