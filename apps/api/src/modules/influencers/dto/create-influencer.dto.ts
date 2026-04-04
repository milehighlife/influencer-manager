import { InfluencerStatus, SocialPlatform } from "@prisma/client";
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class CreateInfluencerDto {
  @IsString()
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsEnum(SocialPlatform)
  primary_platform!: SocialPlatform;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  location?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  mailing_address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  state?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  zip?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  url_instagram?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  url_tiktok?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  url_facebook?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  url_youtube?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  url_linkedin?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  url_x?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  url_threads?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  audience_description?: string;

  @IsOptional()
  @IsEnum(InfluencerStatus)
  status?: InfluencerStatus;
}
