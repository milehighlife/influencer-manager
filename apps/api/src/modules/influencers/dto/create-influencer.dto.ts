import { InfluencerStatus, SocialPlatform } from "@prisma/client";
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
} from "class-validator";

export class CreateInfluencerDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsEnum(SocialPlatform)
  primary_platform!: SocialPlatform;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  audience_description?: string;

  @IsOptional()
  @IsEnum(InfluencerStatus)
  status?: InfluencerStatus;
}
