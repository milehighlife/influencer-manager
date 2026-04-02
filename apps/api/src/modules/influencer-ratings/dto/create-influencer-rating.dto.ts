import { Type } from "class-transformer";
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";
import { IsLooseUuid } from "../../../common/decorators/is-loose-uuid.decorator";

export class CreateInfluencerRatingDto {
  @IsLooseUuid()
  influencer_id!: string;

  @IsLooseUuid()
  campaign_id!: string;

  @IsLooseUuid()
  rater_user_id!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  content_quality_score!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  reliability_score!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  audience_fit_score!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  communication_score!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  brand_safety_score!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(5)
  overall_score!: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
