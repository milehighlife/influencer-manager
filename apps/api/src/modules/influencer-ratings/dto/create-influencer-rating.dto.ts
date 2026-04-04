import { Type } from "class-transformer";
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import { IsLooseUuid } from "../../../common/decorators/is-loose-uuid.decorator";

export class CreateInfluencerRatingDto {
  @IsLooseUuid()
  influencer_id!: string;

  @IsLooseUuid()
  campaign_id!: string;

  @IsOptional()
  @IsLooseUuid()
  action_assignment_id?: string;

  @IsLooseUuid()
  rater_user_id!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  content_quality_score?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  reliability_score?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  audience_fit_score?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  communication_score?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  brand_safety_score?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(5)
  overall_score?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  visual_quality_score?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  visual_quality_note?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  script_quality_score?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  script_quality_note?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  overall_quality_score?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  overall_quality_note?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string;
}
