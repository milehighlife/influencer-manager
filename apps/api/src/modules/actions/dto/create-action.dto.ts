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
  MaxLength,
} from "class-validator";
import { IsLooseUuid } from "../../../common/decorators/is-loose-uuid.decorator";

export class CreateActionDto {
  @IsLooseUuid()
  mission_id!: string;

  @IsString()
  @MaxLength(255)
  title!: string;

  @IsEnum(SocialPlatform)
  platform!: SocialPlatform;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
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
  @IsString({ each: true })
  required_platforms?: string[];

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
