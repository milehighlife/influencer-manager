import {
  ActionStatus,
  ContentFormat,
  SocialPlatform,
} from "@prisma/client";
import { Type } from "class-transformer";
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
} from "class-validator";

import { TransformEmptyStringToNull } from "../../../common/decorators/transform-empty-string-to-null.decorator";
import { IsLooseUuid } from "../../../common/decorators/is-loose-uuid.decorator";

export class UpdateActionDto {
  @IsOptional()
  @IsLooseUuid()
  mission_id?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsEnum(SocialPlatform)
  platform?: SocialPlatform;

  @IsOptional()
  @IsString()
  instructions?: string;

  @IsOptional()
  @IsEnum(ContentFormat)
  content_format?: ContentFormat;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  required_deliverables?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  approval_required?: boolean;

  @IsOptional()
  @TransformEmptyStringToNull()
  @IsDateString()
  start_window?: string | null;

  @IsOptional()
  @TransformEmptyStringToNull()
  @IsDateString()
  end_window?: string | null;

  @IsOptional()
  @IsEnum(ActionStatus)
  status?: ActionStatus;
}
