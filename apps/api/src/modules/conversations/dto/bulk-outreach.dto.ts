import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
} from "class-validator";
import { ConversationEntityType } from "@prisma/client";

import { IsLooseUuid } from "../../../common/decorators/is-loose-uuid.decorator";

export class BulkOutreachDto {
  @IsOptional()
  @IsLooseUuid()
  template_id?: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  body?: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  influencer_ids!: string[];

  @IsOptional()
  @IsEnum(ConversationEntityType)
  related_entity_type?: ConversationEntityType;

  @IsOptional()
  @IsLooseUuid()
  related_entity_id?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  send_email?: boolean;
}
