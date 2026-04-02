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
import { IsLooseUuid } from "../../../common/decorators/is-loose-uuid.decorator";

export class CreateActionDto {
  @IsLooseUuid()
  mission_id!: string;

  @IsString()
  title!: string;

  @IsEnum(SocialPlatform)
  platform!: SocialPlatform;

  @IsOptional()
  @IsString()
  instructions?: string;

  @IsEnum(ContentFormat)
  content_format!: ContentFormat;

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
  @IsDateString()
  start_window?: string;

  @IsOptional()
  @IsDateString()
  end_window?: string;

  @IsOptional()
  @IsEnum(ActionStatus)
  status?: ActionStatus;
}
