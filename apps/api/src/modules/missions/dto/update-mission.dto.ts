import { MissionStatus } from "@prisma/client";
import { Type } from "class-transformer";
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
} from "class-validator";

import { TransformEmptyStringToNull } from "../../../common/decorators/transform-empty-string-to-null.decorator";
import { IsLooseUuid } from "../../../common/decorators/is-loose-uuid.decorator";

export class UpdateMissionDto {
  @IsOptional()
  @IsLooseUuid()
  campaign_id?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  sequence_order?: number;

  @IsOptional()
  @IsEnum(MissionStatus)
  status?: MissionStatus;

  @IsOptional()
  @TransformEmptyStringToNull()
  @IsDateString()
  start_date?: string | null;

  @IsOptional()
  @TransformEmptyStringToNull()
  @IsDateString()
  end_date?: string | null;
}
