import { AssignmentStatus } from "@prisma/client";
import { Type } from "class-transformer";
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
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
  @IsString()
  submission_url?: string;

  @IsOptional()
  @IsDateString()
  published_at?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  total_views?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  total_comments?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  total_shares?: number;

  @IsOptional()
  @IsDateString()
  metrics_updated_at?: string;

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
