import { ArrayNotEmpty, IsArray, IsString } from "class-validator";

export class InviteInfluencersDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  influencer_ids!: string[];
}
