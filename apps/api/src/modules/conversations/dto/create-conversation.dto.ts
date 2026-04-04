import { ConversationEntityType } from "@prisma/client";
import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

import { IsLooseUuid } from "../../../common/decorators/is-loose-uuid.decorator";

export class CreateConversationDto {
  @IsString()
  @MaxLength(255)
  subject!: string;

  @IsLooseUuid()
  influencer_id!: string;

  @IsOptional()
  @IsEnum(ConversationEntityType)
  related_entity_type?: ConversationEntityType;

  @IsOptional()
  @IsLooseUuid()
  related_entity_id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  initial_message?: string;
}
