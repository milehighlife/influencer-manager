import { AssignmentStatus } from "@prisma/client";
import { Type } from "class-transformer";
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  Min,
} from "class-validator";
import { IsLooseUuid } from "../../../common/decorators/is-loose-uuid.decorator";

export class CreateActionAssignmentDto {
  @IsLooseUuid()
  action_id!: string;

  @IsLooseUuid()
  influencer_id!: string;

  @IsOptional()
  @IsEnum(AssignmentStatus)
  assignment_status?: AssignmentStatus;

  @IsOptional()
  @IsDateString()
  assigned_at?: string;

  @IsOptional()
  @IsDateString()
  due_date?: string;

  @IsOptional()
  @IsDateString()
  completion_date?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  deliverable_count_expected?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  deliverable_count_submitted?: number;
}
