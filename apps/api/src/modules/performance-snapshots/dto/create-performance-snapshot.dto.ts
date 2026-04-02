import { Type } from "class-transformer";
import {
  IsDateString,
  IsInt,
  IsOptional,
  Min,
} from "class-validator";
import { IsLooseUuid } from "../../../common/decorators/is-loose-uuid.decorator";

export class CreatePerformanceSnapshotDto {
  @IsLooseUuid()
  post_id!: string;

  @IsDateString()
  captured_at!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  impressions?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  reach?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  views?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  video_views?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  likes?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  comments?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  shares?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  saves?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  clicks?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  conversions?: number;
}
