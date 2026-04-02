import { CampaignStatus } from "@prisma/client";
import { Type } from "class-transformer";
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from "class-validator";

import { TransformEmptyStringToNull } from "../../../common/decorators/transform-empty-string-to-null.decorator";
import { IsLooseUuid } from "../../../common/decorators/is-loose-uuid.decorator";

export class UpdateCampaignDto {
  @IsOptional()
  @IsLooseUuid()
  company_id?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  campaign_type?: string;

  @IsOptional()
  @IsEnum(CampaignStatus)
  status?: CampaignStatus;

  @IsOptional()
  @TransformEmptyStringToNull()
  @IsDateString()
  start_date?: string | null;

  @IsOptional()
  @TransformEmptyStringToNull()
  @IsDateString()
  end_date?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  budget?: number;
}
