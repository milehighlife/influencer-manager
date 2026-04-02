import { PostMediaType, SocialPlatform } from "@prisma/client";
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
} from "class-validator";
import { IsLooseUuid } from "../../../common/decorators/is-loose-uuid.decorator";

export class CreatePostDto {
  @IsLooseUuid()
  deliverable_id!: string;

  @IsEnum(SocialPlatform)
  platform!: SocialPlatform;

  @IsOptional()
  @IsString()
  external_post_id?: string;

  @IsUrl()
  post_url!: string;

  @IsOptional()
  @IsString()
  caption?: string;

  @IsEnum(PostMediaType)
  media_type!: PostMediaType;

  @IsOptional()
  @IsDateString()
  posted_at?: string;
}
