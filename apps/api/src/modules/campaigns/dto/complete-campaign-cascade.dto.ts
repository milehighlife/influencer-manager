import { Type } from "class-transformer";
import { IsInt, Min } from "class-validator";

export class CompleteCampaignCascadeDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  expected_version!: number;
}
