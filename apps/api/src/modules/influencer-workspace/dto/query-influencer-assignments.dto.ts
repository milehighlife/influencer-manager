import { IsEnum, IsOptional, IsString } from "class-validator";
import { AssignmentStatus } from "@prisma/client";
import { CREATOR_ASSIGNMENT_SORT_FIELDS } from "@influencer-manager/shared/types/mobile";

import { PaginationQueryDto } from "../../../common/dto/pagination-query.dto";

export class QueryInfluencerAssignmentsDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(AssignmentStatus)
  assignment_status?: AssignmentStatus;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(CREATOR_ASSIGNMENT_SORT_FIELDS)
  sort_by?: (typeof CREATOR_ASSIGNMENT_SORT_FIELDS)[number];
}
